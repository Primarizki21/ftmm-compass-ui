import { authService } from "./authService"

export interface StudentDashboardStats {
  type: "student"
  sks_completed: number
  sks_target: number
  completion_percentage: number
  current_semester: number
  term_name: string
  courses_planned: number
  sks_planned: number
  gpa: number
  predicate: string
}

export interface LecturerDashboardStats {
  type: "lecturer"
  courses_taught: number
  sks_taught: number
  total_students: number
  advisee_students: number
  active_term: string
  status: string
}

export interface AdminDashboardStats {
  type: "admin"
  total_active_students: number
  total_lecturers: number
  total_courses: number
  total_study_programs: number
  active_polling_period: string
  system_status: string
}

export type DashboardStats = StudentDashboardStats | LecturerDashboardStats | AdminDashboardStats

export interface DashboardScheduleItem {
  id: string
  course_id: string
  course_code: string
  course_name: string
  credits: number
  day: string
  start_time: string
  end_time: string
  time: string
  room: string
  lecturer?: string
  class_name?: string
  enrolled_students?: number
  color?: string
}

export interface DashboardMeResponse {
  user_id: string
  full_name: string
  role: string
  email: string
  student_number?: string
  study_program?: string
  period_name: string
  academic_week: number
  stats: DashboardStats
  schedule: DashboardScheduleItem[]
}

export const dashboardService = {
  async getDashboardMe(): Promise<DashboardMeResponse> {
    const headers = {
      ...authService.getAuthHeaders(),
      "Content-Type": "application/json",
    }

    let response: Response
    try {
      response = await fetch("/api/v1/dashboard/me", {
        headers,
      })
      if (!response.ok && response.status === 404) {
        response = await fetch("http://127.0.0.1:8001/api/v1/dashboard/me", {
          headers,
        })
      }
    } catch {
      response = await fetch("http://127.0.0.1:8001/api/v1/dashboard/me", {
        headers,
      })
    }

    if (!response.ok) {
      throw new Error(`Gagal memuat data dashboard: status ${response.status}`)
    }

    return response.json()
  },
}
