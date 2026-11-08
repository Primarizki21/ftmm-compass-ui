import type { Course } from "./data"
import { apiFetch } from "./api/client"
import { normalizeCourse, normalizeProgramName } from "./domain/course"

interface ApiCourseItem {
  id: string
  code?: string | null
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  parity: "odd" | "even"
  desc?: string
  program: string
  prerequisites?: string[]
}

interface ApiCoursesResponse {
  programs?: string[]
  courses?: ApiCourseItem[]
  data?: ApiCourseItem[]
}

interface CatalogResult {
  courses: Course[]
  programs: string[]
}

/** Katalog resmi dari backend; melempar ApiError bila backend tidak tersedia. */
export async function fetchCatalog(program?: string): Promise<CatalogResult> {
  const query =
    program && program !== "all" ? `?prodi=${encodeURIComponent(program)}` : ""
  const data = await apiFetch<ApiCoursesResponse>(`/api/v1/courses${query}`)
  const rawList = data.courses ?? data.data ?? []
  const usedIds = new Set<string>()
  const courses = rawList.map((item, index) =>
    normalizeCourse(
      {
        code: item.code ?? item.id,
        fallbackId: `mk-${index + 1}`,
        name: item.name,
        credits: item.credits,
        semester: item.semester,
        type: item.type,
        parity: item.parity,
        desc: item.desc,
        program: item.program,
        prerequisites: item.prerequisites,
      },
      usedIds,
    ),
  )

  return {
    courses,
    programs: Array.from(
      new Set((data.programs ?? []).map(normalizeProgramName)),
    ).sort((a, b) => a.localeCompare(b)),
  }
}
