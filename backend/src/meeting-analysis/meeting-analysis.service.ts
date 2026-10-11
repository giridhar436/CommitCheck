import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  ApprovalStatus,
  MeetingAnalysisStatus,
  RiskLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingAnalysisResponseDto } from './dto/analysis-response.dto';
import { MeetingAnalysisProvider, TranscriptSource } from './types/analysis-result';
import { COMMITMENT_CONTEXT_INCLUDE } from '../commitments/commitments.service';
import { CommitmentsMapper } from '../commitments/commitments.mapper';
import { MEETING_ANALYSIS_PROVIDER } from './providers/meeting-analysis-provider';

/**
 * Phase 8 — AI meeting analysis workflow:
 *   meeting → transcript attachments → AI provider → detected commitments
 *   → evidence → COMPLETED (or FAILED).
 *
 * Core business rule: the pipeline never leaves orphans. Commitments,
 * evidence, activity entries and the meeting's final status are written in
 * ONE transaction; any failure rolls the whole result back and marks the
 * meeting FAILED. Existing (manually created) commitments and evidence are
 * never touched — analysis is purely additive. Re-analysis of a COMPLETED
 * meeting is not supported (409), so results cannot silently duplicate.
 */
@Injectable()
export class MeetingAnalysisService {
  private readonly logger = new Logger(MeetingAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Interface type — resolved through the MEETING_ANALYSIS_PROVIDER token.
    @Inject(MEETING_ANALYSIS_PROVIDER)
    private readonly provider: MeetingAnalysisProvider,
  ) {}

  /** Manual analysis trigger. Synchronous: the response reflects the final state. */
  async analyzeMeeting(projectId: string, meetingId: string): Promise<MeetingAnalysisResponseDto> {
    await this.assertProjectExists(projectId);

    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, projectId },
      include: { attachments: { orderBy: { uploadedAt: 'asc' } } },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }

    // Status guard: PROCESSING cannot be restarted; COMPLETED is final in this
    // phase (re-analysis is not implemented — a second pass would duplicate
    // commitments). FAILED meetings may be re-analyzed once the cause (e.g. a
    // missing/broken transcript attachment) is fixed.
    if (meeting.analysisStatus === MeetingAnalysisStatus.PROCESSING) {
      throw new ConflictException('Meeting analysis is already in progress');
    }
    if (meeting.analysisStatus === MeetingAnalysisStatus.COMPLETED) {
      throw new ConflictException('Meeting analysis is already completed');
    }

    // Only transcript/text attachments are analyzable in this phase — binary
    // audio/video has no processing infrastructure yet.
    const transcripts: TranscriptSource[] = meeting.attachments
      .filter((a) => a.fileType?.toLowerCase().startsWith('text/'))
      .map((a) => ({ attachmentId: a.id, fileName: a.fileName, fileType: a.fileType }));
    if (transcripts.length === 0) {
      // Precondition failure — nothing was processed, so the meeting keeps
      // its NOT_STARTED status (FAILED is reserved for real analysis failures).
      throw new UnprocessableEntityException(
        'Meeting has no usable transcript attachment — attach a text/* transcript or notes file before analysis',
      );
    }

    // Atomic claim: only NOT_STARTED/FAILED → PROCESSING. The conditional
    // update makes concurrent triggers impossible even when two requests
    // pass the pre-read simultaneously.
    const claim = await this.prisma.meeting.updateMany({
      where: {
        id: meetingId,
        analysisStatus: { in: [MeetingAnalysisStatus.NOT_STARTED, MeetingAnalysisStatus.FAILED] },
      },
      data: { analysisStatus: MeetingAnalysisStatus.PROCESSING },
    });
    if (claim.count === 0) {
      throw new ConflictException('Meeting analysis is already in progress');
    }

    try {
      const result = await this.provider.analyzeMeeting({
        meeting: {
          id: meeting.id,
          title: meeting.title,
          summary: meeting.summary,
          meetingDate: meeting.meetingDate,
        },
        transcripts,
      });

      const persisted = await this.prisma.$transaction(async (tx) => {
        const created = [];
        let evidenceCount = 0;

        for (const detected of result.commitments) {
          // projectId/meetingId come from the verified route context — never
          // from the provider result; evidence rows nest under the created
          // commitment in the same INSERT chain, so no IDs are hardcoded.
          const commitment = await tx.commitment.create({
            data: {
              projectId,
              meetingId,
              title: detected.title,
              description: detected.description,
              speaker: detected.speaker,
              riskLevel: detected.riskLevel ?? RiskLevel.LOW,
              authorizationStatus: detected.authorizationStatus ?? ApprovalStatus.PENDING,
              confidenceScore:
                detected.confidenceScore === null
                  ? null
                  : Math.min(1, Math.max(0, detected.confidenceScore)),
              evidenceReference: detected.evidenceReference,
              ...(detected.evidence.length > 0 && {
                evidence: {
                  create: detected.evidence.map((e) => ({
                    quote: e.quote,
                    timestamp: e.timestamp,
                    source: e.source,
                  })),
                },
              }),
            },
            include: COMMITMENT_CONTEXT_INCLUDE,
          });

          await tx.activity.create({
            data: {
              projectId,
              action: ActivityAction.COMMITMENT_CREATED,
              entityType: ActivityEntityType.COMMITMENT,
              entityId: commitment.id,
              description: `Commitment "${commitment.title}" recorded for meeting "${meeting.title}"`,
            },
          });

          evidenceCount += detected.evidence.length;
          created.push(commitment);
        }

        await tx.meeting.update({
          where: { id: meetingId },
          data: { analysisStatus: MeetingAnalysisStatus.COMPLETED },
        });

        // Reuses the seeded MEETING_ANALYZED convention (no new enum values).
        await tx.activity.create({
          data: {
            projectId,
            action: ActivityAction.MEETING_ANALYZED,
            entityType: ActivityEntityType.MEETING,
            entityId: meetingId,
            description: `AI analysis completed for "${meeting.title}" — ${created.length} commitments detected`,
          },
        });

        return { commitments: created, evidenceCount };
      });

      return {
        projectId,
        meetingId,
        analysisStatus: MeetingAnalysisStatus.COMPLETED,
        commitmentsCreated: persisted.commitments.length,
        evidenceCreated: persisted.evidenceCount,
        commitments: persisted.commitments.map((commitment) =>
          CommitmentsMapper.toListDto(commitment),
        ),
      };
    } catch (err) {
      // The transaction rolled back — mark the failure so the UI/status is
      // consistent. Marking is best-effort: a meeting deleted mid-analysis
      // must not mask the original error.
      try {
        await this.prisma.meeting.update({
          where: { id: meetingId },
          data: { analysisStatus: MeetingAnalysisStatus.FAILED },
        });
      } catch (markErr) {
        this.logger.warn(
          `Could not mark meeting ${meetingId} as FAILED: ${markErr instanceof Error ? markErr.message : markErr}`,
        );
      }
      this.logger.error(
        `Meeting analysis failed for meeting ${meetingId}: ${err instanceof Error ? err.stack : String(err)}`,
      );
      // No internals (provider errors, stack traces, credentials) leak out.
      throw new BadGatewayException('AI analysis failed — no commitments or evidence were saved');
    }
  }

  // ——— guards ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }
}
