import { Course, CourseCategory, PrerequisiteNode } from "./data"

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

export function cleanPrereqText(s: string): string {
  let cleaned = s.trim()
  if (!cleaned || /^(dan|atau|dan\/atau)$/i.test(cleaned)) {
    return ""
  }

  // Remove trailing credit requirements attached to course names
  cleaned = cleaned
    .replace(
      /\s+(?:dan|serta)\s+(?:sudah\s+menempuh|menempuh|lulus|sudah\s+mengambil)?\s*(?:minimal|minimum)?\s*\d+\s*sks.*$/i,
      "",
    )
    .replace(/\s+(?:serta|dan)\s*$/i, "")
    .trim()

  // Remove leading co-requisite / pre-requisite boilerplate
  cleaned = cleaned
    .replace(
      /^(?:diambil\s+bersamaan(?:\s*\/\s*sudah\s+mengambil)?|telah\s*\/\s*tengah\s+mengambil|sudah\s*\/\s*sedang\s+mengambil|sudah\s+atau\s+pernah\s+mengambil|pernah\s+mengambil|sudah\s+mengambil)\s+/i,
      "",
    )
    .replace(/^lulus\s+(?!\d|minimum|minimal)/i, "")
    .replace(/^(?:dan\/atau|atau|dan)\s+/i, "")
    .replace(/[,;]\s*$/g, "")
    .trim()

  return cleaned
}

export function isAdministrativeRequirement(s: string): boolean {
  return /^(?:lulus\s+mini|sudah\s+menempuh|menempuh\s+mini|minimal\s+semester|minimal\s+sudah|sudah\s+lulus|\d+\s*sks)/i.test(
    s.trim(),
  )
}

export function toPrereqNodes(raw: unknown): PrerequisiteNode[] {
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
    nodes.push({
      id: name,
      name,
      isAdministrative: isAdministrativeRequirement(name),
    })
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

export const PROGRAM_ABBREVIATIONS: Record<string, string> = {
  "Teknik Industri": "TI",
  "Teknologi Sains Data": "TSD",
  "Teknik Robotika dan Kecerdasan Buatan": "TRKB",
  "Teknik Elektro": "TE",
  "Rekayasa Nanoteknologi": "RN",
}

export function normalizeProgramName(raw?: string): string {
  if (!raw) return ""
  return raw.replace(/^S1\s+/i, "").trim()
}

export function getProdiAbbreviation(program?: string): string {
  if (!program) return ""
  const normalized = normalizeProgramName(program)
  return PROGRAM_ABBREVIATIONS[normalized] || normalized
}

export function classifyCourseCategory(course: {
  code?: string
  name: string
  semester: number
}): CourseCategory {
  const code = (course.code || "").toUpperCase().trim()
  const nl = course.name.toLowerCase().trim()
  const sem = Number(course.semester) || 1

  // Agama 2 is specifically taught per-prodi in upper semesters (Sem >= 5 or code AGI401, AGI102)
  if (
    nl.includes("agama") &&
    (sem >= 5 ||
      code.includes("401") ||
      code.includes("102") ||
      nl.includes(" ii") ||
      (nl.includes("2") && !nl.includes("1")))
  ) {
    return "prodi"
  }

  // Semester 1 or 2 foundational courses
  if (sem <= 2) {
    // PDB Universitas (MKWU Nasional/Universitas + Dasar Saintek Universitas non-praktikum)
    if (
      nl.includes("agama") ||
      nl.includes("pancasila") ||
      nl.includes("kewarganegaraan") ||
      nl.includes("bahasa indonesia") ||
      nl.includes("pemikiran kritis") ||
      nl.includes("pengembangan diri") ||
      nl.includes("kolaborasi keilmuan") ||
      nl.includes("data dan pustaka") ||
      nl.includes("biologi dasar") ||
      nl.includes("kimia dasar") ||
      nl.includes("fisika dasar") ||
      nl === "matematika" ||
      nl === "matematika i" ||
      nl === "kalkulus i" ||
      nl === "kalkulus 1" ||
      [
        "NOP103",
        "NOP104",
        "BAI101",
        "BA1101",
        "PHP103",
        "BHP103",
        "MNM106",
        "MNM107",
        "SIP107",
        "MAT108",
        "MAA103",
        "MA1101",
        "FID101",
        "FID103",
        "KID101",
        "KID105",
        "BID101",
      ].includes(code)
    ) {
      return "pdb_univ"
    }

    // PDB Saintek (Mata kuliah bersama saintek terapan FTMM)
    if (
      nl.includes("pengantar teknologi maju") ||
      nl.includes("teknologi hijau") ||
      ["TNM101", "TNM102"].includes(code)
    ) {
      return "pdb_saintek"
    }
  }

  return "prodi"
}

const coursesByProgram: Record<string, Course[]> = {}

for (const [path, mod] of Object.entries(modules)) {
  const cur = mod?.default ?? {}
  const fileName = path.split("/").pop() ?? path
  const rawProgram =
    cur.metadata?.program_studi?.trim() ||
    fileName.replace(/^FIX\s*/i, "").replace(/\.json$/i, "")
  const program = normalizeProgramName(rawProgram)

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
      prodiAbbr: getProdiAbbreviation(program),
      category: classifyCourseCategory({ code, name, semester }),
    })
  })
}

/** Official program names, alphabetically sorted. */
export const PROGRAMS: string[] = Object.keys(coursesByProgram).sort((a, b) =>
  a.localeCompare(b),
)

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

    const usedIds = new Set<string>()
    const courses: Course[] = rawList.map((c, i) => {
      const baseCode = c.code || c.id || `mk-${i + 1}`
      const normProgram = normalizeProgramName(c.program || "ftmm")
      let id = `${slugify(normProgram)}:${baseCode}`
      if (usedIds.has(id)) id += `-${slugify(c.name)}`
      while (usedIds.has(id)) id += "-x"
      usedIds.add(id)
      const semester = Number(c.semester) || 1
      const code = c.code || c.id || undefined
      return {
        id,
        code,
        name: c.name,
        credits: Number(c.credits) || 0,
        semester,
        type: c.type === "Pilihan" ? "Pilihan" : "Wajib",
        parity: c.parity === "even" ? "even" : "odd",
        desc: c.desc || "",
        program: normProgram,
        prodiAbbr: getProdiAbbreviation(normProgram),
        category: classifyCourseCategory({ code, name: c.name, semester }),
        prerequisites: toPrereqNodes(c.prerequisites),
      }
    })

    return {
      courses,
      programs:
        data.programs && data.programs.length > 0
          ? Array.from(new Set(data.programs.map(normalizeProgramName))).sort(
              (a, b) => a.localeCompare(b),
            )
          : undefined,
    }
  } catch {
    return null
  }
}
