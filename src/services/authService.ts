import { ApiError, apiFetch, authHeaders } from "../api/client"
import {
  clearSession,
  readToken,
  readUser,
  writeToken,
  writeUser,
} from "../api/session"

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface StudentProfile {
  student_number: string
  study_program: string
  program_code: string
  admission_year: number
  current_semester: number
}

export interface AuthUser {
  user_id: string
  email: string
  full_name: string
  role: string
  auth_provider?: string
  academic_identifier?: string
  unit_name?: string
  phone_number?: string
  bio?: string
  career_interests?: string[]
  permissions?: string[]
  student_profile?: StudentProfile
}

export interface ProfileUpdatePayload {
  phone_number?: string
  bio?: string
  career_interests?: string[]
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: credentials,
    })
    writeToken(data.access_token)
    writeUser(data.user)
    return data
  },

  getStoredUser(): AuthUser | null {
    return readUser<AuthUser>()
  },

  getStoredToken(): string | null {
    return readToken()
  },

  logout(): void {
    clearSession()
  },

  getAuthHeaders(): Record<string, string> {
    return authHeaders()
  },

  async getMe(): Promise<AuthUser> {
    if (!readToken()) throw new ApiError("Sesi tidak ditemukan", 401)
    const user = await apiFetch<AuthUser>("/api/v1/auth/me", { auth: true })
    writeUser(user)
    return user
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
    if (!readToken()) throw new ApiError("Sesi tidak ditemukan", 401)
    const user = await apiFetch<AuthUser>("/api/v1/auth/me/profile", {
      method: "PATCH",
      body: payload,
      auth: true,
    })
    writeUser(user)
    return user
  },
}
