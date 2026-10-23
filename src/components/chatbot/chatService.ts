export interface StudentProfileState {
  program_studi?: string | null
  semester_saat_ini?: number | null
  riwayat_matkul_lulus?: string[]
  minat_fokus?: string[]
  target_kelulusan_semester?: number
  maks_sks_per_semester?: number
  is_confirmed_by_user?: boolean
}

export interface DegreePlanCourseItem {
  id?: string
  code?: string
  name: string
  credits?: number
  semester?: number
  type?: string
  parity?: string
  status?: string
}

export interface DegreePlanPayload {
  action: "APPLY_DEGREE_PLAN"
  summary: {
    program_studi: string
    current_semester: number
    target_semester: number
    total_credits: number
    focus_tracks: string[]
    note?: string
  }
  plan: Record<number, DegreePlanCourseItem[]>
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  plan_payload?: DegreePlanPayload | null
  action_type?: string
  applied?: boolean
  routing_mode?: string
  latency_ms?: number
}

function resolveBackendApiUrl(rawApiUrl?: string): string {
  const trimmed = (rawApiUrl || "").trim()
  if (!trimmed) return "/api/v1/chat"
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed)
      if (url.pathname === "" || url.pathname === "/") {
        return `${url.origin}/api/v1/chat`
      }
    } catch {}
  }
  return trimmed
}

function resolveBackendStreamUrl(
  rawStreamUrl?: string,
  apiUrl: string = BACKEND_API_URL,
): string {
  const trimmedStream = (rawStreamUrl || "").trim()
  if (trimmedStream) return trimmedStream

  const trimmedApi = apiUrl.trim()
  if (trimmedApi.startsWith("http://") || trimmedApi.startsWith("https://")) {
    try {
      const url = new URL(trimmedApi)
      if (url.pathname.endsWith("/api/v1/chat")) {
        const basePath = url.pathname.slice(0, -"/api/v1/chat".length)
        return `${url.origin}${basePath}/api/v1/chat/stream`
      }
      if (url.pathname.endsWith("/api/chat")) {
        const basePath = url.pathname.slice(0, -"/api/chat".length)
        return `${url.origin}${basePath}/api/chat/stream`
      }
      if (url.pathname.endsWith("/chat")) {
        const basePath = url.pathname.slice(0, -"/chat".length)
        return `${url.origin}${basePath}/chat/stream`
      }
      const cleanPath = url.pathname.replace(/\/+$/, "")
      return `${url.origin}${cleanPath}/api/v1/chat/stream`
    } catch {}
  }

  return "/api/v1/chat/stream"
}

export function resolveBackendHealthUrl(
  apiUrl: string = BACKEND_API_URL,
): string {
  const trimmed = apiUrl.trim()
  if (!trimmed || trimmed === "/api/v1/chat" || trimmed === "/api/chat") {
    return "/api/v1/health"
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed)
      if (url.pathname.endsWith("/api/v1/chat")) {
        const basePath = url.pathname.slice(0, -"/api/v1/chat".length)
        return `${url.origin}${basePath}/api/v1/health`
      }
      if (url.pathname.endsWith("/api/chat")) {
        const basePath = url.pathname.slice(0, -"/api/chat".length)
        return `${url.origin}${basePath}/api/v1/health`
      }
      if (url.pathname.endsWith("/chat")) {
        const basePath = url.pathname.slice(0, -"/chat".length)
        return `${url.origin}${basePath}/api/v1/health`
      }
      const cleanPath = url.pathname.replace(/\/+$/, "")
      return `${url.origin}${cleanPath}/api/v1/health`
    }
  } catch {}

  return "/api/v1/health"
}

export function resolveBackendLegacyHealthUrl(
  apiUrl: string = BACKEND_API_URL,
): string {
  const trimmed = apiUrl.trim()
  if (!trimmed || trimmed === "/api/v1/chat" || trimmed === "/api/chat") {
    return "/api/health"
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed)
      if (url.pathname.endsWith("/api/v1/chat")) {
        const basePath = url.pathname.slice(0, -"/api/v1/chat".length)
        return `${url.origin}${basePath}/api/health`
      }
      if (url.pathname.endsWith("/api/chat")) {
        const basePath = url.pathname.slice(0, -"/api/chat".length)
        return `${url.origin}${basePath}/api/health`
      }
      if (url.pathname.endsWith("/chat")) {
        const basePath = url.pathname.slice(0, -"/chat".length)
        return `${url.origin}${basePath}/health`
      }
      const cleanPath = url.pathname.replace(/\/+$/, "")
      return `${url.origin}${cleanPath}/api/health`
    }
  } catch {}

  return "/api/health"
}

export const BACKEND_API_URL = resolveBackendApiUrl(
  import.meta.env.VITE_BACKEND_API_URL,
)
export const BACKEND_STREAM_URL = resolveBackendStreamUrl(
  import.meta.env.VITE_BACKEND_STREAM_URL,
  BACKEND_API_URL,
)
export const BACKEND_HEALTH_URL = resolveBackendHealthUrl(BACKEND_API_URL)
export const BACKEND_LEGACY_HEALTH_URL =
  resolveBackendLegacyHealthUrl(BACKEND_API_URL)

export function sanitizeErrorMessage(raw?: string | null): string {
  if (!raw) return ""
  if (raw.includes("{") && raw.includes("}")) {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          error?: { message?: string }
          detail?: string
          message?: string
        }
        if (parsed.error?.message) return parsed.error.message
        if (parsed.message) return parsed.message
        if (parsed.detail) return parsed.detail
      }
    } catch {}
  }
  return raw
}

export const QUICK_PROMPTS = [
  "Saya mahasiswa TSD semester 5, tolong buatkan rencana studi lulus semester 7 dengan fokus AI.",
  "Rekomendasi matkul pilihan untuk peminatan Rekayasa Data di TSD.",
  "Bagaimana syarat kelulusan dan aturan batas SKS di FTMM?",
] as const

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "init-1",
    role: "assistant",
    content:
      "Halo! Saya **Compass AI**, asisten akademik pintar di FTMM Universitas Airlangga. 🧭\n\nSaya dapat membantu Anda menyusun **Rencana Studi (Study Planner)** yang dipersonalisasi sesuai minat karir dan aturan prasyarat kurikulum FTMM.\n\nAda yang bisa saya bantu hari ini?",
  },
]

export const INITIAL_STUDENT_PROFILE: StudentProfileState = {
  program_studi: null,
  semester_saat_ini: null,
  riwayat_matkul_lulus: [],
  minat_fokus: [],
  target_kelulusan_semester: 8,
  maks_sks_per_semester: 24,
  is_confirmed_by_user: false,
}
