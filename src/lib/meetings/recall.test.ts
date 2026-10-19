import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { Webhook } from "svix";
import { RecallAiBotService } from "./recall";

let fetchedUrls: string[] = [];
let fetchedRequests: { url: string; method?: string; headers?: Record<string, string>; body?: string }[] = [];

function mockFetchSequence(responses: { ok: boolean; status?: number; body: unknown }[]) {
  return mock.method(globalThis, "fetch", (async (input: string | URL | Request, init?: RequestInit) => {
    const response = responses[fetchedRequests.length];
    fetchedUrls.push(String(input));
    fetchedRequests.push({
      url: String(input),
      method: init?.method,
      headers: (init?.headers || undefined) as Record<string, string> | undefined,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return {
      ok: response.ok,
      status: response.status ?? 200,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    };
  }) as unknown as typeof fetch);
}

describe("RecallAiBotService regional base URL (VAR-16)", () => {
  let envBackup: string | undefined;

  afterEach(() => {
    mock.restoreAll();
    fetchedUrls = [];
    fetchedRequests = [];
    if (envBackup === undefined) {
      delete process.env.RECALL_API_BASE_URL;
    } else {
      process.env.RECALL_API_BASE_URL = envBackup;
    }
  });

  it("defaults to https://api.recall.ai for bot creation and status polling", async () => {
    envBackup = process.env.RECALL_API_BASE_URL;
    delete process.env.RECALL_API_BASE_URL;

    const fetchMock = mockFetchSequence([
      { ok: true, body: { id: "bot_123" } },
      { ok: true, body: { id: "bot_123" } },
    ]);
    const service = new RecallAiBotService("test_api_key");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij");
    await service.getBotStatus("bot_123");

    assert.equal(fetchedUrls.length, 2);
    assert.equal(fetchedUrls[0], "https://api.recall.ai/api/v1/bot");
    assert.equal(fetchedUrls[1], "https://api.recall.ai/api/v1/bot/bot_123");
    fetchMock.mock.restore();
  });

  it("uses RECALL_API_BASE_URL from the environment when no constructor arg is given", async () => {
    envBackup = process.env.RECALL_API_BASE_URL;
    process.env.RECALL_API_BASE_URL = "https://ap-northeast-1.recall.ai";

    const fetchMock = mockFetchSequence([
      { ok: true, body: { id: "bot_456" } },
      { ok: true, body: { id: "bot_456" } },
    ]);
    const service = new RecallAiBotService("test_api_key");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij");
    await service.getBotStatus("bot_456");

    assert.equal(fetchedUrls[0], "https://ap-northeast-1.recall.ai/api/v1/bot");
    assert.equal(fetchedUrls[1], "https://ap-northeast-1.recall.ai/api/v1/bot/bot_456");
    fetchMock.mock.restore();
  });

  it("prefers the explicit constructor base URL and trims trailing slashes", async () => {
    envBackup = process.env.RECALL_API_BASE_URL;
    process.env.RECALL_API_BASE_URL = "https://from-env.recall.ai";

    const fetchMock = mockFetchSequence([{ ok: true, body: { id: "bot_789" } }]);
    const service = new RecallAiBotService("test_api_key", "https://ap-northeast-1.recall.ai/");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij");

    assert.equal(fetchedUrls[0], "https://ap-northeast-1.recall.ai/api/v1/bot");
    fetchMock.mock.restore();
  });
});

describe("RecallAiBotService bot creation request body (VAR-16)", () => {
  afterEach(() => {
    mock.restoreAll();
    fetchedUrls = [];
    fetchedRequests = [];
  });

  it("creates bots with the current recording_config.transcript schema", async () => {
    const fetchMock = mockFetchSequence([{ ok: true, body: { id: "bot_body" } }]);
    const service = new RecallAiBotService("test_api_key");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij");

    assert.equal(fetchedRequests.length, 1);
    const req = fetchedRequests[0];
    assert.equal(req.method, "POST");
    assert.deepEqual(JSON.parse(req.body!), {
      meeting_url: "https://meet.google.com/abc-defg-hij",
      bot_name: "CommitCheck Notetaker",
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
    });
    // Auth header must be present; never print its value
    assert.match(req.headers?.Authorization || "", /^Token .+/);
    fetchMock.mock.restore();
  });

  it("does not send the legacy transcription_options field", async () => {
    const fetchMock = mockFetchSequence([{ ok: true, body: { id: "bot_body2" } }]);
    const service = new RecallAiBotService("test_api_key");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij", "Custom Bot Name");

    const body = JSON.parse(fetchedRequests[0].body!);
    assert.equal(body.transcription_options, undefined);
    assert.equal(body.bot_name, "Custom Bot Name");
    fetchMock.mock.restore();
  });
});

describe("RecallAiBotService webhook signature verification (VAR-16)", () => {
  let secretBackup: string | undefined;

  afterEach(() => {
    mock.restoreAll();
    fetchedUrls = [];
    fetchedRequests = [];
    if (secretBackup === undefined) {
      delete process.env.RECALL_WEBHOOK_SECRET;
    } else {
      process.env.RECALL_WEBHOOK_SECRET = secretBackup;
    }
  });

  it("verifies signatures over webhook-id/webhook-timestamp/webhook-signature headers", () => {
    secretBackup = process.env.RECALL_WEBHOOK_SECRET;
    process.env.RECALL_WEBHOOK_SECRET = "whsec_" + Buffer.from("c".repeat(48)).toString("base64");

    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET);
    const payload = JSON.stringify({
      event: "bot.joining_call",
      data: { data: { code: "joining_call" }, bot: { id: "bot_1", metadata: {} } },
    });
    const headers = {
      "webhook-id": "msg_test_1",
      "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      "webhook-signature": wh.sign("msg_test_1", new Date(), payload),
    };

    const service = new RecallAiBotService("test_api_key");
    assert.equal(service.verifyWebhookSignature(payload, headers), true);

    // Tampered signature must be rejected
    assert.equal(
      service.verifyWebhookSignature(payload, { ...headers, "webhook-signature": "v1,deadbeef" }),
      false
    );
  });

  it("still verifies legacy svix-id/svix-timestamp/svix-signature headers", () => {
    secretBackup = process.env.RECALL_WEBHOOK_SECRET;
    process.env.RECALL_WEBHOOK_SECRET = "whsec_" + Buffer.from("d".repeat(48)).toString("base64");

    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET);
    const payload = JSON.stringify({ event: "bot.status_change", data: { bot_id: "bot_1" } });
    const headers = {
      "svix-id": "msg_test_2",
      "svix-timestamp": String(Math.floor(Date.now() / 1000)),
      "svix-signature": wh.sign("msg_test_2", new Date(), payload),
    };

    const service = new RecallAiBotService("test_api_key");
    assert.equal(service.verifyWebhookSignature(payload, headers), true);
  });
});

describe("RecallAiBotService transcript artifact fetching (VAR-16)", () => {
  afterEach(() => {
    mock.restoreAll();
    fetchedUrls = [];
    fetchedRequests = [];
  });

  it("fetches the artifact metadata then its presigned download URL (no auth header)", async () => {
    const utterances = [
      {
        participant: { name: "Alex (Freelancer)" },
        words: [
          { text: "Hi", start_timestamp: { relative: 0 }, end_timestamp: { relative: 0.4 } },
        ],
      },
    ];
    const fetchMock = mockFetchSequence([
      {
        ok: true,
        body: {
          id: "tr_1",
          status: { code: "done" },
          data: { download_url: "https://dl.recall.example/transcript.json" },
        },
      },
      { ok: true, body: utterances },
    ]);

    const service = new RecallAiBotService("test_api_key", "https://ap-northeast-1.recall.ai");
    const result = await service.fetchTranscriptArtifact("tr_1");

    assert.deepEqual(result, utterances);
    assert.equal(fetchedUrls[0], "https://ap-northeast-1.recall.ai/api/v1/transcript/tr_1/");
    assert.equal(fetchedUrls[1], "https://dl.recall.example/transcript.json");
    fetchMock.mock.restore();
  });

  it("returns the raw artifact when no download_url is present yet", async () => {
    const artifact = { id: "tr_2", status: { code: "processing" }, data: { download_url: null } };
    const fetchMock = mockFetchSequence([{ ok: true, body: artifact }]);

    const service = new RecallAiBotService("test_api_key");
    const result = await service.fetchTranscriptArtifact("tr_2");

    assert.deepEqual(result, artifact);
    assert.equal(fetchedUrls.length, 1);
    fetchMock.mock.restore();
  });

  it("throws on artifact fetch failure", async () => {
    const fetchMock = mockFetchSequence([{ ok: false, status: 404, body: { detail: "not found" } }]);

    const service = new RecallAiBotService("test_api_key");
    await assert.rejects(
      async () => service.fetchTranscriptArtifact("tr_missing"),
      { message: "Recall.ai transcript fetch error (404)" }
    );
    fetchMock.mock.restore();
  });
});
