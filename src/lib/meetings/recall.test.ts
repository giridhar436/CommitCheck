import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { RecallAiBotService } from "./recall";

let fetchedUrls: string[] = [];

function mockFetch(response: { ok: boolean; status?: number; body: unknown }) {
  return mock.method(globalThis, "fetch", (async (input: string | URL | Request) => {
    fetchedUrls.push(String(input));
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
    if (envBackup === undefined) {
      delete process.env.RECALL_API_BASE_URL;
    } else {
      process.env.RECALL_API_BASE_URL = envBackup;
    }
  });

  it("defaults to https://api.recall.ai for bot creation and status polling", async () => {
    envBackup = process.env.RECALL_API_BASE_URL;
    delete process.env.RECALL_API_BASE_URL;

    const fetchMock = mockFetch({ ok: true, body: { id: "bot_123" } });
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

    const fetchMock = mockFetch({ ok: true, body: { id: "bot_456" } });
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

    const fetchMock = mockFetch({ ok: true, body: { id: "bot_789" } });
    const service = new RecallAiBotService("test_api_key", "https://ap-northeast-1.recall.ai/");

    await service.dispatchBot("https://meet.google.com/abc-defg-hij");

    assert.equal(fetchedUrls[0], "https://ap-northeast-1.recall.ai/api/v1/bot");
    fetchMock.mock.restore();
  });
});
