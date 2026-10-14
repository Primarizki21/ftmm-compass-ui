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
    course_id: "TSD301",
    course_code: "TSD301",
    course_name: "Pembelajaran Mesin Terapan (Applied ML)",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 38,
    priority_1_votes: 24,
    priority_2_votes: 9,
    priority_3_votes: 5,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 2,
  },
  {
    course_id: "TSD302",
    course_code: "TSD302",
    course_name: "Pemrosesan Bahasa Alami Lanjut (Advanced NLP)",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 27,
    priority_1_votes: 18,
    priority_2_votes: 6,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TSD303",
    course_code: "TSD303",
    course_name: "Visi Komputer & Sistem Otonom",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
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
    course_id: "TSD304",
    course_code: "TSD304",
    course_name: "Analitika Graf & Jejaring Sosial",
    study_program: "Teknologi Sains Data",
    program_code: "TSD",
    credits: 3,
    total_votes: 7,
    priority_1_votes: 2,
    priority_2_votes: 3,
    priority_3_votes: 2,
    min_quorum: 15,
    status: "UNQUALIFIED",
    projected_classes: 0,
  },
  {
    course_id: "TRKB301",
    course_code: "TRKB301",
    course_name: "Robotika Kolaboratif & HRI",
    study_program: "Rekayasa Nanoteknologi",
    program_code: "TRKB",
    credits: 3,
    total_votes: 32,
    priority_1_votes: 20,
    priority_2_votes: 8,
    priority_3_votes: 4,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TRKB302",
    course_code: "TRKB302",
    course_name: "Sistem Kendali Adaptif",
    study_program: "Rekayasa Nanoteknologi",
    program_code: "TRKB",
    credits: 3,
    total_votes: 13,
    priority_1_votes: 5,
    priority_2_votes: 4,
    priority_3_votes: 4,
    min_quorum: 15,
    status: "BORDERLINE",
    projected_classes: 1,
  },
  {
    course_id: "RN301",
    course_code: "RN301",
    course_name: "Nanomaterial untuk Biomedis",
    study_program: "Rekayasa Nanoteknologi",
    program_code: "RN",
    credits: 3,
    total_votes: 22,
    priority_1_votes: 14,
    priority_2_votes: 5,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TI301",
    course_code: "TI301",
    course_name: "Optimasi Rantai Pasok Berkelanjutan",
    study_program: "Teknik Industri",
    program_code: "TI",
    credits: 3,
    total_votes: 29,
    priority_1_votes: 17,
    priority_2_votes: 8,
    priority_3_votes: 4,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TI302",
    course_code: "TI302",
    course_name: "Rekayasa Ergonomi & Desain Produk",
    study_program: "Teknik Industri",
    program_code: "TI",
    credits: 3,
    total_votes: 11,
    priority_1_votes: 4,
    priority_2_votes: 4,
    priority_3_votes: 3,
    min_quorum: 15,
    status: "BORDERLINE",
    projected_classes: 1,
  },
  {
    course_id: "TE301",
    course_code: "TE301",
    course_name: "Smart Grid & Integrasi Energi Terbarukan",
    study_program: "Teknik Elektro",
    program_code: "TE",
    credits: 3,
    total_votes: 25,
    priority_1_votes: 15,
    priority_2_votes: 6,
    priority_3_votes: 4,
    min_quorum: 15,
    status: "QUALIFIED",
    projected_classes: 1,
  },
  {
    course_id: "TE302",
    course_code: "TE302",
    course_name: "Desain Sistem VLSI",
    study_program: "Teknik Elektro",
    program_code: "TE",
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
      const response = await fetch(
        `/api/v1/admin/polling/demand-analytics${query}`,
        {
          headers,
        },
      )
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
