/* ——————————————————————————————————————————————————
 * CommitCheck — Supabase Client
 *
 * Phase 15: Supabase Auth is the identity source. This client
 * (anon key — safe for the browser) issues the access tokens the
 * backend verifies. Service-role keys NEVER appear in frontend code.
 * —————————————————————————————————————————————————— */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True only when both the project URL and anon key are configured.
 * The auth UI shows an explicit "authentication not configured" state
 * instead of a broken login form when this is false.
 */
export const isAuthConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && /^https?:\/\//.test(supabaseUrl),
)

/** Null until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured. */
export const supabase: SupabaseClient | null = isAuthConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null
