import type { Course, CourseCategory, PrerequisiteNode } from "../data"
import { parityOfSemester } from "./academics"

export const PROGRAM_ABBREVIATIONS: Record<string, string> = {
  "Teknik Industri": "TI",
  "Teknologi Sains Data": "TSD",
  "Teknik Robotika dan Kecerdasan Buatan": "TRKB",
  "Teknik Elektro": "TE",
  "Rekayasa Nanoteknologi": "RN",
}

const RELIGIONS = [
  { name: "Islam", code: "agi", text: ["islam"] },
  { name: "Katolik", code: "agk", text: ["katolik"] },
  { name: "Protestan", code: "agp", text: ["protestan", "kristen"] },
  { name: "Hindu", code: "agh", text: ["hindu"] },
  { name: "Buddha", code: "agb", text: ["buddha", "budha"] },
  { name: "Khonghucu", code: "agc", text: ["khonghucu", "konghucu"] },
] as const

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
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

export function normalizeCourseType(raw?: string): "Wajib" | "Pilihan" {
  const value = (raw ?? "").toLowerCase()
  if (!value) return "Wajib"
  if (
    value.includes("pilihan") ||
    value.includes("pengayaan") ||
    value.includes("peminatan")
  ) {
    return "Pilihan"
  }
  return "Wajib"
}

/** Nama agama untuk mata kuliah agama, `null` untuk mata kuliah lain. */
export function courseReligion(course: {
  name: string
  code?: string
}): string | null {
  const code = (course.code || "").toLowerCase()
  const text = `${code} ${course.name}`.toLowerCase()
  if (!text.includes("agama") && !/ag[ikphbc]/.test(code)) return null
  const match = RELIGIONS.find(
    (religion) =>
      code.includes(religion.code) ||
      religion.text.some((word) => text.includes(word)),
  )
  return match?.name ?? "Umum"
}

export function classifyCourseCategory(course: {
  code?: string
  name: string
  semester: number
}): CourseCategory {
  const code = (course.code || "").toUpperCase().trim()
  const name = course.name.toLowerCase().trim()
  const semester = Number(course.semester) || 1

  // Agama 2 diajarkan per-prodi pada semester atas (Sem >= 5 atau kode AGI401/AGI102).
  if (
    courseReligion(course) &&
    (semester >= 5 ||
      code.includes("401") ||
      code.includes("102") ||
      name.includes(" ii") ||
      (name.includes("2") && !name.includes("1")))
  ) {
    return "prodi"
  }

  if (semester <= 2) {
    if (
      courseReligion(course) ||
      [
        "pancasila",
        "kewarganegaraan",
        "bahasa indonesia",
        "pemikiran kritis",
        "pengembangan diri",
        "kolaborasi keilmuan",
        "data dan pustaka",
        "biologi dasar",
        "kimia dasar",
        "fisika dasar",
      ].some((keyword) => name.includes(keyword)) ||
      ["matematika", "matematika i", "kalkulus i", "kalkulus 1"].includes(
        name,
      ) ||
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

    if (
      name.includes("pengantar teknologi maju") ||
      name.includes("teknologi hijau") ||
      ["TNM101", "TNM102"].includes(code)
    ) {
      return "pdb_saintek"
    }
  }

  return "prodi"
}

export function normalizeRomanName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+1\b/g, " i")
    .replace(/\s+2\b/g, " ii")
    .replace(/\s+3\b/g, " iii")
    .trim()
}

/** Membuang boilerplate prasyarat dan syarat SKS yang menempel pada nama MK. */
export function cleanPrerequisiteText(raw: string): string {
  let cleaned = raw.trim()
  if (!cleaned || /^(dan|atau|dan\/atau)$/i.test(cleaned)) return ""

  cleaned = cleaned
    .replace(
      /\s+(?:dan|serta)\s+(?:sudah\s+menempuh|menempuh|lulus|sudah\s+mengambil)?\s*(?:minimal|minimum)?\s*\d+\s*sks.*$/i,
      "",
    )
    .replace(/\s+(?:serta|dan)\s*$/i, "")
    .trim()

  return cleaned
    .replace(
      /^(?:diambil\s+bersamaan(?:\s*\/\s*sudah\s+mengambil)?|telah\s*\/\s*tengah\s+mengambil|sudah\s*\/\s*sedang\s+mengambil|sudah\s+atau\s+pernah\s+mengambil|pernah\s+mengambil|sudah\s+mengambil)\s+/i,
      "",
    )
    .replace(/^lulus\s+(?!\d|minimum|minimal)/i, "")
    .replace(/^(?:dan\/atau|atau|dan)\s+/i, "")
    .replace(/[,;]\s*$/g, "")
    .trim()
}

export function isAdministrativeRequirement(raw: string): boolean {
  return /^(?:lulus\s+mini|sudah\s+menempuh|menempuh\s+mini|minimal\s+semester|minimal\s+sudah|sudah\s+lulus|\d+\s*sks)/i.test(
    raw.trim(),
  )
}

export function toPrerequisiteNodes(raw: unknown): PrerequisiteNode[] {
  if (!Array.isArray(raw)) return []
  const nodes: PrerequisiteNode[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "string") continue
    const name = cleanPrerequisiteText(item)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    nodes.push({
      id: name,
      name,
      isAdministrative: isAdministrativeRequirement(name),
    })
  }
  return nodes
}

export interface CourseSource {
  code?: string
  fallbackId?: string
  name: string
  credits: number
  semester: number
  type?: string
  parity?: "odd" | "even"
  desc?: string
  program: string
  prerequisites?: unknown
}

/**
 * Normalizer tunggal untuk sumber JSON kurikulum dan respons API: id unik per
 * prodi, parity dari semester, kategori, dan prasyarat.
 */
export function normalizeCourse(
  source: CourseSource,
  usedIds: Set<string> = new Set(),
): Course {
  const program = normalizeProgramName(source.program)
  const code = (source.code || "").trim()
  let id = `${slugify(program)}:${code || source.fallbackId || slugify(source.name)}`
  if (usedIds.has(id)) id += `-${slugify(source.name)}`
  while (usedIds.has(id)) id += "-x"
  usedIds.add(id)

  return {
    id,
    code: code || undefined,
    name: source.name,
    credits: Number(source.credits) || 0,
    semester: Number(source.semester) || 1,
    type: normalizeCourseType(source.type),
    parity: source.parity ?? parityOfSemester(Number(source.semester) || 1),
    desc: source.desc ?? "",
    program,
    prodiAbbr: getProdiAbbreviation(program),
    category: classifyCourseCategory({
      code,
      name: source.name,
      semester: Number(source.semester) || 1,
    }),
    prerequisites: toPrerequisiteNodes(source.prerequisites),
  }
}

/** Mencari Course resmi berdasarkan nama atau kode, mengutamakan prodi pemilik. */
export function findCourseByNameOrCode(
  nameOrCode: string,
  catalog: Course[],
  preferredProgram?: string,
): Course | undefined {
  if (!nameOrCode || !nameOrCode.trim()) return undefined
  const query = nameOrCode.trim().toLowerCase()
  const program = preferredProgram
    ? normalizeProgramName(preferredProgram)
    : undefined

  const matches = (course: Course) => {
    const code = course.code?.toLowerCase()
    const name = course.name.toLowerCase()
    return {
      code: code === query,
      name: name === query,
      roman: normalizeRomanName(course.name) === normalizeRomanName(query),
    }
  }
  const pick = (predicate: (course: Course) => boolean) =>
    catalog.find(predicate)

  const inProgram = (course: Course) => !program || course.program === program
  return (
    pick((c) => inProgram(c) && matches(c).code) ??
    pick((c) => matches(c).code) ??
    pick((c) => inProgram(c) && matches(c).name) ??
    pick((c) => matches(c).name) ??
    pick((c) => inProgram(c) && matches(c).roman) ??
    pick((c) => matches(c).roman)
  )
}

/** Semua MK dalam katalog yang mencantumkan `course` sebagai prasyarat. */
export function findUnlockedCourses(
  course: Course,
  catalog: Course[],
): Course[] {
  const targetName = course.name.toLowerCase().trim()
  const targetCode = course.code?.toLowerCase().trim()
  const targetNorm = normalizeRomanName(course.name)

  return catalog
    .filter(
      (candidate) =>
        candidate.id !== course.id &&
        (candidate.prerequisites ?? []).some((prereq) => {
          if (prereq.isAdministrative) return false
          const name = prereq.name.toLowerCase().trim()
          const id = prereq.id.toLowerCase().trim()
          return (
            name === targetName ||
            (targetCode !== undefined &&
              (name === targetCode || id === targetCode)) ||
            normalizeRomanName(name) === targetNorm
          )
        }),
    )
    .sort((a, b) => {
      const aSame = a.program === course.program ? 0 : 1
      const bSame = b.program === course.program ? 0 : 1
      return aSame !== bSame ? aSame - bSame : a.semester - b.semester
    })
}
