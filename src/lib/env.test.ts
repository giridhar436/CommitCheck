import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment, getAppBaseUrl } from "./env";
import { getRecallWebhookUrl } from "./meetings/recall";
import { getGitHubCallbackUrl, getGoogleCallbackUrl, getLinearCallbackUrl } from "./auth/service";

describe("CommitCheck Environment Validation & Diagnostics (VAR-21)", () => {
  it("correctly identifies fully configured live services without leaking secrets", () => {
    const mockEnv: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres.user:supersecretpass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
      DIRECT_URL: "postgresql://postgres.user:supersecretpass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
      AUTH_SECRET: "my-ultra-secure-hmac-production-key-2026",
      NEXT_PUBLIC_APP_URL: "https://commitcheck.dev",
      GITHUB_CLIENT_ID: "gh_client_id_live_12345",
      GITHUB_CLIENT_SECRET: "gh_secret_super_secret_live_67890",
      GOOGLE_CLIENT_ID: "google_client_id_live_12345.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "google_secret_live_67890",
      LINEAR_CLIENT_ID: "linear_client_id_live_12345",
      LINEAR_CLIENT_SECRET: "linear_secret_live_67890",
      RECALL_AI_API_KEY: "recall_api_key_live_1234567890",
      RECALL_WEBHOOK_SECRET: "whsec_" + Buffer.from("v".repeat(48)).toString("base64"),
      RECALL_REGION: "ap-northeast-1",
      RECALL_API_BASE_URL: "https://ap-northeast-1.recall.ai",
      GEMINI_API_KEY: "AIzaSyLiveGeminiKey123456789",
      GEMINI_MODEL: "gemini-3.8-flash",
      RESEND_API_KEY: "re_LiveResendKey123456789",
      RESEND_FROM_EMAIL: "notifications@commitcheck.dev",
    };

    const report = validateEnvironment(mockEnv);

    assert.equal(report.isReadyForProduction, true);
    assert.equal(report.isReadyForTesting, true);
    assert.equal(report.liveServicesCount, 8);
    assert.equal(report.mockServicesCount, 0);
    assert.equal(report.missingServicesCount, 0);

    // Verify secret masking - never leak secrets
    assert.ok(!report.services.database.maskedSummary.includes("supersecretpass"));
    assert.ok(!report.services.auth.maskedSummary.includes("my-ultra-secure-hmac-production-key-2026"));
    assert.ok(!report.services.github.maskedSummary.includes("gh_secret_super_secret_live_67890"));
    assert.ok(!report.services.gemini.maskedSummary.includes("AIzaSyLiveGeminiKey123456789"));
    assert.ok(!report.services.resend.maskedSummary.includes("re_LiveResendKey123456789"));
  });

  it("handles missing DATABASE_URL with critical error status", () => {
    const report = validateEnvironment({
      AUTH_SECRET: "a-valid-secure-key-12345",
    });

    assert.equal(report.services.database.status, "error");
    assert.equal(report.services.database.mode, "missing");
    assert.equal(report.isReadyForTesting, false);
    assert.equal(report.isReadyForProduction, false);
  });

  it("identifies invalid DATABASE_URL scheme", () => {
    const report = validateEnvironment({
      DATABASE_URL: "mysql://root:password@localhost:3306/db",
    });

    assert.equal(report.services.database.status, "error");
    assert.equal(report.services.database.mode, "invalid");
    assert.ok(report.services.database.details.includes("postgresql://"));
  });

  it("warns when AUTH_SECRET is too short (< 16 characters)", () => {
    const report = validateEnvironment({
      DATABASE_URL: "postgresql://localhost:5432/db",
      AUTH_SECRET: "short",
    });

    assert.equal(report.services.auth.status, "warning");
    assert.equal(report.services.auth.mode, "invalid");
    assert.ok(report.services.auth.details.includes("< 16 chars"));
  });

  it("recognizes mock fallback mode for optional external integrations", () => {
    const report = validateEnvironment({
      DATABASE_URL: "postgresql://localhost:5432/db",
      AUTH_SECRET: "valid-secure-session-auth-key-2026",
      GITHUB_CLIENT_ID: "mock_github_id",
      GITHUB_CLIENT_SECRET: "mock_github_secret",
      GOOGLE_CLIENT_ID: "mock_google_id",
      GOOGLE_CLIENT_SECRET: "mock_google_secret",
      // LINEAR, RECALL, GEMINI, RESEND intentionally omitted to test mock fallbacks
    });

    assert.equal(report.isReadyForTesting, true);
    assert.equal(report.services.linear.mode, "mock");
    assert.equal(report.services.recall.mode, "mock");
    assert.equal(report.services.gemini.mode, "mock");
    assert.equal(report.services.resend.mode, "mock");
    assert.equal(report.mockServicesCount, 6); // github, google, linear, recall, gemini, resend
  });

  it("flags missing Svix format on RECALL_WEBHOOK_SECRET for live Recall configuration", () => {
    const report = validateEnvironment({
      DATABASE_URL: "postgresql://localhost:5432/db",
      AUTH_SECRET: "valid-secure-session-auth-key-2026",
      RECALL_AI_API_KEY: "recall_api_key_12345",
      RECALL_WEBHOOK_SECRET: "plain_non_svix_secret",
    });

    assert.equal(report.services.recall.mode, "live");
    assert.equal(report.services.recall.status, "warning");
    assert.ok(report.services.recall.details.includes("whsec"));
  });
});

describe("Production Base URL & URL Constructors", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("resolves to NEXT_PUBLIC_APP_URL when configured and trims trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commitcheck-ind.vercel.app/";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    assert.equal(getAppBaseUrl(), "https://commitcheck-ind.vercel.app");
  });

  it("constructs production Recall webhook URL from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commitcheck-ind.vercel.app";
    assert.equal(getRecallWebhookUrl(), "https://commitcheck-ind.vercel.app/api/webhooks/recall");
  });

  it("constructs production OAuth callback URLs from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commitcheck-ind.vercel.app";
    assert.equal(getGitHubCallbackUrl(), "https://commitcheck-ind.vercel.app/api/auth/github");
    assert.equal(getGoogleCallbackUrl(), "https://commitcheck-ind.vercel.app/api/auth/google");
    assert.equal(getLinearCallbackUrl(), "https://commitcheck-ind.vercel.app/api/auth/linear/callback");
  });

  it("throws clear error in production if NEXT_PUBLIC_APP_URL is missing and origin is localhost", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    assert.throws(
      () => getAppBaseUrl("http://localhost:3000"),
      /Production configuration error/
    );
  });

  it("throws clear error in production if NEXT_PUBLIC_APP_URL is missing and no origin given", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    assert.throws(
      () => getAppBaseUrl(),
      /Production configuration error/
    );
  });

  it("falls back to localhost:3000 in development/test when unconfigured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    assert.equal(getAppBaseUrl(), "http://localhost:3000");
  });
});
