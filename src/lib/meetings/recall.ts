import { BotStatusResult, MeetingBotService, MeetingStatus, TranscriptSegment } from "./types";
import { Webhook } from "svix";
import { getAppBaseUrl } from "../env";

/**
 * Returns the canonical webhook URL for Recall.ai status updates and transcript notifications.
 * Constructible from the application base URL (e.g. https://commitcheck-ind.vercel.app/api/webhooks/recall).
 */
export function getRecallWebhookUrl(appBaseUrl?: string): string {
  const base = appBaseUrl ? appBaseUrl.replace(/\/+$/, "") : getAppBaseUrl();
  return `${base}/api/webhooks/recall`;
}

export class RecallAiBotService implements MeetingBotService {
  private apiKey: string;
  private baseUrl: string;

  constructor(
    apiKey = process.env.RECALL_AI_API_KEY || "",
    // Regional workspaces (e.g. https://ap-northeast-1.recall.ai) require their own API host
    baseUrl = process.env.RECALL_API_BASE_URL || "https://api.recall.ai"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async dispatchBot(
    meetUrl: string,
    botName = "CommitCheck Notetaker"
  ): Promise<{ botId: string; status: MeetingStatus }> {
    if (!this.apiKey || this.apiKey.startsWith("mock_")) {
      const mockId = `bot_${Math.random().toString(36).substring(2, 10)}`;
      return { botId: mockId, status: "JOINING" };
    }

    const res = await fetch(`${this.baseUrl}/api/v1/bot`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      // Current Create Bot schema: real-time Recall.ai transcription with diarization
      body: JSON.stringify({
        meeting_url: meetUrl,
        bot_name: botName,
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {
                mode: "prioritize_accuracy",
                language_code: "auto",
              },
            },
            diarization: {
              use_separate_streams_when_available: true,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Recall.ai API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      botId: data.id,
      status: "JOINING",
    };
  }

  async getBotStatus(
    botId: string
  ): Promise<BotStatusResult> {
    if (!this.apiKey || this.apiKey.startsWith("mock_")) {
      return {
        status: "COMPLETED",
        statusCode: "done",
        transcriptId: "mock_tr_123",
        transcriptStatus: "done",
        segments: this.getDefaultMockSegments(),
      };
    }

    const res = await fetch(`${this.baseUrl}/api/v1/bot/${botId}`, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Recall.ai status error (${res.status})`);
    }

    const data = await res.json();
    const lastChange = data.status_changes?.[data.status_changes.length - 1];
    const statusCode = lastChange?.code || "in_call_recording";
    let status: MeetingStatus = "RECORDING";
    if (
      statusCode === "joining_call" ||
      statusCode === "in_waiting_room" ||
      statusCode === "in_call_not_recording" ||
      statusCode === "recording_permission_allowed"
    ) {
      status = "JOINING";
    } else if (statusCode === "in_call_recording") {
      status = "RECORDING";
    } else if (statusCode === "call_ended" || statusCode === "recording_done") {
      status = "TRANSCRIBING";
    } else if (statusCode === "done") {
      status = "COMPLETED";
    } else if (
      statusCode === "fatal" ||
      statusCode === "recording_permission_denied" ||
      statusCode === "analysis_failed"
    ) {
      status = "FAILED";
    }

    const transcriptShortcut = data.recordings?.[0]?.media_shortcuts?.transcript;
    const transcriptId = transcriptShortcut?.id;
    const transcriptStatus = transcriptShortcut?.status?.code;

    if (transcriptStatus === "failed") {
      if (status === "TRANSCRIBING" || status === "COMPLETED") {
        status = "FAILED";
      }
    }

    return {
      status,
      statusCode,
      transcriptId,
      transcriptStatus,
      rawBot: data,
    };
  }

  // Fetches the transcript artifact and returns its content (Recall's diarized utterances array).
  // Two steps: artifact metadata (needs API auth), then the presigned download URL (no auth header).
  async fetchTranscriptArtifact(transcriptId: string): Promise<unknown> {
    const artifactRes = await fetch(`${this.baseUrl}/api/v1/transcript/${transcriptId}/`, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    if (!artifactRes.ok) {
      throw new Error(`Recall.ai transcript fetch error (${artifactRes.status})`);
    }

    const artifact = await artifactRes.json();
    const downloadUrl = artifact?.data?.download_url;
    if (!downloadUrl) {
      return artifact;
    }

    const transcriptRes = await fetch(downloadUrl);
    if (!transcriptRes.ok) {
      throw new Error(`Recall.ai transcript download error (${transcriptRes.status})`);
    }

    return transcriptRes.json();
  }

  // Recall.ai signs webhooks with Svix (whsec_... signing secret, svix-id/timestamp/signature headers)
  verifyWebhookSignature(rawBody: string, headers: Record<string, string> | null): boolean {
    const secret = process.env.RECALL_WEBHOOK_SECRET;
    if (!secret) return true; // If no webhook secret configured in dev, accept
    if (!headers) return false;

    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, headers);
      return true;
    } catch {
      return false;
    }
  }

  private getDefaultMockSegments(): TranscriptSegment[] {
    return [
      {
        speaker: "Alex (Freelancer)",
        words: "Thanks for jumping on the discovery call Elena! Today we are locking down the scope for the checkout flow overhaul.",
        startTime: 0,
        endTime: 6.5,
      },
      {
        speaker: "Elena (Client)",
        words: "Great. We need Stripe Elements embedded in the Next.js checkout flow, automated webhook processing for invoice receipts, and unit tests verifying the payment callback.",
        startTime: 7.0,
        endTime: 16.2,
      },
      {
        speaker: "Alex (Freelancer)",
        words: "Understood. That will be three core deliverables: Stripe Elements integration, webhook handler for receipts, and automated payment gateway unit tests.",
        startTime: 17.0,
        endTime: 24.8,
      },
      {
        speaker: "Elena (Client)",
        words: "Exactly right. That covers our agreed scope. Once you approve these on CommitCheck, let us get them into Linear.",
        startTime: 25.1,
        endTime: 31.0,
      },
    ];
  }
}

export class MockMeetingBotService implements MeetingBotService {
  private customSegments: TranscriptSegment[];
  private customStatus: MeetingStatus;
  private customStatusCode?: string;
  private customTranscriptStatus?: string;

  constructor(
    customSegments?: TranscriptSegment[],
    customStatus: MeetingStatus = "COMPLETED"
  ) {
    this.customSegments = customSegments || [
      {
        speaker: "Freelancer (Alex)",
        words: "Welcome Elena! Let us finalize the MVP scope today.",
        startTime: 0,
        endTime: 4.5,
      },
      {
        speaker: "Client (Elena)",
        words: "We agreed on two milestones: First, user authentication with GitHub and Google OAuth. Second, the project management repository binding.",
        startTime: 5.0,
        endTime: 14.0,
      },
      {
        speaker: "Freelancer (Alex)",
        words: "Agreed. I will stage those tasks in Linear once our meeting transcript completes.",
        startTime: 14.5,
        endTime: 19.5,
      },
    ];
    this.customStatus = customStatus;
  }

  setStatus(
    status: MeetingStatus,
    statusCode?: string,
    transcriptStatus?: string
  ) {
    this.customStatus = status;
    if (statusCode !== undefined) this.customStatusCode = statusCode;
    if (transcriptStatus !== undefined) this.customTranscriptStatus = transcriptStatus;
  }

  async dispatchBot(
    _meetUrl: string,
    _botName?: string
  ): Promise<{ botId: string; status: MeetingStatus }> {
    return {
      botId: `mock_bot_${Math.random().toString(36).substring(2, 9)}`,
      status: "JOINING",
    };
  }

  async getBotStatus(
    _botId: string
  ): Promise<BotStatusResult> {
    return {
      status: this.customStatus,
      statusCode:
        this.customStatusCode ||
        (this.customStatus === "COMPLETED"
          ? "done"
          : this.customStatus === "FAILED"
          ? "fatal"
          : "in_call_recording"),
      transcriptId: "mock_tr_default",
      transcriptStatus:
        this.customTranscriptStatus || (this.customStatus === "COMPLETED" ? "done" : undefined),
      segments: this.customSegments,
    };
  }

  verifyWebhookSignature(_rawBody: string, headers: Record<string, string> | null): boolean {
    return !!headers && headers["svix-signature"] !== "invalid";
  }

  async fetchTranscriptArtifact(_transcriptId: string): Promise<unknown> {
    return this.customSegments;
  }
}
