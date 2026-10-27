import { prisma } from "./prisma";

export type ServiceMode = "live" | "mock" | "missing" | "invalid";
export type ServiceStatus = "ok" | "warning" | "error";

export interface ServiceConfigReport {
  service: string;
  displayName: string;
  required: boolean;
  mode: ServiceMode;
  status: ServiceStatus;
  configured: boolean;
  maskedSummary: string;
  details: string;
}

export interface EnvironmentValidationReport {
  timestamp: string;
  appUrl: string;
  isReadyForProduction: boolean;
  isReadyForTesting: boolean;
  liveServicesCount: number;
  mockServicesCount: number;
  missingServicesCount: number;
  services: Record<string, ServiceConfigReport>;
  summary: string;
}

function maskSecret(val: string | undefined, prefixLen = 4, suffixLen = 4): string {
  if (!val) return "(not set)";
  const trimmed = val.trim();
  if (trimmed.length <= prefixLen + suffixLen) {
    return "***";
  }
  const prefix = trimmed.slice(0, prefixLen);
  const suffix = trimmed.slice(-suffixLen);
  return `${prefix}...${suffix}`;
}

/**
 * Resolves the application's canonical base URL in a production-safe manner.
 *
 * Rules:
 * 1. If NEXT_PUBLIC_APP_URL is explicitly set and non-empty, use it (trimmed of trailing slashes).
 * 2. If a non-empty fallbackOrigin is provided (e.g. from request.nextUrl.origin):
 *    - In production, accept it only if it is NOT a localhost/loopback address. If it is localhost, throw an error.
 *    - In development/testing, accept it.
 * 3. In production:
 *    - Throw an Error if no valid public URL is available, failing fast and preventing broken localhost URLs in OAuth & emails.
 * 4. In development/testing:
 *    - Fall back to http://localhost:3000.
 */
export function getAppBaseUrl(fallbackOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (fallbackOrigin && fallbackOrigin.trim()) {
    const origin = fallbackOrigin.trim().replace(/\/+$/, "");
    const isLocalhost =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("0.0.0.0") ||
      origin.startsWith("http://127.") ||
      origin.startsWith("http://localhost");

    if (isProduction) {
      if (!isLocalhost) {
        return origin;
      }
      throw new Error(
        "Production configuration error: NEXT_PUBLIC_APP_URL is not configured and the fallback origin is localhost. Set NEXT_PUBLIC_APP_URL=https://commit-check.vercel.app in production."
      );
    }
    return origin;
  }

  if (isProduction) {
    throw new Error(
      "Production configuration error: NEXT_PUBLIC_APP_URL is not configured. A valid production application URL (e.g., https://commit-check.vercel.app) is required in production."
    );
  }

  return "http://localhost:3000";
}

export function validateEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): EnvironmentValidationReport {
  const services: Record<string, ServiceConfigReport> = {};

  // 1. Database (PostgreSQL / Supabase via Prisma)
  const dbUrl = env.DATABASE_URL;
  const directUrl = env.DIRECT_URL;
  if (!dbUrl) {
    services.database = {
      service: "database",
      displayName: "Supabase PostgreSQL (Prisma)",
      required: true,
      mode: "missing",
      status: "error",
      configured: false,
      maskedSummary: "(not set)",
      details: "DATABASE_URL is missing. Application database cannot connect.",
    };
  } else if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    services.database = {
      service: "database",
      displayName: "Supabase PostgreSQL (Prisma)",
      required: true,
      mode: "invalid",
      status: "error",
      configured: false,
      maskedSummary: maskSecret(dbUrl, 10, 4),
      details: "DATABASE_URL does not match standard postgresql:// URI format.",
    };
  } else {
    services.database = {
      service: "database",
      displayName: "Supabase PostgreSQL (Prisma)",
      required: true,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: maskSecret(dbUrl, 13, 8),
      details: directUrl
        ? "Configured with pooled DATABASE_URL and direct DIRECT_URL."
        : "Configured with DATABASE_URL (no DIRECT_URL specified).",
    };
  }

  // 2. Authentication & Session Security
  const authSecret = env.AUTH_SECRET;
  const isProduction = (env.NODE_ENV || process.env.NODE_ENV) === "production";
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || (isProduction ? "" : "http://localhost:3000");
  if (!authSecret) {
    services.auth = {
      service: "auth",
      displayName: "Session Authentication (HMAC)",
      required: true,
      mode: "mock",
      status: "warning",
      configured: false,
      maskedSummary: "default-fallback-key",
      details: "AUTH_SECRET not set. Falling back to default development HMAC secret.",
    };
  } else if (authSecret.length < 16) {
    services.auth = {
      service: "auth",
      displayName: "Session Authentication (HMAC)",
      required: true,
      mode: "invalid",
      status: "warning",
      configured: true,
      maskedSummary: maskSecret(authSecret, 3, 3),
      details: "AUTH_SECRET is too short (< 16 chars) for secure production sessions.",
    };
  } else {
    services.auth = {
      service: "auth",
      displayName: "Session Authentication (HMAC)",
      required: true,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: maskSecret(authSecret, 4, 4),
      details: "Configured with secure HMAC secret key.",
    };
  }

  // 3. GitHub OAuth (Freelancer Auth & Repo Binding)
  const ghClientId = env.GITHUB_CLIENT_ID;
  const ghClientSecret = env.GITHUB_CLIENT_SECRET;
  if (!ghClientId || !ghClientSecret) {
    services.github = {
      service: "github",
      displayName: "GitHub OAuth & Repository API",
      required: true,
      mode: "missing",
      status: "warning",
      configured: false,
      maskedSummary: "(not set)",
      details: "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing. Operates in mock mode.",
    };
  } else if (ghClientId.startsWith("mock_") || ghClientSecret.startsWith("mock_")) {
    services.github = {
      service: "github",
      displayName: "GitHub OAuth & Repository API",
      required: true,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: "mock_client_id",
      details: "Configured with mock GitHub OAuth credentials.",
    };
  } else {
    services.github = {
      service: "github",
      displayName: "GitHub OAuth & Repository API",
      required: true,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: `${maskSecret(ghClientId, 4, 4)} / ${maskSecret(ghClientSecret, 4, 4)}`,
      details: "Configured with live GitHub OAuth application credentials.",
    };
  }

  // 4. Google OAuth (Client Auth)
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!googleClientId || !googleClientSecret) {
    services.google = {
      service: "google",
      displayName: "Google OAuth (Client Sign-In)",
      required: true,
      mode: "missing",
      status: "warning",
      configured: false,
      maskedSummary: "(not set)",
      details: "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. Operates in mock mode.",
    };
  } else if (googleClientId.startsWith("mock_") || googleClientSecret.startsWith("mock_")) {
    services.google = {
      service: "google",
      displayName: "Google OAuth (Client Sign-In)",
      required: true,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: "mock_google_id",
      details: "Configured with mock Google OAuth credentials.",
    };
  } else {
    services.google = {
      service: "google",
      displayName: "Google OAuth (Client Sign-In)",
      required: true,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: `${maskSecret(googleClientId, 6, 6)} / ${maskSecret(googleClientSecret, 4, 4)}`,
      details: "Configured with live Google OAuth credentials.",
    };
  }

  // 5. Linear OAuth & Workspace Sync
  const linearClientId = env.LINEAR_CLIENT_ID;
  const linearClientSecret = env.LINEAR_CLIENT_SECRET;
  if (!linearClientId || !linearClientSecret) {
    services.linear = {
      service: "linear",
      displayName: "Linear OAuth & Workspace API",
      required: false,
      mode: "mock",
      status: "ok",
      configured: false,
      maskedSummary: "(mock fallback enabled)",
      details: "LINEAR_CLIENT_ID / SECRET not set. Operates in deterministic mock mode.",
    };
  } else if (linearClientId.startsWith("mock_") || linearClientSecret.startsWith("mock_")) {
    services.linear = {
      service: "linear",
      displayName: "Linear OAuth & Workspace API",
      required: false,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: "mock_linear_id",
      details: "Configured with mock Linear OAuth credentials.",
    };
  } else {
    services.linear = {
      service: "linear",
      displayName: "Linear OAuth & Workspace API",
      required: false,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: `${maskSecret(linearClientId, 4, 4)} / ${maskSecret(linearClientSecret, 4, 4)}`,
      details: "Configured with live Linear OAuth application credentials.",
    };
  }

  // 6. Recall.ai Meeting Bot Infrastructure
  const recallApiKey = env.RECALL_AI_API_KEY;
  const recallWebhookSecret = env.RECALL_WEBHOOK_SECRET;
  const recallRegion = env.RECALL_REGION || "ap-northeast-1";
  const recallBaseUrl = env.RECALL_API_BASE_URL || "https://api.recall.ai";
  if (!recallApiKey) {
    services.recall = {
      service: "recall",
      displayName: "Recall.ai Meeting Bot Infrastructure",
      required: false,
      mode: "mock",
      status: "ok",
      configured: false,
      maskedSummary: "(mock fallback enabled)",
      details: "RECALL_AI_API_KEY missing. Operates in mock bot dispatch mode.",
    };
  } else if (recallApiKey.startsWith("mock_")) {
    services.recall = {
      service: "recall",
      displayName: "Recall.ai Meeting Bot Infrastructure",
      required: false,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: "mock_recall_key",
      details: "Configured with mock Recall.ai API credentials.",
    };
  } else {
    const hasValidSvixSecret = recallWebhookSecret && recallWebhookSecret.startsWith("whsec_");
    services.recall = {
      service: "recall",
      displayName: "Recall.ai Meeting Bot Infrastructure",
      required: false,
      mode: "live",
      status: hasValidSvixSecret ? "ok" : "warning",
      configured: true,
      maskedSummary: `${maskSecret(recallApiKey, 6, 6)} (${recallRegion})`,
      details: hasValidSvixSecret
        ? `Configured for region ${recallRegion} (${recallBaseUrl}) with valid Svix webhook verification.`
        : `Configured for region ${recallRegion} (${recallBaseUrl}). RECALL_WEBHOOK_SECRET missing or non-whsec format.`,
    };
  }

  // 7. Google Gemini AI Engine
  const geminiApiKey = env.GEMINI_API_KEY;
  const geminiModel = env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!geminiApiKey) {
    services.gemini = {
      service: "gemini",
      displayName: "Google Gemini AI Engine",
      required: false,
      mode: "mock",
      status: "ok",
      configured: false,
      maskedSummary: `(mock fallback enabled / ${geminiModel})`,
      details: "GEMINI_API_KEY not set. Scope classification and diff audit run via deterministic mock analyzer.",
    };
  } else if (geminiApiKey.startsWith("mock_")) {
    services.gemini = {
      service: "gemini",
      displayName: "Google Gemini AI Engine",
      required: false,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: `mock_gemini_key (${geminiModel})`,
      details: "Configured with mock Gemini API key.",
    };
  } else {
    services.gemini = {
      service: "gemini",
      displayName: "Google Gemini AI Engine",
      required: false,
      mode: "live",
      status: "ok",
      configured: true,
      maskedSummary: `${maskSecret(geminiApiKey, 6, 4)} (${geminiModel})`,
      details: `Configured with live Gemini API key for model ${geminiModel}.`,
    };
  }

  // 8. Resend Transactional Email
  const resendApiKey = env.RESEND_API_KEY;
  const resendFromEmail = env.RESEND_FROM_EMAIL || "";
  if (!resendApiKey) {
    services.resend = {
      service: "resend",
      displayName: "Resend Stakeholder Email Service",
      required: false,
      mode: "mock",
      status: "ok",
      configured: false,
      maskedSummary: `(mock fallback enabled${resendFromEmail ? ` / from: ${resendFromEmail}` : ""})`,
      details: "RESEND_API_KEY not set. Operates in mock delivery mode with in-memory sent tracking.",
    };
  } else if (resendApiKey.startsWith("mock_")) {
    services.resend = {
      service: "resend",
      displayName: "Resend Stakeholder Email Service",
      required: false,
      mode: "mock",
      status: "ok",
      configured: true,
      maskedSummary: `mock_resend_key${resendFromEmail ? ` (${resendFromEmail})` : ""}`,
      details: "Configured with mock Resend API key.",
    };
  } else {
    const isSandboxSender = resendFromEmail.includes("resend.dev");
    const hasSender = Boolean(resendFromEmail);
    services.resend = {
      service: "resend",
      displayName: "Resend Stakeholder Email Service",
      required: false,
      mode: "live",
      status: hasSender && !isSandboxSender ? "ok" : "warning",
      configured: true,
      maskedSummary: `${maskSecret(resendApiKey, 4, 4)}${resendFromEmail ? ` (${resendFromEmail})` : " (no from email)"}`,
      details: !hasSender
        ? "RESEND_API_KEY set, but RESEND_FROM_EMAIL is missing. Configure a verified sender domain in RESEND_FROM_EMAIL."
        : isSandboxSender
        ? `Configured with live Resend API key, but using sandbox sender (${resendFromEmail}). External client deliveries will fail (403). Set a verified domain address in RESEND_FROM_EMAIL.`
        : `Configured with live Resend API key dispatching from ${resendFromEmail}.`,
    };
  }

  const reports = Object.values(services);
  const liveServicesCount = reports.filter((r) => r.mode === "live").length;
  const mockServicesCount = reports.filter((r) => r.mode === "mock").length;
  const missingServicesCount = reports.filter((r) => r.mode === "missing" || r.mode === "invalid").length;

  const isReadyForTesting = services.database.status !== "error";
  const isReadyForProduction =
    services.database.mode === "live" &&
    services.auth.mode === "live" &&
    services.github.mode === "live" &&
    services.google.mode === "live" &&
    missingServicesCount === 0;

  const summary = `CommitCheck Environment Validation: ${liveServicesCount} live, ${mockServicesCount} mock, ${missingServicesCount} missing. Ready for test suite: ${isReadyForTesting ? "YES" : "NO"}. Ready for full production: ${isReadyForProduction ? "YES" : "PARTIAL (mocks enabled for optional integrations)"}.`;

  return {
    timestamp: new Date().toISOString(),
    appUrl,
    isReadyForProduction,
    isReadyForTesting,
    liveServicesCount,
    mockServicesCount,
    missingServicesCount,
    services,
    summary,
  };
}

export async function performLiveDatabaseCheck(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as CC_PING`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err.message || "Failed to execute database ping query",
    };
  }
}
