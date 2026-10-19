import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dispatchMeetingBot, handleRecallWebhook } from "./service";
import { InMemoryMeetingRepository } from "./adapter";
import { MockMeetingBotService } from "./recall";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";

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
});
