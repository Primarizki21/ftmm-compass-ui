import { apiFetch } from "../api/client"

export interface AcademicPeriod {
  academic_year: string
  term: "ganjil" | "genap" | "pendek"
  label: string
  term_label: string
  week_label: string
  start_date: string
  end_date: string
  first_week_monday: string
  semester_weeks: number
}

export const academicService = {
  getCurrent(): Promise<AcademicPeriod> {
    return apiFetch<AcademicPeriod>("/api/v1/academic-periods/current", {
      auth: true,
    })
  },
}
