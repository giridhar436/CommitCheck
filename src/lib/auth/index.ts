export * from "./types";
export * from "./adapter";
export * from "./session";
export * from "./service";

import { PrismaUserRepository } from "./adapter";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
import { AuthSession } from "./types";
import { cookies } from "next/headers";

export const defaultUserRepository = new PrismaUserRepository();

export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
