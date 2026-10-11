/* ——————————————————————————————————————————————————
 * CommitCheck — API Client
 *
 * Centralized HTTP client with interceptor pipeline,
 * automatic retry, and token management. All service
 * modules go through this so every component talks to
 * the real NestJS backend (base URL: VITE_API_URL).
 * —————————————————————————————————————————————————— */

// ——— Configuration ———

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

// ——— Error ———

export class ApiError extends Error {
  status: number
  body: unknown
  code?: string

  constructor(status: number, message: string, body?: unknown, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.code = code
  }

  /** Convenience check for network / timeout failures */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

// ——— Interceptor Types ———

export interface RequestInterceptor {
  onRequest(url: string, init: RequestInit): RequestInit | Promise<RequestInit>
}

export interface ResponseInterceptor {
  onResponse(response: Response, url: string): void | Promise<void>
  onError?(error: ApiError, url: string): void | Promise<void>
}

// ——— Request Options ———

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  /** Override default retry count (default: 1 for idempotent, 0 for mutating) */
  retries?: number
  /** Abort controller for request cancellation */
  abort?: AbortController
}

// ——— Client ———

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // ——— Token Management ———

  setToken(token: string | null) {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  // ——— Interceptor Registration ———

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(
        (i) => i !== interceptor,
      )
    }
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(
        (i) => i !== interceptor,
      )
    }
  }

  // ——— URL Builder ———

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url.toString()
  }

  // ——— Core Request Pipeline ———

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      body,
      params,
      retries: maxRetries,
      abort,
      headers: customHeaders,
      ...rest
    } = options

    const method = (rest.method ?? 'GET').toUpperCase()
    const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(
      method,
    )
    const retries = maxRetries ?? (isIdempotent ? 1 : 0)

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(customHeaders as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    let config: RequestInit = {
      ...rest,
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal: abort?.signal,
    }

    // Run request interceptors
    const url = this.buildUrl(path, params)
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor.onRequest(url, config)
    }

    // Retry loop
    let lastError: ApiError | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config)

        // Run response interceptors (success path)
        for (const interceptor of this.responseInterceptors) {
          await interceptor.onResponse(response.clone(), url)
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          const apiError = new ApiError(
            response.status,
            (errorBody as { message?: string }).message ??
              `Request failed with status ${response.status}`,
            errorBody,
            (errorBody as { code?: string }).code,
          )

          // Run error interceptors
          for (const interceptor of this.responseInterceptors) {
            if (interceptor.onError) {
              await interceptor.onError(apiError, url)
            }
          }

          throw apiError
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T
        }

        return (await response.json()) as T
      } catch (error) {
        if (error instanceof ApiError) {
          // Don't retry client errors (4xx) except 408 (timeout) and 429 (rate limit)
          if (
            error.status >= 400 &&
            error.status < 500 &&
            error.status !== 408 &&
            error.status !== 429
          ) {
            throw error
          }
          lastError = error
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          throw new ApiError(0, 'Request was cancelled', undefined, 'ABORT')
        } else {
          lastError = new ApiError(
            0,
            error instanceof Error ? error.message : 'Network error',
            undefined,
            'NETWORK_ERROR',
          )
        }

        // Exponential backoff before retry
        if (attempt < retries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw lastError!
  }

  // ——— HTTP Method Shortcuts ———

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

// ——— Singleton ———

export const apiClient = new ApiClient(API_BASE_URL)

export default apiClient
