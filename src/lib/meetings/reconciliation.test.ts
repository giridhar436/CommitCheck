import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileMeeting,
  reconcileProjectMeetings,
  isMeetingStale,
  isMeetingActive,
  DEFAULT_STALE_MEETING_THRESHOLD_MS,
  handleRecallWebhook,
} from "./service";
import { InMemoryMeetingRepository } from "./adapter";
import {
  BotStatusResult,
  MeetingBotService,
  MeetingStatus,
  TranscriptSegment,
} from "./types";

class ControllableBotService implements MeetingBotService {
  public dispatchCount = 0;
  public getStatusCount = 0;
  public fetchArtifactCount = 0;
  public shouldThrowInGetStatus = false;
  public mockBotStatusResult: BotStatusResult;
  public mockArtifact: unknown = null;

  constructor(
    initialStatus: BotStatusResult = {
      status: "COMPLETED",
      statusCode: "done",
      transcriptId: "tr_default",
      transcriptStatus: "done",
    }
  ) {
    this.mockBotStatusResult = initialStatus;
  }

  async dispatchBot(): Promise<{ botId: string; status: MeetingStatus }> {
    this.dispatchCount++;
    return { botId: "bot_stub_123", status: "JOINING" };
  }

  async getBotStatus(_botId: string): Promise<BotStatusResult> {
    this.getStatusCount++;
    if (this.shouldThrowInGetStatus) {
      throw new Error("Simulated Recall.ai network timeout (503 Service Unavailable)");
    }
    return this.mockBotStatusResult;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  async fetchTranscriptArtifact(_transcriptId: string): Promise<unknown> {
    this.fetchArtifactCount++;
    return this.mockArtifact;
  }
}

describe("CommitCheck Meeting Reconciliation & Stale Fallback Mechanism", () => {
  let meetingRepo: InMemoryMeetingRepository;
  let botService: ControllableBotService;
  const projectId = "proj_test_123";

  beforeEach(() => {
    meetingRepo = new InMemoryMeetingRepository();
    botService = new ControllableBotService();
  });

  it("isMeetingActive correctly identifies active vs terminal statuses", () => {
    assert.equal(isMeetingActive("SCHEDULED"), true);
    assert.equal(isMeetingActive("JOINING"), true);
    assert.equal(isMeetingActive("RECORDING"), true);
    assert.equal(isMeetingActive("TRANSCRIBING"), true);
    assert.equal(isMeetingActive("COMPLETED"), false);
    assert.equal(isMeetingActive("FAILED"), false);
  });

  it("A. Fresh JOINING meeting does NOT call Recall unnecessarily", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_fresh",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 20_000); // 20s old (< 60s)
    assert.equal(isMeetingStale(meeting, DEFAULT_STALE_MEETING_THRESHOLD_MS, now), false);

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 0);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "JOINING");
  });

  it("B. Stale JOINING meeting + Recall says still active (e.g. RECORDING) updates DB and remains active", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_active",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 75_000); // 75s old (> 60s)
    assert.equal(isMeetingStale(meeting, DEFAULT_STALE_MEETING_THRESHOLD_MS, now), true);

    botService.mockBotStatusResult = {
      status: "RECORDING",
      statusCode: "in_call_recording",
    };

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "RECORDING");

    // Verify DB was updated
    const updated = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(updated?.status, "RECORDING");
    assert.equal(updated?.meetUrl, meeting.meetUrl);
    assert.equal(updated?.recallBotId, "bot_active");
  });

  it("C. Stale JOINING meeting + Recall says done fetches transcript and marks COMPLETED", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_done",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 120_000); // 2 minutes old

    botService.mockBotStatusResult = {
      status: "COMPLETED",
      statusCode: "done",
      transcriptId: "tr_real_456",
      transcriptStatus: "done",
    };

    botService.mockArtifact = [
      {
        participant: { name: "Elena (Client)" },
        words: [
          { text: "Confirming", start_timestamp: { relative: 1.0 }, end_timestamp: { relative: 1.5 } },
          { text: "Stripe", start_timestamp: { relative: 1.5 }, end_timestamp: { relative: 2.0 } },
          { text: "integration.", start_timestamp: { relative: 2.0 }, end_timestamp: { relative: 2.8 } },
        ],
      },
      {
        participant: { name: "Alex (Freelancer)" },
        words: [
          { text: "Got", start_timestamp: { relative: 3.2 }, end_timestamp: { relative: 3.5 } },
          { text: "it.", start_timestamp: { relative: 3.5 }, end_timestamp: { relative: 3.9 } },
        ],
      },
    ];

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(botService.fetchArtifactCount, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "COMPLETED");
    assert.ok(result[0].transcript?.includes("Confirming Stripe integration."));
    assert.ok(result[0].transcript?.includes("Elena (Client)"));
    assert.ok(result[0].transcript?.includes("Alex (Freelancer)"));

    const parsedJson = JSON.parse(result[0].transcriptJson!);
    assert.equal(parsedJson.length, 2);
    assert.equal(parsedJson[0].speaker, "Elena (Client)");
    assert.equal(parsedJson[0].words, "Confirming Stripe integration.");

    // Verify DB persisted
    const dbRecord = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(dbRecord?.status, "COMPLETED");
    assert.equal(dbRecord?.transcript, result[0].transcript);
    assert.equal(dbRecord?.recallBotId, "bot_done");
  });

  it("D1. Stale JOINING meeting + Recall says fatal moves to FAILED", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_fatal",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 90_000);

    botService.mockBotStatusResult = {
      status: "FAILED",
      statusCode: "fatal",
    };

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(result[0].status, "FAILED");

    const dbRecord = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(dbRecord?.status, "FAILED");
  });

  it("D2. Stale JOINING meeting + Recall finished with failed transcript moves to FAILED", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_tx_fail",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 90_000);

    botService.mockBotStatusResult = {
      status: "COMPLETED",
      statusCode: "done",
      transcriptId: "tr_failed_789",
      transcriptStatus: "failed",
    };

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(result[0].status, "FAILED");

    const dbRecord = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(dbRecord?.status, "FAILED");
  });

  it("D3. Stale JOINING meeting + Recall finished without any transcript artifact moves to FAILED", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_no_tx",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 90_000);

    botService.mockBotStatusResult = {
      status: "COMPLETED",
      statusCode: "done",
      // No transcriptId, no segments
    };

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(result[0].status, "FAILED");

    const dbRecord = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(dbRecord?.status, "FAILED");
  });

  it("E. Recall API failure does NOT crash and preserves existing database state", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_err",
      "JOINING"
    );

    const now = new Date(meeting.createdAt.getTime() + 90_000);
    botService.shouldThrowInGetStatus = true;

    // Must not reject
    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "JOINING"); // preserved

    const dbRecord = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(dbRecord?.status, "JOINING");
  });

  it("F. Completed meeting does NOT call Recall reconciliation", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_already_completed",
      "COMPLETED"
    );

    const now = new Date(meeting.createdAt.getTime() + 86400_000); // 1 day old
    assert.equal(isMeetingStale(meeting, DEFAULT_STALE_MEETING_THRESHOLD_MS, now), false);

    const result = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now,
    });

    assert.equal(botService.getStatusCount, 0);
    assert.equal(result.length, 1);
    assert.equal(result[0].status, "COMPLETED");
  });

  it("G. Repeated GET polling within threshold does not repeatedly hit Recall API", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_poll",
      "JOINING"
    );

    // Backdate meeting so it is 70 seconds in the past
    const baseNow = Date.now();
    const pastTime = new Date(baseNow - 70_000);
    meetingRepo.setMeeting({
      ...meeting,
      createdAt: pastTime,
      updatedAt: pastTime,
    });

    botService.mockBotStatusResult = {
      status: "RECORDING",
      statusCode: "in_call_recording",
    };

    // First poll at current time -> triggers reconciliation
    const result1 = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now: new Date(baseNow),
    });
    assert.equal(botService.getStatusCount, 1);
    assert.equal(result1[0].status, "RECORDING");

    // Second poll 2 seconds later (simulating 2-second frontend polling interval)
    const result2 = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now: new Date(baseNow + 2_000),
    });
    assert.equal(botService.getStatusCount, 1); // DID NOT increment!
    assert.equal(result2[0].status, "RECORDING");

    // Third poll 10 seconds later
    const result3 = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now: new Date(baseNow + 10_000),
    });
    assert.equal(botService.getStatusCount, 1); // STILL 1!
    assert.equal(result3[0].status, "RECORDING");

    // Fourth poll after 65 seconds -> now stale again
    const result4 = await reconcileProjectMeetings(projectId, meetingRepo, botService, {
      now: new Date(baseNow + 65_000),
    });
    assert.equal(botService.getStatusCount, 2); // Reconciled again
    assert.equal(result4[0].status, "RECORDING");
  });

  it("H. Project with no meetings returns empty array without calling Recall", async () => {
    const result = await reconcileProjectMeetings("empty_project", meetingRepo, botService);
    assert.deepEqual(result, []);
    assert.equal(botService.getStatusCount, 0);
  });

  it("I. Webhook handling still works normally without regressions", async () => {
    const meeting = await meetingRepo.createMeeting(
      projectId,
      "https://meet.google.com/abc-defg-hij",
      "bot_webhook_test",
      "JOINING"
    );

    const webhookPayload = {
      event: "transcript.done",
      data: {
        bot_id: meeting.recallBotId,
        transcript: [
          {
            speaker: "Alex",
            words: "Webhook test transcript.",
            start_time: 1.0,
            end_time: 3.0,
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
    assert.ok(updated.transcript?.includes("Webhook test transcript."));
  });
});
