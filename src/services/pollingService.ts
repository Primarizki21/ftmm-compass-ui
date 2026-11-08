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

const ADMIN_ROLES = ["lecturer", "admin", "faculty_staff"]

export const pollingService = {
  getActivePeriod(): Promise<PollingPeriod> {
    return apiFetch<PollingPeriod>("/api/v1/polling/periods/active", {
      auth: true,
    })
  },

  getMyVotes(): Promise<StudentVote[]> {
    return apiFetch<StudentVote[]>("/api/v1/polling/my-votes", { auth: true })
  },

  submitVote(payload: SubmitVotePayload): Promise<StudentVote> {
    return apiFetch<StudentVote>("/api/v1/polling/votes", {
      method: "POST",
      body: payload,
      auth: true,
    })
  },

  removeVote(courseId: string): Promise<void> {
    return apiFetch<void>(
      `/api/v1/polling/votes/${encodeURIComponent(courseId)}`,
      { method: "DELETE", auth: true },
    )
  },

  getDemandAnalytics(studyProgram?: string): Promise<DemandAnalyticsResponse> {
    const query =
      studyProgram && studyProgram !== "all"
        ? `?study_program=${encodeURIComponent(studyProgram)}`
        : ""
    const role = readUser<{ role: string }>()?.role ?? "student"
    const base = ADMIN_ROLES.includes(role)
      ? "/api/v1/admin/polling/demand-analytics"
      : "/api/v1/polling/demand-analytics"
    return apiFetch<DemandAnalyticsResponse>(`${base}${query}`, { auth: true })
  },
}
