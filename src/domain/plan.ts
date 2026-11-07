import type { Course } from "../data"

export interface PlanCourse extends Course {
  status: "completed" | "planned"
}

export interface DegreePlanDraft {
  id: string
  name: string
  status: "draft" | "active" | "archived"
  plan: Record<number, PlanCourse[]>
  updatedAt: string
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
