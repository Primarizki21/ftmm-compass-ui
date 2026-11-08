export interface PrerequisiteNode {
  id: string
  name: string
  isAdministrative?: boolean
  prereqs?: {
    id: string
    name: string
  }[]
}

export interface WorkloadInfo {
  hours: number
  lectureCredits: number
  labCredits: number
}

export type CourseCategory = "pdb_univ" | "pdb_saintek" | "prodi"

export interface Course {
  id: string
  /** Official course code (e.g. EF401); differs from id when ids are program-scoped. */
  code?: string
  /** Owning study program, set for courses loaded from the curriculum catalog. */
  program?: string
  /** Short abbreviation of owning program (e.g. TI, TSD, TRKB, TE, RN). */
  prodiAbbr?: string
  /** Academic category distinguishing universal PDB, FTMM faculty PDB, and prodi-specific courses. */
  category?: CourseCategory
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  desc: string
  parity: "odd" | "even"
  prerequisites?: PrerequisiteNode[]
  workload?: WorkloadInfo
  lecturer?: string
}

export const TIMETABLE_DAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
] as const
export interface ClassScheduleSlot {
  day: typeof TIMETABLE_DAYS[number]
  dayOfWeek: number
  start: number
  end: number
  duration: number
  room: string
}

export interface ClassSection {
  sectionId: string
  sectionCode: string
  capacity: number
  enrolled: number
  lecturer?: string
  schedule: ClassScheduleSlot
}

export interface CourseOffering {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  sections: ClassSection[]
}

export interface ScheduleItem {
  id: number | string
  course: string
  code: string
  day: string
  start: number
  duration: number
  color: string
  conflict?: boolean
  room: string
  sectionCode?: string
  lecturer?: string
}

/** Jadwal kelas belum tersedia di katalog; kelas diisi dari data akademik saat ada. */
export function getOfferingForCourse(course: {
  id: string
  name: string
  code?: string
  credits: number
}): CourseOffering {
  return {
    courseId: course.id,
    courseCode: course.code || course.id,
    courseName: course.name,
    credits: course.credits,
    sections: [],
  }
}
