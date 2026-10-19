import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dispatchMeetingBot, handleRecallWebhook } from "./service";
import { InMemoryMeetingRepository } from "./adapter";
import { MockMeetingBotService } from "./recall";
import { MeetingBotService, MeetingStatus } from "./types";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";

// Stand-in bot service that returns a canned transcript artifact payload,
// for testing transcript.done artifact notifications without network access
class ArtifactBotService implements MeetingBotService {
  constructor(private artifactContent: unknown) {}
  async dispatchBot(): Promise<{ botId: string; status: MeetingStatus }> {
    return { botId: "stub_bot", status: "JOINING" };
  }
  async getBotStatus(): Promise<{ status: MeetingStatus }> {
    return { status: "COMPLETED" };
  }
  verifyWebhookSignature(): boolean {
    return true;
  }
  async fetchTranscriptArtifact(): Promise<unknown> {
    return this.artifactContent;
  }
}

describe("CommitCheck Google Meet Bot Dispatch & Webhook Ingestion (VAR-9)", () => {
  let userRepo: InMemoryUserRepository;
  let projectRepo: InMemoryProjectRepository;
  let meetingRepo: InMemoryMeetingRepository;
  let botService: MockMeetingBotService;
  let freelancerId: string;
  let projectId: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    projectRepo = new InMemoryProjectRepository();
    meetingRepo = new InMemoryMeetingRepository();
    botService = new MockMeetingBotService();

    // Seed freelancer
    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_55",
        email: "alex@developer.io",
        name: "Alex Dev",
      },
      "FREELANCER"
    );
    freelancerId = freelancer.id;

    // Seed project
    const project = await projectRepo.createProject(freelancerId, {
      title: "Fintech Mobile API",
      clientEmail: "elena@clientcorp.com",
      githubRepoFullName: "alex-dev/fintech-api",
    });
    projectId = project.id;
  });

  it("successfully dispatches a bot to a valid Google Meet room", async () => {
    const meetUrl = "https://meet.google.com/abc-defg-hij";
    const meeting = await dispatchMeetingBot(
      projectId,
      meetUrl,
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    assert.ok(meeting.id);
    assert.equal(meeting.projectId, projectId);
    assert.equal(meeting.meetUrl, meetUrl);
    assert.ok(meeting.recallBotId?.startsWith("mock_bot_"));
    assert.equal(meeting.status, "JOINING");

    // Check retrieved from repo
    const retrieved = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(retrieved?.meetUrl, meetUrl);
  });

  it("rejects dispatch for invalid Google Meet URL format", async () => {
    await assert.rejects(
      async () => {
        await dispatchMeetingBot(
          projectId,
          "https://zoom.us/j/123456789",
          freelancerId,
          userRepo,
          projectRepo,
          meetingRepo,
          botService
        );
      },
      {
        message: "Invalid Google Meet URL. Must match format 'https://meet.google.com/xxx-yyyy-zzz'.",
      }
    );
  });

  it("rejects dispatch from unauthorized user who does not own the project", async () => {
    const otherUser = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_999",
        email: "other@developer.io",
      },
      "FREELANCER"
    );

    await assert.rejects(
      async () => {
        await dispatchMeetingBot(
          projectId,
          "https://meet.google.com/abc-defg-hij",
          otherUser.id,
          userRepo,
          projectRepo,
          meetingRepo,
          botService
        );
      },
      {
        message: "Unauthorized: You do not own this project.",
      }
    );
  });

  it("updates meeting status when status_change webhook is received", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    const webhookPayload = {
      event: "bot.status_change",
      data: {
        bot_id: meeting.recallBotId,
        status: {
          code: "in_call_recording",
        },
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      botService
    );

    assert.ok(updated);
    assert.equal(updated.status, "RECORDING");
  });

  it("persists diarized transcript segments and formatted text when transcript is ready", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    const webhookPayload = {
      event: "transcript.done",
      data: {
        bot_id: meeting.recallBotId,
        transcript: [
          {
            speaker: "Alex (Freelancer)",
            words: "We will build the Stripe webhook handler this week.",
            start_time: 12.5,
            end_time: 16.0,
          },
          {
            speaker: "Elena (Client)",
            words: "Sounds great. Make sure to test failure scenarios.",
            start_time: 17.0,
            end_time: 21.2,
          },
        ],
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      botService
    );

    assert.ok(updated);
    assert.equal(updated.status, "COMPLETED");
    assert.ok(updated.transcript?.includes("Stripe webhook handler"));
    assert.ok(updated.transcript?.includes("Alex (Freelancer)"));
    assert.ok(updated.transcript?.includes("Elena (Client)"));

    const parsedJson = JSON.parse(updated.transcriptJson!);
    assert.equal(parsedJson.length, 2);
    assert.equal(parsedJson[0].speaker, "Alex (Freelancer)");
  });

  it("parses Recall.ai's native diarized transcript format (participant + word list)", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    const webhookPayload = {
      event: "transcript.done",
      data: {
        bot_id: meeting.recallBotId,
        transcript: [
          {
            participant: { name: "Alex (Freelancer)" },
            words: [
              { text: "We", start_timestamp: { relative: 1.0 }, end_timestamp: { relative: 1.3 } },
              { text: "will", start_timestamp: { relative: 1.3 }, end_timestamp: { relative: 1.6 } },
              { text: "build", start_timestamp: { relative: 1.6 }, end_timestamp: { relative: 2.1 } },
            ],
          },
          {
            participant: { name: "Elena (Client)" },
            words: [
              { text: "Sounds", start_timestamp: { relative: 3.0 }, end_timestamp: { relative: 3.4 } },
              { text: "great.", start_timestamp: { relative: 3.4 }, end_timestamp: { relative: 3.8 } },
            ],
          },
        ],
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      botService
    );

    assert.ok(updated);
    assert.equal(updated.status, "COMPLETED");
    assert.ok(updated.transcript?.includes("build"));
    assert.ok(updated.transcript?.includes("Alex (Freelancer)"));
    assert.ok(updated.transcript?.includes("[00:01]"));

    const parsedJson = JSON.parse(updated.transcriptJson!);
    assert.equal(parsedJson.length, 2);
    assert.equal(parsedJson[0].speaker, "Alex (Freelancer)");
    assert.equal(parsedJson[0].words, "We will build");
    assert.equal(parsedJson[0].startTime, 1.0);
    assert.equal(parsedJson[1].endTime, 3.8);
  });

  it("rejects webhook payloads with invalid signatures", async () => {
    const webhookPayload = {
      event: "bot.status_change",
      data: { bot_id: "some_bot_id" },
    };

    await assert.rejects(
      async () => {
        await handleRecallWebhook(
          webhookPayload,
          { "svix-signature": "invalid" },
          JSON.stringify(webhookPayload),
          meetingRepo,
          botService
        );
      },
      {
        message: "Invalid webhook signature from Recall.ai",
      }
    );
  });

  it("handles current Recall.ai bot event payloads (bot.* event, data.data.code, data.bot.id)", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    const webhookPayload = {
      event: "bot.in_call_recording",
      data: {
        data: { code: "in_call_recording", sub_code: null, updated_at: "2026-10-19T23:00:00Z" },
        bot: { id: meeting.recallBotId, metadata: {} },
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      botService
    );

    assert.ok(updated);
    assert.equal(updated.status, "RECORDING");
  });

  it("extracts the bot id from data.bot.id on current Recall.ai payloads", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    // A payload whose ONLY bot reference is data.bot.id must resolve the meeting instead of throwing
    const webhookPayload = {
      event: "bot.joining_call",
      data: {
        data: { code: "joining_call", sub_code: null, updated_at: "2026-10-19T23:00:00Z" },
        bot: { id: meeting.recallBotId, metadata: {} },
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      botService
    );

    assert.ok(updated);
    assert.equal(updated.status, "JOINING");
  });

  it("rejects webhook payloads without any recognizable bot id", async () => {
    const webhookPayload = {
      event: "bot.joining_call",
      data: {
        data: { code: "joining_call", sub_code: null, updated_at: "2026-10-19T23:00:00Z" },
      },
    };

    await assert.rejects(
      async () => {
        await handleRecallWebhook(
          webhookPayload,
          {},
          JSON.stringify(webhookPayload),
          meetingRepo,
          botService
        );
      },
      {
        message: "Missing bot_id in webhook payload",
      }
    );
  });

  it("fetches the transcript artifact for current Recall.ai transcript.done notifications", async () => {
    const meeting = await dispatchMeetingBot(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      freelancerId,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    // The artifact content returned by the presigned download URL (Recall's diarized utterances)
    const artifactBotService = new ArtifactBotService([
      {
        participant: { name: "Alex (Freelancer)" },
        words: [
          { text: "Scope", start_timestamp: { relative: 0 }, end_timestamp: { relative: 0.6 } },
          { text: "confirmed.", start_timestamp: { relative: 0.6 }, end_timestamp: { relative: 1.4 } },
        ],
      },
      {
        participant: { name: "Elena (Client)" },
        words: [
          { text: "Great,", start_timestamp: { relative: 2.0 }, end_timestamp: { relative: 2.4 } },
          { text: "let's", start_timestamp: { relative: 2.4 }, end_timestamp: { relative: 2.8 } },
          { text: "proceed.", start_timestamp: { relative: 2.8 }, end_timestamp: { relative: 3.3 } },
        ],
      },
    ]);

    const webhookPayload = {
      event: "transcript.done",
      data: {
        data: { code: "done", sub_code: null, updated_at: "2026-10-19T23:00:00Z" },
        transcript: { id: "tr_123", metadata: {} },
        recording: { id: "rec_123", metadata: {} },
        bot: { id: meeting.recallBotId, metadata: {} },
      },
    };

    const updated = await handleRecallWebhook(
      webhookPayload,
      {},
      JSON.stringify(webhookPayload),
      meetingRepo,
      artifactBotService
    );

    assert.ok(updated);
    assert.equal(updated.status, "COMPLETED");
    assert.ok(updated.transcript?.includes("Scope confirmed."));
    assert.ok(updated.transcript?.includes("Alex (Freelancer)"));
    assert.ok(updated.transcript?.includes("Elena (Client)"));

    const parsedJson = JSON.parse(updated.transcriptJson!);
    assert.equal(parsedJson.length, 2);
    assert.equal(parsedJson[0].speaker, "Alex (Freelancer)");
    assert.equal(parsedJson[0].words, "Scope confirmed.");
    assert.equal(parsedJson[1].endTime, 3.3);
  });
});
