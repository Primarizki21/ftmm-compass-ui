import { authService } from "./authService"

export interface PollingPeriod {
  period_id: string
  academic_year: string
  term: "ganjil" | "genap"
  target_semester_type: "ganjil" | "genap"
  start_date: string
  end_date: string
  is_active: boolean
  min_quorum: number
  max_votes_per_student: number
  description?: string
}

export interface StudentVote {
  vote_id: string
  course_id: string
  course_code?: string
  course_name?: string
  priority: 1 | 2 | 3
  created_at: string
}

export interface SubmitVotePayload {
  course_id: string
  priority: 1 | 2 | 3
}

export interface CourseDemandItem {
  course_id: string
  course_code: string
  course_name: string
  study_program: string
  program_code?: string
  credits: number
  total_votes: number
  priority_1_votes: number
  priority_2_votes: number
  priority_3_votes: number
  min_quorum: number
  status: "QUALIFIED" | "BORDERLINE" | "UNQUALIFIED"
  projected_classes: number
}

export interface DemandAnalyticsResponse {
  period: PollingPeriod
  total_students_voted: number
  items: CourseDemandItem[]
}

const STORAGE_KEY_VOTES = "ftmm_prekrs_my_votes"

// Fallback period data
const DEFAULT_ACTIVE_PERIOD: PollingPeriod = {
  period_id: "poll-2024-genap-01",
  academic_year: "2024/2025",
  term: "genap",
  target_semester_type: "genap",
  start_date: "2026-03-01T00:00:00Z",
  end_date: "2026-03-31T23:59:59Z",
  is_active: true,
  min_quorum: 15,
  max_votes_per_student: 3,
  description:
    "Pra-KRS Peminatan Mata Kuliah Pilihan Semester Genap 2024/2025 FTMM UNAIR",
}

// Fallback mock demand analytics
const MOCK_DEMAND_ANALYTICS: CourseDemandItem[] = [
  {
    course_id: "SIC304",
    course_code: "SIC304",
    course_name: "Natural Language Processing",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 42,
    priority_1_votes: 24,
    priority_2_votes: 11,
    priority_3_votes: 7,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 2,
  },
  {
    course_id: "SID307",
    course_code: "SID307",
    course_name: "Teknologi Big Data",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 35,
    priority_1_votes: 20,
    priority_2_votes: 9,
    priority_3_votes: 6,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 2,
  },
  {
    course_id: "RKK304",
    course_code: "RKK304",
    course_name: "Deep Learning",
    study_program: "Teknik Robotika dan Kecerdasan Buatan",
    program_code: "TRKB",
    credits: 3,
    total_votes: 28,
    priority_1_votes: 16,
    priority_2_votes: 7,
    priority_3_votes: 5,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "MAS317",
    course_code: "MAS317",
    course_name: "Analisis Data Spasial",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 18,
    priority_1_votes: 10,
    priority_2_votes: 5,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "RKS305",
    course_code: "RKS305",
    course_name: "Autonomous Vehicle",
    study_program: "Teknik Robotika dan Kecerdasan Buatan",
    program_code: "TRKB",
    credits: 3,
    total_votes: 16,
    priority_1_votes: 9,
    priority_2_votes: 4,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TEL302",
    course_code: "TEL302",
    course_name: "Elektronika Daya",
    study_program: "Teknik Elektro",
    program_code: "TE",
    credits: 3,
    total_votes: 14,
    priority_1_votes: 6,
    priority_2_votes: 5,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "BORDERLINE",
    projected_classes: 1,
  },
  {
    course_id: "RNT201",
    course_code: "RNT201",
    course_name: "Nanoteknologi Pertanian dan Pemrosesan Makanan",
    study_program: "Rekayasa Nanoteknologi",
    program_code: "RN",
    credits: 2,
    total_votes: 12,
    priority_1_votes: 5,
    priority_2_votes: 4,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "BORDERLINE",
    projected_classes: 1,
  },
  {
    course_id: "MNU215",
    course_code: "MNU215",
    course_name: "Bisnis dan Komersialisasi Nanoteknologi",
    study_program: "Rekayasa Nanoteknologi",
    program_code: "RN",
    credits: 2,
    total_votes: 8,
    priority_1_votes: 2,
    priority_2_votes: 3,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "UNQUALIFIED",
    projected_classes: 0,
  },
]

function getLocalVotes(): StudentVote[] {
  if (typeof window === "undefined" || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTES)
    return raw ? JSON.parse(raw) as StudentVote[] : []
  } catch {
    return []
  }
}

function saveLocalVotes(votes: StudentVote[]) {
  if (typeof window === "undefined" || !window.localStorage) return
  localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(votes))
}

export const pollingService = {
  /**
   * Mengambil data periode polling pra-KRS yang sedang aktif.
   */
  async getActivePeriod(): Promise<PollingPeriod> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    try {
      const response = await fetch("/api/v1/polling/periods/active", {
        headers,
      })
      if (response.ok) {
        return (await response.json()) as PollingPeriod
      }
    } catch {
      // Fallback network error
    }

    return DEFAULT_ACTIVE_PERIOD
  },

  /**
   * Mengambil daftar vote/wishlist mahasiswa yang sedang login.
   */
  async getMyVotes(): Promise<StudentVote[]> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    try {
      const response = await fetch("/api/v1/polling/my-votes", {
        headers,
      })
      if (response.ok) {
        const data = (await response.json()) as StudentVote[]
        saveLocalVotes(data)
        return data
      }
    } catch {
      // Fallback network error
    }

    return getLocalVotes()
  },

  /**
   * Mengirim atau memperbarui vote wishlist untuk mata kuliah tertentu dengan skala prioritas.
   */
  async submitVote(payload: SubmitVotePayload): Promise<StudentVote> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    try {
      const response = await fetch("/api/v1/polling/votes", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = (await response.json()) as StudentVote
        // Update local mirror
        const existing = getLocalVotes().filter(
          (v) => v.course_id !== payload.course_id,
        )
        existing.push(result)
        saveLocalVotes(existing)
        return result
      }
    } catch {
      // Fallback network error
    }

    // Local state fallback update
    const existing = getLocalVotes().filter(
      (v) => v.course_id !== payload.course_id,
    )
    const newVote: StudentVote = {
      vote_id: `vote-${Date.now()}`,
      course_id: payload.course_id,
      priority: payload.priority,
      created_at: new Date().toISOString(),
    }
    existing.push(newVote)
    saveLocalVotes(existing)
    return newVote
  },

  /**
   * Menghapus vote wishlist mata kuliah untuk mahasiswa aktif.
   */
  async removeVote(courseId: string): Promise<void> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    try {
      const response = await fetch(
        `/api/v1/polling/votes/${encodeURIComponent(courseId)}`,
        {
          method: "DELETE",
          headers,
        },
      )
      if (response.ok) {
        const existing = getLocalVotes().filter((v) => v.course_id !== courseId)
        saveLocalVotes(existing)
        return
      }
    } catch {
      // Fallback network error
    }

    const existing = getLocalVotes().filter((v) => v.course_id !== courseId)
    saveLocalVotes(existing)
  },

  /**
   * Mengambil rekap analitik peminatan mata kuliah untuk Kaprodi/Dosen/Admin.
   */
  async getDemandAnalytics(
    studyProgram?: string,
  ): Promise<DemandAnalyticsResponse> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    const query =
      studyProgram && studyProgram !== "all"
        ? `?study_program=${encodeURIComponent(studyProgram)}`
        : ""

    try {
      let response = await fetch(`/api/v1/polling/demand-analytics${query}`, {
        headers,
      })
      if (!response.ok) {
        response = await fetch(
          `/api/v1/admin/polling/demand-analytics${query}`,
          {
            headers,
          },
        )
      }
      if (response.ok) {
        return (await response.json()) as DemandAnalyticsResponse
      }
    } catch {
      // Fallback network error
    }

    // Dynamic mock analytics with local votes reflection
    const currentVotes = getLocalVotes()
    const clonedItems = MOCK_DEMAND_ANALYTICS.map((item) => {
      const extra = currentVotes.find(
        (v) =>
          v.course_id === item.course_id || v.course_id === item.course_code,
      )
      if (extra) {
        const total = item.total_votes + 1
        const p1 =
          extra.priority === 1
            ? item.priority_1_votes + 1
            : item.priority_1_votes
        const p2 =
          extra.priority === 2
            ? item.priority_2_votes + 1
            : item.priority_2_votes
        const p3 =
          extra.priority === 3
            ? item.priority_3_votes + 1
            : item.priority_3_votes
        const status: "QUALIFIED" | "BORDERLINE" | "UNQUALIFIED" =
          total >= 15 ? "QUALIFIED" : total >= 10 ? "BORDERLINE" : "UNQUALIFIED"
        const projected = Math.max(
          status === "QUALIFIED" ? Math.ceil(total / 30) : 0,
          0,
        )
        return {
          ...item,
          total_votes: total,
          priority_1_votes: p1,
          priority_2_votes: p2,
          priority_3_votes: p3,
          status,
          projected_classes: projected,
        }
      }
      return item
    })

    const filtered =
      studyProgram && studyProgram !== "all"
        ? clonedItems.filter(
            (it) =>
              it.study_program === studyProgram ||
              it.program_code === studyProgram,
          )
        : clonedItems

    return {
      period: DEFAULT_ACTIVE_PERIOD,
      total_students_voted: 142 + currentVotes.length,
      items: filtered,
    }
  },
}
