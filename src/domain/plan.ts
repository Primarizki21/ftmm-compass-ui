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
