import { Logger } from '@nestjs/common';
import { ApprovalStatus, EvidenceSource, RiskLevel } from '@prisma/client';
import {
  MeetingAnalysisInput,
  MeetingAnalysisProvider,
  MeetingAnalysisResult,
} from '../types/analysis-result';

/**
 * Production AI provider — calls the Fireworks chat-completions API
 * (OpenAI-compatible) from the backend only, mapping its response onto the
 * existing DetectedCommitment contract. Never hard-codes or logs credentials.
 */

/** Conservative single-request timeout — analysis is a synchronous request. */
const DEFAULT_TIMEOUT_MS = 30_000;
const FIREWORKS_CHAT_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
/** Title cap mirrors the CreateCommitmentDto MaxLength(200) convention. */
const TITLE_MAX = 200;
const TEXT_MAX = 5000;

/** Kept in one place so the parser and the prompt cannot drift apart. */
const RESPONSE_SCHEMA_DESCRIPTION = `{
  "commitments": [
    {
      "title": "short imperative summary of the promise (max 200 chars)",
      "description": "what was promised, including any deadline mentioned",
      "speaker": "person who made the commitment, or null when unclear",
      "deadline": "deadline exactly as stated, or null when none",
      "confidence": number between 0 and 1 (how sure this is a real commitment),
      "riskLevel": "LOW | MEDIUM | HIGH",
      "quote": "verbatim sentence from the meeting text that evidences the commitment"
    }
  ]
}`;

const SYSTEM_PROMPT = `You are an AI analyst for CommitCheck, reviewing a USER-AUTHORIZED meeting summary or transcript that the account owner explicitly submitted for analysis.

Your task: detect commitments — promises by the delivery team/vendor to do work — and return them as structured JSON.

Rules:
- Identify actual commitments ("We will add X", "I'll have it ready by Friday"), not merely client requests. "Can we add Google Login?" is a request; only the team's "Sure, I'll have it ready by Friday" is a commitment.
- Attribute the speaker of the commitment when the text makes it clear; use null when it does not.
- Extract deadlines exactly as stated; use null when none. Never invent missing information.
- Preserve uncertainty: use a lower confidence for ambiguous statements rather than guessing.
- Evidence quotes must be copied VERBATIM from the supplied meeting text — never paraphrase or fabricate quotes.
- riskLevel: HIGH for work that clearly looks beyond an approved scope (new integrations, rebuilds, out-of-scope features), MEDIUM for concrete additions, LOW for routine or already-agreed work.
- Return ONLY the JSON object matching this schema — no markdown fences, no commentary:

${RESPONSE_SCHEMA_DESCRIPTION}

An empty "commitments" array is a valid answer for a meeting where nothing was promised.`;

export interface FireworksProviderConfig {
  apiKey: string;
  model: string;
  /** Overridable for tests; defaults to a conservative 30s. */
  timeoutMs?: number;
}

export class FireworksMeetingAnalysisProvider implements MeetingAnalysisProvider {
  private readonly logger = new Logger(FireworksMeetingAnalysisProvider.name);
  private readonly timeoutMs: number;

  constructor(private readonly config: FireworksProviderConfig) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async analyzeMeeting(input: MeetingAnalysisInput): Promise<MeetingAnalysisResult> {
    // Re-checked per call so a misconfigured instance fails safely at the
    // seam instead of sending an unauthenticated request.
    if (!this.config.apiKey) {
      throw new Error('Fireworks provider is not configured — FIREWORKS_API_KEY is missing');
    }
    if (input.transcripts.length === 0) {
      throw new Error('Fireworks provider requires at least one transcript attachment');
    }

    const content = await this.complete(this.buildUserMessage(input));
    return this.parseAnalysis(content, input);
  }

  // ——— Fireworks call ———

  private buildUserMessage(input: MeetingAnalysisInput): string {
    const { meeting, transcripts } = input;
    const text = meeting.summary?.trim() || '';
    return [
      `Meeting: "${meeting.title}" (${meeting.meetingDate.toISOString()})`,
      `Transcript attachment(s): ${transcripts.map((t) => t.fileName).join(', ')}`,
      '',
      'Meeting text to analyze:',
      text || '(no meeting text was provided)',
    ].join('\n');
  }

  /** Single chat completion; aborts on timeout, never echoes the API key. */
  private async complete(userMessage: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(FIREWORKS_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Status only — the error body could echo account details.
        throw new Error(`Fireworks API returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        throw new Error('Fireworks response contained no completion content');
      }
      return content;
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new Error(`Fireworks API request timed out after ${this.timeoutMs}ms`);
      }
      throw err instanceof Error
        ? new Error(`Fireworks API request failed: ${err.message}`)
        : new Error('Fireworks API request failed');
    } finally {
      clearTimeout(timer);
    }
  }

  // ——— response validation & mapping ———

  /**
   * Validates the model output before it can reach the database: invalid JSON,
   * a missing/ill-typed required field, or an out-of-range confidence fails
   * the whole provider call (the service then rolls back and marks FAILED).
   * Optional fields fall back to null — uncertainty is preserved, not guessed.
   */
  private parseAnalysis(content: string, input: MeetingAnalysisInput): MeetingAnalysisResult {
    const parsed = this.extractJson(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Fireworks response is not a JSON object');
    }
    const rawCommitments = (parsed as { commitments?: unknown }).commitments;
    if (!Array.isArray(rawCommitments)) {
      throw new Error('Fireworks response has no commitments array');
    }

    const evidenceReference = input.transcripts[0]?.fileName ?? null;
    const commitments = rawCommitments.map((entry) => {
      const title = this.requiredString(entry, 'title', TITLE_MAX);
      const quote = this.requiredString(entry, 'quote', TEXT_MAX);
      const description =
        this.optionalString(entry, 'description') ?? quote;
      const deadline = this.optionalString(entry, 'deadline');
      const speaker = this.optionalString(entry, 'speaker');
      const riskLevel = this.optionalRiskLevel(entry);

      // Confidence is validated (type + range) when present, null otherwise.
      const rawConfidence = (entry as { confidence?: unknown })?.confidence;
      let confidenceScore: number | null = null;
      if (rawConfidence !== undefined && rawConfidence !== null) {
        if (typeof rawConfidence !== 'number' || Number.isNaN(rawConfidence)) {
          throw new Error('Fireworks response has a non-numeric confidence');
        }
        confidenceScore = Math.min(1, Math.max(0, rawConfidence));
      }

      return {
        title,
        // Deadline has no schema field of its own — it is folded into the
        // description rather than inventing database columns for AI output.
        description: (deadline ? `${description} (Deadline: ${deadline})` : description).slice(0, TEXT_MAX),
        speaker,
        confidenceScore,
        riskLevel,
        // The AI never authorizes work — authorization stays with the human workflow.
        authorizationStatus: ApprovalStatus.PENDING,
        evidenceReference,
        evidence: [
          {
            quote,
            timestamp: input.meeting.meetingDate,
            source: EvidenceSource.TRANSCRIPT,
          },
        ],
      };
    });

    this.logger.log(
      `Fireworks (${this.config.model}) detected ${commitments.length} commitment(s)`,
    );
    return { commitments };
  }

  /** Tolerates markdown fences; locates the outermost JSON object. */
  private extractJson(content: string): unknown {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fenced ? fenced[1] : content;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Fireworks response did not contain a JSON object');
    }
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new Error('Fireworks response is not valid JSON');
    }
  }

  private requiredString(entry: unknown, field: string, max: number): string {
    const value = (entry as Record<string, unknown>)?.[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Fireworks response has an invalid ${field}`);
    }
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
  }

  private optionalString(entry: unknown, field: string): string | null {
    const value = (entry as Record<string, unknown>)?.[field];
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') {
      throw new Error(`Fireworks response has a non-string ${field}`);
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private optionalRiskLevel(entry: unknown): RiskLevel | undefined {
    const value = (entry as Record<string, unknown>)?.riskLevel;
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || !(value.toUpperCase() in RiskLevel)) {
      throw new Error('Fireworks response has an invalid riskLevel');
    }
    return value.toUpperCase() as RiskLevel;
  }
}
