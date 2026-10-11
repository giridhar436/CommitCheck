import { Logger } from '@nestjs/common';
import { ApprovalStatus, EvidenceSource, RiskLevel } from '@prisma/client';
import {
  MeetingAnalysisInput,
  MeetingAnalysisProvider,
  MeetingAnalysisResult,
} from '../types/analysis-result';

/**
 * Deterministic stand-in for a real AI provider — the project has no AI
 * credentials yet, so Phase 8 ships this development implementation only.
 *
 * It runs a rule-based extraction over the meeting's user-provided
 * notes/summary text (the only transcript content stored in the current
 * data model): sentences carrying a promise phrase become commitments and
 * the sentence itself becomes the verbatim evidence quote — no transcript
 * content is ever invented.
 *
 * This class must NEVER be registered in a production deployment; see the
 * provider factory in meeting-analysis.module.ts.
 */

/** Sentence-level promise phrases ("We will…", "I can add…", "agreed to…"). */
const PROMISE_PATTERNS: RegExp[] = [
  /\bwe\s+(?:will|'ll|are\s+going\s+to|'re\s+going\s+to)\b/i,
  /\bI\s+(?:will|'ll|am\s+going\s+to|can\s+add|can\s+build|can\s+create)\b/i,
  /\b(?:we|I|team)\s+(?:can|could)\s+(?:add|build|create|deliver|ship)\b/i,
  /\b(?:commit(?:ted)?|promise[ds]?|agree[d]?)\s+(?:to|that)\b/i,
  /\bsure,?\s+(?:we'?ll|I'?ll)\b/i,
];

/** Explicit commitment verbs raise confidence. */
const EXPLICIT_PROMISE = /\b(?:promis\w+|commit(?:ted)?|agree[d]?)\b/i;

/** A time bound ("by Friday", "next week", "end of Q3") raises confidence. */
const DEADLINE =
  /\b(?:by|before)\s+(?:the\s+end\s+of\s+)?(?:next\s+(?:week|month|quarter)|q[1-4]\b|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})\b/i;

/** Hints of work beyond the approved scope raise the risk level. */
const HIGH_RISK_HINTS =
  /\b(?:while\s+we(?:'re|\s+are)\s+at\s+it|out\s+of\s+(?:the\s+)?scope|not\s+in\s+(?:the\s+)?(?:sow|scope)|unauthorized|rebuild|redesign|migrat\w+|oauth|sso)\b/i;
const MEDIUM_RISK_HINTS =
  /\b(?:add|integrat\w+|build|implement|create|deliver|ship|export|dashboard|login|notification|report|new\s+(?:page|screen|feature|module))\b/i;

/** Speaker attribution: a "Name:" prefix (the last one wins for mixed quotes). */
const SPEAKER_PREFIX = /(?:^|\s|—-)([A-Za-z][A-Za-z .'-]{0,39}?)\s*:\s*/g;
/** Same shape without the capture group, for stripping the prefix from titles. */
const SPEAKER_PREFIX_STRIP = /(?:^|\s|—-)[A-Za-z][A-Za-z .'-]{0,39}?\s*:\s*/;

/** Title cap mirrors the CreateCommitmentDto MaxLength(200) convention. */
const TITLE_MAX = 200;

export class DevelopmentMeetingAnalysisProvider implements MeetingAnalysisProvider {
  private readonly logger = new Logger(DevelopmentMeetingAnalysisProvider.name);

  async analyzeMeeting(input: MeetingAnalysisInput): Promise<MeetingAnalysisResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'The development AI provider must not run in production — configure a production MEETING_ANALYSIS_PROVIDER',
      );
    }

    // Deterministic failure hook for exercising the failure path (e2e tests):
    // a transcript named *.fail.* simulates a provider crash. Dev-only —
    // a production provider never sees this convention.
    const failing = input.transcripts.find((t) => t.fileName.includes('.fail.'));
    if (failing) {
      throw new Error(`Simulated AI provider failure for transcript "${failing.fileName}"`);
    }

    const text = input.meeting.summary?.trim() ?? '';
    if (!text) {
      return { commitments: [] };
    }

    const primary = input.transcripts[0];
    const sentences = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const commitments = [];
    for (const sentence of sentences) {
      const matched = PROMISE_PATTERNS.some((pattern) => pattern.test(sentence));
      if (!matched) continue;

      const speaker = this.extractSpeaker(sentence);
      commitments.push({
        title: this.toTitle(sentence),
        description: sentence.slice(0, 5000),
        speaker,
        confidenceScore: this.confidenceScore(sentence, speaker !== null),
        riskLevel: this.riskLevel(sentence),
        // The AI never authorizes work — authorization stays with the human workflow.
        authorizationStatus: ApprovalStatus.PENDING,
        evidenceReference: primary?.fileName ?? null,
        evidence: [
          {
            quote: sentence.slice(0, 5000),
            timestamp: input.meeting.meetingDate,
            source: EvidenceSource.TRANSCRIPT,
          },
        ],
      });
    }

    this.logger.log(
      `Development provider analyzed meeting "${input.meeting.title}": ${commitments.length} commitment(s) from ${input.transcripts.length} transcript(s)`,
    );
    return { commitments };
  }

  // ——— deterministic extraction helpers ———

  private extractSpeaker(sentence: string): string | null {
    let match: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    SPEAKER_PREFIX.lastIndex = 0;
    while ((match = SPEAKER_PREFIX.exec(sentence)) !== null) last = match;
    return last ? last[1].trim() : null;
  }

  /** 0.5–0.9, higher with explicit verbs, a deadline and speaker attribution. */
  private confidenceScore(sentence: string, hasSpeaker: boolean): number {
    let score = 0.6;
    if (EXPLICIT_PROMISE.test(sentence)) score += 0.15;
    if (DEADLINE.test(sentence)) score += 0.1;
    if (hasSpeaker) score += 0.05;
    return Math.min(0.95, Math.max(0, score));
  }

  private riskLevel(sentence: string): RiskLevel {
    if (HIGH_RISK_HINTS.test(sentence)) return RiskLevel.HIGH;
    if (MEDIUM_RISK_HINTS.test(sentence)) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /** Drops the "Name:" prefix and quotes, collapses whitespace, caps length. */
  private toTitle(sentence: string): string {
    const cleaned = sentence
      .replace(SPEAKER_PREFIX_STRIP, '')
      .replace(/^["'“”]+|["'“”.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const short = cleaned.length > TITLE_MAX ? cleaned.slice(0, TITLE_MAX).trim() : cleaned;
    return short.length > 0 ? short : cleaned || sentence;
  }
}
