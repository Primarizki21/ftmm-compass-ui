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
  student_profile?: StudentProfile
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    let response: Response

    try {
      response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok && response.status === 404) {
        response = await fetch("http://127.0.0.1:8001/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        })
      }
    } catch {
      response = await fetch("http://127.0.0.1:8001/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })
    }

    if (!response.ok) {
      let errorMessage =
        "Autentikasi gagal. Silakan periksa kembali kredensial Anda."
      try {
        const errJson = await response.json()
        if (errJson.detail) {
          errorMessage =
            typeof errJson.detail === "string"
              ? errJson.detail
              : JSON.stringify(errJson.detail)
        } else if (errJson.message) {
          errorMessage = errJson.message
        }
      } catch {
        // Fallback ke status text default
        if (response.status === 401) {
          errorMessage = "Identifier atau password salah."
        }
      }
      throw new Error(errorMessage)
    }

    const data: AuthResponse = await response.json()

    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    }

    return data
  },

  getStoredUser(): AuthUser | null {
    if (typeof window === "undefined" || !window.localStorage) return null
    try {
      const rawUser = localStorage.getItem(USER_KEY)
      return rawUser ? JSON.parse(rawUser) as AuthUser : null
    } catch {
      return null
    }
  },

  getStoredToken(): string | null {
    if (typeof window === "undefined" || !window.localStorage) return null
    return localStorage.getItem(TOKEN_KEY)
  },

  logout(): void {
    if (typeof window === "undefined" || !window.localStorage) return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  async getMe(): Promise<AuthUser> {
    const token = this.getStoredToken()
    if (!token) {
      throw new Error("Sesi tidak ditemukan")
    }

    let response: Response
    try {
      response = await fetch("/api/v1/auth/me", {
        headers: {
          ...this.getAuthHeaders(),
          Accept: "application/json",
        },
      })
      if (!response.ok && response.status === 404) {
        response = await fetch("http://127.0.0.1:8001/api/v1/auth/me", {
          headers: {
            ...this.getAuthHeaders(),
            Accept: "application/json",
          },
        })
      }
    } catch {
      response = await fetch("http://127.0.0.1:8001/api/v1/auth/me", {
        headers: {
          ...this.getAuthHeaders(),
          Accept: "application/json",
        },
      })
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.logout()
      }
      throw new Error("Gagal mengambil profil pengguna.")
    }

    const user: AuthUser = await response.json()
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
    return user
  },
}
