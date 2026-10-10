/* ——————————————————————————————————————————————————
 * CommitCheck — API Interceptors
 *
 * Plug-and-play interceptors registered on the
 * singleton apiClient during app bootstrap.
 * —————————————————————————————————————————————————— */

import { toast } from 'sonner'
import { apiClient, ApiError } from './client'
import type { RequestInterceptor, ResponseInterceptor } from './client'

// ——— Auth Interceptor ———
// Automatically attaches the stored JWT from localStorage.

const TOKEN_KEY = 'commitcheck-token'

const authInterceptor: RequestInterceptor = {
  onRequest(_url, init) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && init.headers) {
      ;(init.headers as Record<string, string>)['Authorization'] =
        `Bearer ${token}`
    }
    return init
  },
}

// ——— Error Interceptor ———
// Global error handler: toasts + auth redirect on 401.

const errorInterceptor: ResponseInterceptor = {
  onResponse() {
    /* noop on success */
  },

  onError(error: ApiError, _url: string) {
    if (error.isUnauthorized) {
      // Clear stale auth state and redirect to login
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('commitcheck-user')

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

const loggingRequestInterceptor: RequestInterceptor = {
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
}

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

  apiClient.addRequestInterceptor(authInterceptor)
  apiClient.addResponseInterceptor(errorInterceptor)

  // Logging interceptors in development only
  if (import.meta.env.DEV) {
    apiClient.addRequestInterceptor(loggingRequestInterceptor)
    apiClient.addResponseInterceptor(loggingResponseInterceptor)
  }
}
