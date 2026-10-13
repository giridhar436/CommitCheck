/* ——————————————————————————————————————————————————
 * CommitCheck — Auth Service
 *
 * Phase 15: real Supabase Auth. Sign-in/sign-up/password reset run
 * against Supabase (the identity source); GET /auth/me re-validates the
 * access token against the backend before any app data is fetched.
 * The previous in-memory demo user is gone — no mock remains here.
 * —————————————————————————————————————————————————— */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@/types'
import { supabase, isAuthConfigured } from './supabase'
import { apiClient } from './api/client'

/** Thrown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super(
      'Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.',
    )
    this.name = 'AuthNotConfiguredError'
  }
}

interface SupabaseAuthUser {
  id: string
  email?: string
  created_at?: string
  user_metadata?: Record<string, unknown>
}

/** Maps a Supabase user to the app's User shape. Global role is cosmetic —
 * real authorization roles are per-project (see Project.myRole). */
function toAppUser(u: SupabaseAuthUser): User {
  const name =
    (typeof u.user_metadata?.name === 'string' && u.user_metadata.name) ||
    u.email?.split('@')[0] ||
    'User'
  return {
    id: u.id,
    email: u.email ?? '',
    name,
    organization:
      typeof u.user_metadata?.organization === 'string'
        ? u.user_metadata.organization
        : undefined,
    role: 'member',
    createdAt: u.created_at ?? new Date().toISOString(),
  }
}

function assertConfigured(): SupabaseClient {
  if (!supabase) throw new AuthNotConfiguredError()
  return supabase
}

export const authService = {
  isConfigured: isAuthConfigured,

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const client = assertConfigured()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    if (!data.session || !data.user) {
      throw new Error('Sign-in did not return a session. Please try again.')
    }
    return { user: toAppUser(data.user), token: data.session.access_token }
  },

  async register(
    name: string,
    email: string,
    password: string,
    organization?: string,
  ): Promise<{ user: User; token: string }> {
    const client = assertConfigured()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name, ...(organization ? { organization } : {}) } },
    })
    if (error) throw new Error(error.message)
    // Email-confirmation projects return no session — the caller shows the
    // "check your inbox" flow instead of a session.
    if (!data.session || !data.user) {
      throw new Error(
        'Account created — check your inbox to confirm your email before signing in.',
      )
    }
    return { user: toAppUser(data.user), token: data.session.access_token }
  },

  async forgotPassword(email: string): Promise<void> {
    const client = assertConfigured()
    const { error } = await client.auth.resetPasswordForEmail(email)
    if (error) throw new Error(error.message)
  },

  /**
   * Restores the session (page reload) and verifies the access token is
   * accepted by the backend (GET /auth/me) before returning the profile.
   * Throws on any 401 — stale/revoked tokens must not enter the app shell.
   */
  async getProfile(): Promise<User> {
    const client = assertConfigured()
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Not authenticated')
    }
    const user = toAppUser(data.user)
    await apiClient.get<{ success: true; data: { id: string } }>('/auth/me')
    return user
  },

  /** Returns the current access token for the API client, if a session exists. */
  async getAccessToken(): Promise<string | null> {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return typeof token === 'string' ? token : null
  },

  async logout(): Promise<void> {
    if (!supabase) return
    await supabase.auth.signOut()
  },
}
