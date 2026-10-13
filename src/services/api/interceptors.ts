/* ——————————————————————————————————————————————————
 * CommitCheck — API Interceptors
 *
 * Plug-and-play interceptors registered on the
 * singleton apiClient during app bootstrap.
 *
 * Phase 15: token injection moved into the Supabase session
 * plumbing (useAuth → apiClient.setToken); the previous
 * localStorage token interceptor is gone — a stale demo token
 * from an old build must never overwrite the live Bearer header.
 * —————————————————————————————————————————————————— */

import { toast } from 'sonner'
import { apiClient, ApiError } from './client'
import type { ResponseInterceptor } from './client'

// ——— Error Interceptor ———
// Global error handler: toasts + auth redirect on 401.

const errorInterceptor: ResponseInterceptor = {
  onResponse() {
    /* noop on success */
  },

  onError(error: ApiError, _url: string) {
    if (error.isUnauthorized) {
      // Session state itself is cleared by the Supabase auth plumbing in
      // useAuth; here we only surface the expiry and hard-navigate out of
      // the shell for direct visits (RequireAuth handles SPA redirects).
      // Avoid redirect loop if already on login page
      if (!window.location.pathname.startsWith('/login')) {
        toast.error('Session expired. Please sign in again.')
        window.location.href = '/login'
      }
      return
    }

    if (error.isForbidden) {
      toast.error('You do not have permission to perform this action.')
      return
    }

    if (error.isNotFound) {
      // Typically handled by calling code; silent at global level
      return
    }

    if (error.isServerError) {
      toast.error('Something went wrong on our end. Please try again later.')
      return
    }

    if (error.isNetworkError) {
      toast.error('Network error — please check your connection.')
      return
    }
  },
}

// ——— Logging Interceptor (dev only) ———
// Logs request/response in development for debugging.

const loggingRequestInterceptor = {
  onRequest(url, init) {
    if (import.meta.env.DEV) {
      console.groupCollapsed(
        `%c→ ${init.method ?? 'GET'} ${url}`,
        'color: #6366f1; font-weight: bold',
      )
      if (init.body) {
        try {
          console.log('Body:', JSON.parse(init.body as string))
        } catch {
          console.log('Body:', init.body)
        }
      }
      console.groupEnd()
    }
    return init
  },
} as import('./client').RequestInterceptor

const loggingResponseInterceptor: ResponseInterceptor = {
  onResponse(response, url) {
    if (import.meta.env.DEV) {
      const color = response.ok ? '#22c55e' : '#ef4444'
      console.log(
        `%c← ${response.status} ${url}`,
        `color: ${color}; font-weight: bold`,
      )
    }
  },

  onError(error: ApiError, url: string) {
    if (import.meta.env.DEV) {
      console.error(`✗ API Error [${error.status}] ${url}:`, error.message)
    }
  },
}

// ——— Bootstrap ———
// Call once during app initialization (e.g., in main.tsx).

let initialized = false

export function setupInterceptors(): void {
  if (initialized) return
  initialized = true

  apiClient.addResponseInterceptor(errorInterceptor)

  // Logging interceptors in development only
  if (import.meta.env.DEV) {
    apiClient.addRequestInterceptor(loggingRequestInterceptor)
    apiClient.addResponseInterceptor(loggingResponseInterceptor)
  }

  // One-time cleanup of localStorage keys written by the pre-Phase-15 demo
  // auth — they are never read again, and stale values must not linger.
  localStorage.removeItem('commitcheck-token')
  localStorage.removeItem('commitcheck-user')
}
