import { AuthSession } from "./types";

export const SESSION_COOKIE_NAME = "commitcheck_session";
const DEFAULT_SECRET = process.env.AUTH_SECRET || "default_commitcheck_dev_auth_secret_key_2026";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/_/g, "/")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  session: Omit<AuthSession, "expiresAt">,
  ttlMs = SEVEN_DAYS_MS,
  secret = DEFAULT_SECRET
): Promise<string> {
  const fullSession: AuthSession = {
    ...session,
    expiresAt: Date.now() + ttlMs,
  };

  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(fullSession);
  const payloadBytes = enc.encode(payloadStr);
  const payloadB64 = base64UrlEncode(payloadBytes);

  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(payloadB64)
  );

  const sigB64 = base64UrlEncode(sigBuffer);
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(
  token: string | null | undefined,
  secret = DEFAULT_SECRET
): Promise<AuthSession | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKey(secret);
    const enc = new TextEncoder();
    const sigBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as BufferSource,
      enc.encode(payloadB64)
    );

    if (!isValid) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const raw = new TextDecoder().decode(payloadBytes);
    const session: AuthSession = JSON.parse(raw);

    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
