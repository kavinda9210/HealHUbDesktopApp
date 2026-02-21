type ApiSuccess<T> = { success: true } & T
type ApiFailure = { success: false; message?: string; error?: unknown }

export type ApiResult<T> = ApiSuccess<T> | ApiFailure

function getBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '')
  return 'http://127.0.0.1:5000'
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export type UnauthorizedHandler = (info: { message: string; status: number; payload: unknown }) => void

let unauthorizedHandler: UnauthorizedHandler | null = null
let lastUnauthorizedAt = 0

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options?: {
    token?: string | null
    body?: unknown
    query?: Record<string, string | number | boolean | undefined>
    timeoutMs?: number
  },
): Promise<T> {
  const baseUrl = getBaseUrl()

  const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`)
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (options?.token) headers.Authorization = `Bearer ${options.token}`
  if (options?.body !== undefined) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? 20000
  let timeoutId: number | null = null

  let res: Response
  try {
    const fetchPromise = fetch(url.toString(), {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        try {
          controller.abort()
        } catch {
          // ignore
        }
        reject(new ApiError('Request timed out', 0, null))
      }, timeoutMs)
    })

    res = await Promise.race([fetchPromise, timeoutPromise])
  } catch (e) {
    if (e instanceof ApiError) throw e
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    throw new ApiError(isAbort ? 'Request timed out' : 'Network error', 0, e)
  } finally {
    if (timeoutId != null) window.clearTimeout(timeoutId)
  }

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as any).message === 'string')
        ? (payload as any).message
        : `Request failed (${res.status})`

    if (res.status === 401 && options?.token && unauthorizedHandler) {
      const now = Date.now()
      if (now - lastUnauthorizedAt > 1000) {
        lastUnauthorizedAt = now
        try {
          unauthorizedHandler({ message, status: res.status, payload })
        } catch {
          // Never let handler failures break request error reporting.
        }
      }
    }
    throw new ApiError(message, res.status, payload)
  }

  return payload as T
}

export const api = {
  get<T>(path: string, opts?: Parameters<typeof request<T>>[2]) {
    return request<T>('GET', path, opts)
  },
  post<T>(path: string, body?: unknown, opts?: Omit<Parameters<typeof request<T>>[2], 'body'>) {
    return request<T>('POST', path, { ...opts, body })
  },
  put<T>(path: string, body?: unknown, opts?: Omit<Parameters<typeof request<T>>[2], 'body'>) {
    return request<T>('PUT', path, { ...opts, body })
  },
  del<T>(path: string, opts?: Parameters<typeof request<T>>[2]) {
    return request<T>('DELETE', path, opts)
  },
}
