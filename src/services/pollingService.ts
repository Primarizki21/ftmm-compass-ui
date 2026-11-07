import { apiFetch } from "../api/client"
import { readUser } from "../api/session"

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

// ponytail: fixture sementara sampai F6 menghapus data demo dari jalur produksi.
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

// ponytail: fixture sementara sampai F6 menghapus data demo dari jalur produksi.
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

function replaceVote(courseId: string, next?: StudentVote): void {
  const kept = getLocalVotes().filter((vote) => vote.course_id !== courseId)
  saveLocalVotes(next ? [...kept, next] : kept)
}

export const pollingService = {
  async getActivePeriod(): Promise<PollingPeriod> {
    try {
      return await apiFetch<PollingPeriod>("/api/v1/polling/periods/active", {
        auth: true,
      })
    } catch {
      return DEFAULT_ACTIVE_PERIOD
    }
  },

  async getMyVotes(): Promise<StudentVote[]> {
    try {
      const votes = await apiFetch<StudentVote[]>("/api/v1/polling/my-votes", {
        auth: true,
      })
      saveLocalVotes(votes)
      return votes
    } catch {
      return getLocalVotes()
    }
  },

  async submitVote(payload: SubmitVotePayload): Promise<StudentVote> {
    try {
      const vote = await apiFetch<StudentVote>("/api/v1/polling/votes", {
        method: "POST",
        body: payload,
        auth: true,
      })
      replaceVote(payload.course_id, vote)
      return vote
    } catch {
      const vote: StudentVote = {
        vote_id: `vote-${Date.now()}`,
        course_id: payload.course_id,
        priority: payload.priority,
        created_at: new Date().toISOString(),
      }
      replaceVote(payload.course_id, vote)
      return vote
    }
  },

  async removeVote(courseId: string): Promise<void> {
    await apiFetch<void>(
      `/api/v1/polling/votes/${encodeURIComponent(courseId)}`,
      { method: "DELETE", auth: true },
    ).catch(() => undefined)
    replaceVote(courseId)
  },

  async getDemandAnalytics(
    studyProgram?: string,
  ): Promise<DemandAnalyticsResponse> {
    const query =
      studyProgram && studyProgram !== "all"
        ? `?study_program=${encodeURIComponent(studyProgram)}`
        : ""
    const role = readUser<{ role: string }>()?.role ?? "student"
    const base = ["lecturer", "admin", "faculty_staff"].includes(role)
      ? "/api/v1/admin/polling/demand-analytics"
      : "/api/v1/polling/demand-analytics"

    try {
      return await apiFetch<DemandAnalyticsResponse>(`${base}${query}`, {
        auth: true,
      })
    } catch {
      const currentVotes = getLocalVotes()
      const items = MOCK_DEMAND_ANALYTICS.map((item) => {
        const extra = currentVotes.find(
          (vote) =>
            vote.course_id === item.course_id ||
            vote.course_id === item.course_code,
        )
        if (!extra) return item
        const total = item.total_votes + 1
        const status: CourseDemandItem["status"] =
          total >= 15 ? "QUALIFIED" : total >= 10 ? "BORDERLINE" : "UNQUALIFIED"
        return {
          ...item,
          total_votes: total,
          priority_1_votes:
            item.priority_1_votes + (extra.priority === 1 ? 1 : 0),
          priority_2_votes:
            item.priority_2_votes + (extra.priority === 2 ? 1 : 0),
          priority_3_votes:
            item.priority_3_votes + (extra.priority === 3 ? 1 : 0),
          status,
          projected_classes: status === "QUALIFIED" ? Math.ceil(total / 30) : 0,
        }
      })
      return {
        period: DEFAULT_ACTIVE_PERIOD,
        total_students_voted: 142 + currentVotes.length,
        items:
          studyProgram && studyProgram !== "all"
            ? items.filter(
                (item) =>
                  item.study_program === studyProgram ||
                  item.program_code === studyProgram,
              )
            : items,
      }
    }
  },
}
