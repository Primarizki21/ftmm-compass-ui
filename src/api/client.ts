import { clearSession, readToken } from "./session"

export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(
  /\/+$/,
  "",
)

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  auth?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
}

interface ErrorEnvelope {
  error?: { message?: string }
  detail?: unknown
  message?: string
}

function messageFrom(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback
  const body = payload as ErrorEnvelope
  if (body.error?.message) return body.error.message
  if (typeof body.detail === "string") return body.detail
  if (body.message) return body.message
  if (body.detail) return JSON.stringify(body.detail)
  return fallback
}

export function authHeaders(): Record<string, string> {
  const token = readToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(
  path: string,
  request: ApiRequest = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(request.auth ? authHeaders() : {}),
    ...request.headers,
  }
  let body: BodyInit | undefined
  if (request.body instanceof FormData) {
    body = request.body
  } else if (request.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(request.body)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: request.method ?? "GET",
    headers,
    body,
    signal: request.signal,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      response.status >= 500
        ? `Layanan sedang bermasalah (${response.status})`
        : messageFrom(payload, `Permintaan gagal (${response.status})`)
    if (response.status === 401 && request.auth) clearSession()
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}
