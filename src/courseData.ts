import type { Course } from "./data"
import { apiFetch } from "./api/client"
import { normalizeCourse, normalizeProgramName } from "./domain/course"

/**
 * Memuat silabus FTMM dari /Ekstrak (gitignored, lokal) dan menormalkannya ke
 * model `Course` aplikasi.
 *
 * Bentuk sumber per berkas:
 *   { metadata: { program_studi, tahun_ajaran, ... }, mata_kuliah: [...] }
 *
 * Heterogenitas yang ditangani di sini: `jenis` punya varian per prodi, `prasyarat`
 * bisa berupa nama, kode, atau kalimat bebas, dan `kode_mk` bertabrakan antar
 * prodi (MKWU nasional) sehingga `Course.id` diberi scope prodi.
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

const coursesByProgram: Record<string, Course[]> = {}

for (const [path, mod] of Object.entries(modules)) {
  const curriculum = mod?.default ?? {}
  const fileName = path.split("/").pop() ?? path
  const program = normalizeProgramName(
    curriculum.metadata?.program_studi?.trim() ||
      fileName.replace(/^FIX\s*/i, "").replace(/\.json$/i, ""),
  )
  const bucket = (coursesByProgram[program] ??= [])
  const usedIds = new Set<string>()
  const seen = new Set<string>()
  ;(curriculum.mata_kuliah ?? []).forEach((raw, index) => {
    const code = (raw.kode_mk ?? "").trim()
    const name = (raw.nama_mk ?? "").trim()
    if (!name) return
    const dedupKey = `${code}|${name.toLowerCase()}`
    if (seen.has(dedupKey)) return
    seen.add(dedupKey)

    bucket.push(
      normalizeCourse(
        {
          code,
          fallbackId: `mk-${index + 1}`,
          name,
          credits: Number(raw.sks) || 0,
          semester: Number(raw.semester) || 1,
          type: raw.jenis,
          desc: (raw.deskripsi ?? "").trim(),
          program,
          prerequisites: raw.prasyarat,
        },
        usedIds,
      ),
    )
  })
}

/** Nama program studi resmi, terurut alfabetis. */
export const PROGRAMS: string[] = Object.keys(coursesByProgram).sort((a, b) =>
  a.localeCompare(b),
)

/** Seluruh mata kuliah pada lima prodi (~369 entri). */
export const ALL_COURSES: Course[] = PROGRAMS.flatMap(
  (program) => coursesByProgram[program] ?? [],
)

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

/** Katalog resmi dari backend; melempar ApiError bila backend tidak tersedia. */
export async function fetchCatalog(
  program?: string,
): Promise<{
  courses: Course[]
  programs?: string[]
}> {
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
    programs:
      data.programs && data.programs.length > 0
        ? Array.from(new Set(data.programs.map(normalizeProgramName))).sort(
            (a, b) => a.localeCompare(b),
          )
        : undefined,
  }
}
