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

export const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_API_URL || "/api/v1/chat"
export const BACKEND_STREAM_URL =
  import.meta.env.VITE_BACKEND_STREAM_URL || "/api/v1/chat/stream"

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
