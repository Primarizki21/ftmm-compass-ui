import { Course, PrerequisiteNode } from "./data"

/**
 * Loads the FTMM curriculum silabus JSONs from /Ekstrak (gitignored, local-only)
 * and normalizes them into the app-wide Course model.
 *
 * Source shape per file:
 *   { metadata: { program_studi, tahun_ajaran, ... }, mata_kuliah: [...] }
 *
 * Field heterogeneity handled here:
 *   - jenis: 'wajib'/'pilihan' plus per-prodi variants ('Wajib Universitas',
 *     'Pilihan Peminatan STL', 'Mata Kuliah Pengayaan / Pilihan Umum', ...)
 *   - prasyarat: course names ('Fisika Dasar I'), codes ('MAT108'), or free
 *     text ('Diambil bersamaan/sudah mengambil Biologi Dasar')
 *   - kode_mk collides across programs (national MKWU courses), so Course.id
 *     is program-scoped; the official code stays visible via Course.code.
 */

interface RawCourse {
  id?: string
  kode_mk?: string
  nama_mk?: string
  sks?: number
  semester?: number
  program_studi?: string
  jenis?: string
  deskripsi?: string
  prasyarat?: unknown
}

interface RawCurriculum {
  metadata?: {
    program_studi?: string
    tahun_ajaran?: string
  }
  mata_kuliah?: RawCourse[]
}

const modules = import.meta.glob("/Ekstrak/*.json", {
  eager: true,
}) as Record<string, { default: RawCurriculum }>

function normalizeType(raw?: string): "Wajib" | "Pilihan" {
  const j = (raw ?? "").toLowerCase()
  if (!j) return "Wajib"
  if (j.includes("wajib")) return "Wajib"
  if (
    j.includes("pilihan") ||
    j.includes("pengayaan") ||
    j.includes("peminatan")
  )
    return "Pilihan"
  return "Wajib"
}

function cleanPrereqText(s: string): string {
  return s
    .replace(/^diambil\s+bersamaan(\s*\/\s*sudah\s+mengambil)?\s*/i, "")
    .replace(/^(dan\/atau|atau|dan)\s+/i, "")
    .trim()
}

function toPrereqNodes(raw: unknown): PrerequisiteNode[] {
  if (!Array.isArray(raw)) return []
  const nodes: PrerequisiteNode[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "string") continue
    const name = cleanPrereqText(item)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    // Real silabus prereqs carry no codes: keep id identical to the name so
    // views that print both (modal list, diagram) render it only once.
    nodes.push({ id: name, name })
  }
  return nodes
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const coursesByProgram: Record<string, Course[]> = {}

for (const [path, mod] of Object.entries(modules)) {
  const cur = mod?.default ?? {}
  const fileName = path.split("/").pop() ?? path
  const program =
    cur.metadata?.program_studi?.trim() ||
    fileName.replace(/^FIX\s*/i, "").replace(/\.json$/i, "")

  const seen = new Set<string>()
  const usedIds = new Set<string>()
  const bucket = (coursesByProgram[program] ??= [])
  ;(cur.mata_kuliah ?? []).forEach((m, i) => {
    const code = (m.kode_mk ?? "").trim()
    const name = (m.nama_mk ?? "").trim()
    if (!name) return

    const dedupKey = `${code}|${name.toLowerCase()}`
    if (seen.has(dedupKey)) return
    seen.add(dedupKey)

    const semester = Number(m.semester) || 1
    // Some prodis reuse one kode_mk for several courses (MAA103 = Kalkulus 1 & 2),
    // so disambiguate with the name slug to keep React keys and planner ids unique.
    let id = `${slugify(program)}:${code || `mk-${i + 1}`}`
    if (usedIds.has(id)) id += `-${slugify(name)}`
    while (usedIds.has(id)) id += "-x"
    usedIds.add(id)
    bucket.push({
      id,
      code: code || undefined,
      name,
      credits: Number(m.sks) || 0,
      semester,
      type: normalizeType(m.jenis),
      desc: (m.deskripsi ?? "").trim(),
      parity: semester % 2 === 1 ? "odd" : "even",
      prerequisites: toPrereqNodes(m.prasyarat),
      program,
    })
  })
}

/** Official program names, alphabetically sorted. */
export const PROGRAMS: string[] = Object.keys(coursesByProgram).sort((a, b) =>
  a.localeCompare(b),
)

export const COURSES_BY_PROGRAM: Record<string, Course[]> = coursesByProgram

/** Every normalized course across all five programs (~369 entries). */
export const ALL_COURSES: Course[] = PROGRAMS.flatMap(
  (p) => coursesByProgram[p] ?? [],
)

export interface ApiCourseItem {
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

export interface ApiPaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiCoursesResponse {
  source?: string
  program_studi?: string | null
  total_courses?: number
  programs?: string[]
  courses?: ApiCourseItem[]
  data?: ApiCourseItem[]
  meta?: ApiPaginationMeta
}

/** Fetches the official course catalog from the backend API with fallback to local cache. */
export async function fetchCatalog(
  program?: string,
): Promise<{ courses: Course[] programs?: string[] } | null> {
  try {
    const queryParam =
      program && program !== "all"
        ? `?prodi=${encodeURIComponent(program)}`
        : ""
    const primaryUrl = `/api/v1/courses${queryParam}`
    let res = await fetch(primaryUrl)
    if (!res.ok) {
      res = await fetch(`/api/courses${queryParam}`)
    }
    if (!res.ok) return null
    const data: ApiCoursesResponse = await res.json()
    const rawList = Array.isArray(data.courses)
      ? data.courses
      : Array.isArray(data.data)
        ? data.data
        : []
    if (rawList.length === 0) return null

    const courses: Course[] = rawList.map((c) => ({
      id: c.id || `${slugify(c.program)}:${c.code || slugify(c.name)}`,
      code: c.code || undefined,
      name: c.name,
      credits: Number(c.credits) || 0,
      semester: Number(c.semester) || 1,
      type: c.type === "Pilihan" ? "Pilihan" : "Wajib",
      parity: c.parity === "even" ? "even" : "odd",
      desc: c.desc || "",
      program: c.program,
      prerequisites: (c.prerequisites || []).map((p) => ({ id: p, name: p })),
    }))

    return {
      courses,
      programs:
        data.programs && data.programs.length > 0 ? data.programs : undefined,
    }
  } catch {
    return null
  }
}

/** Searches course catalog using semantic/keyword course search endpoint. */
export async function searchCatalog(
  query: string,
  program?: string,
): Promise<Course[] | null> {
  try {
    const params = new URLSearchParams({ q: query })
    if (program && program !== "all") {
      params.set("prodi", program)
    }
    let res = await fetch(`/api/v1/courses/search?${params.toString()}`)
    if (!res.ok) {
      res = await fetch(`/api/courses/search?${params.toString()}`)
    }
    if (!res.ok) return null
    const data = (await res.json()) as { results?: ApiCourseItem[] }
    const results = data.results || []
    return results.map((c) => ({
      id: c.id || `${slugify(c.program)}:${c.code || slugify(c.name)}`,
      code: c.code || undefined,
      name: c.name,
      credits: Number(c.credits) || 0,
      semester: Number(c.semester) || 1,
      type: c.type === "Pilihan" ? "Pilihan" : "Wajib",
      parity: c.parity === "even" ? "even" : "odd",
      desc: c.desc || "",
      program: c.program,
      prerequisites: (c.prerequisites || []).map((p) => ({ id: p, name: p })),
    }))
  } catch {
    return null
  }
}
