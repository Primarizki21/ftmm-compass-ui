const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage
}

export function readToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null
}

export function readUser<T>(): T | null {
  const raw = storage()?.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeToken(token: string): void {
  storage()?.setItem(TOKEN_KEY, token)
}

export function writeUser(user: unknown): void {
  storage()?.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  const store = storage()
  store?.removeItem(TOKEN_KEY)
  store?.removeItem(USER_KEY)
}
