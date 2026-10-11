import { ApprovalStatus, EvidenceSource, RiskLevel } from '@prisma/client';

/**
 * A text attachment selected as analysis input. Phase 5 stores attachment
 * metadata only (no file bodies), so the provider works from these references
 * plus the meeting's own user-provided notes/summary text.
 */
export interface TranscriptSource {
  attachmentId: string;
  fileName: string;
  fileType: string | null;
}

/** Everything the provider is allowed to see about the meeting under analysis. */
export interface MeetingAnalysisInput {
  meeting: {
    id: string;
    title: string;
    summary: string | null;
    meetingDate: Date;
  };
  /** Usable transcript/text attachments (`text/*`), ordered oldest first. */
  transcripts: TranscriptSource[];
}

/** A quote supporting one detected commitment (maps onto CommitmentEvidence). */
export interface DetectedCommitmentEvidence {
  quote: string;
  timestamp: Date | null;
  source: EvidenceSource;
}

/**
 * One AI-detected commitment (maps onto the Phase 6 Commitment schema).
 * Deliberately carries NO projectId/meetingId — the analysis service pins
 * both from the verified route context; the provider cannot move or smuggle
 * a commitment into another meeting/project.
 */
export interface DetectedCommitment {
  title: string;
  description: string;
  speaker: string | null;
  /** AI confidence, clamped to 0–1 by the service before persisting. */
  confidenceScore: number | null;
  riskLevel?: RiskLevel;
  authorizationStatus?: ApprovalStatus;
  evidenceReference: string | null;
  evidence: DetectedCommitmentEvidence[];
}

export interface MeetingAnalysisResult {
  commitments: DetectedCommitment[];
}

/**
 * Seam between the analysis workflow and any AI implementation. The service
 * holds business rules (ownership, transaction, status lifecycle) and never
 * couples to a concrete AI SDK.
 */
export interface MeetingAnalysisProvider {
  analyzeMeeting(input: MeetingAnalysisInput): Promise<MeetingAnalysisResult>;
}
