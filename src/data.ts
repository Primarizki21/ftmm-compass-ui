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

export const CLASS_OFFERINGS_CATALOG: Record<string, CourseOffering> = {
  II4042: {
    courseId: "II4042",
    courseCode: "II4042",
    courseName: "Machine Learning",
    credits: 3,
    sections: [
      {
        sectionId: "II4042-A",
        sectionCode: "Kelas A",
        capacity: 40,
        enrolled: 35,
        lecturer: "Dr. Ir. Budi Santoso, M.Kom.",
        schedule: {
          day: "Selasa",
          dayOfWeek: 2,
          start: 10,
          end: 12,
          duration: 2,
          room: "Lab Komputasi 1",
        },
      },
      {
        sectionId: "II4042-B",
        sectionCode: "Kelas B",
        capacity: 40,
        enrolled: 28,
        lecturer: "Dr. Eng. Rina Wardani, S.T., M.T.",
        schedule: {
          day: "Kamis",
          dayOfWeek: 4,
          start: 13,
          end: 15,
          duration: 2,
          room: "Lab Komputasi 2",
        },
      },
    ],
  },
  II4045: {
    courseId: "II4045",
    courseCode: "II4045",
    courseName: "Data Visualization",
    credits: 3,
    sections: [
      {
        sectionId: "II4045-A",
        sectionCode: "Kelas A",
        capacity: 35,
        enrolled: 30,
        lecturer: "Ahmad Fauzi, S.Kom., M.Cs.",
        schedule: {
          day: "Selasa",
          dayOfWeek: 2,
          start: 10,
          end: 13,
          duration: 3,
          room: "Lab Komputasi 2",
        },
      },
      {
        sectionId: "II4045-B",
        sectionCode: "Kelas B",
        capacity: 35,
        enrolled: 26,
        lecturer: "Ahmad Fauzi, S.Kom., M.Cs.",
        schedule: {
          day: "Rabu",
          dayOfWeek: 3,
          start: 13,
          end: 16,
          duration: 3,
          room: "Lab Komputasi 1",
        },
      },
    ],
  },
  KU2001: {
    courseId: "KU2001",
    courseCode: "KU2001",
    courseName: "Kewarganegaraan",
    credits: 2,
    sections: [
      {
        sectionId: "KU2001-A",
        sectionCode: "Kelas A",
        capacity: 50,
        enrolled: 48,
        lecturer: "Drs. Sutrisno, M.Hum.",
        schedule: {
          day: "Rabu",
          dayOfWeek: 3,
          start: 7,
          end: 9,
          duration: 2,
          room: "R. 201",
        },
      },
      {
        sectionId: "KU2001-B",
        sectionCode: "Kelas B",
        capacity: 50,
        enrolled: 42,
        lecturer: "Dra. Endang S., M.Pd.",
        schedule: {
          day: "Senin",
          dayOfWeek: 1,
          start: 8,
          end: 10,
          duration: 2,
          room: "R. 204",
        },
      },
    ],
  },
  II4050: {
    courseId: "II4050",
    courseCode: "II4050",
    courseName: "Deep Learning",
    credits: 3,
    sections: [
      {
        sectionId: "II4050-A",
        sectionCode: "Kelas A",
        capacity: 35,
        enrolled: 31,
        lecturer: "Dr. Hendra Wijaya, M.Sc.",
        schedule: {
          day: "Kamis",
          dayOfWeek: 4,
          start: 13,
          end: 16,
          duration: 3,
          room: "Lab Komputasi 3",
        },
      },
      {
        sectionId: "II4050-B",
        sectionCode: "Kelas B",
        capacity: 35,
        enrolled: 25,
        lecturer: "Dr. Hendra Wijaya, M.Sc.",
        schedule: {
          day: "Jumat",
          dayOfWeek: 5,
          start: 8,
          end: 11,
          duration: 3,
          room: "Lab Komputasi 3",
        },
      },
    ],
  },
}

export function getOfferingForCourse(course: {
  id: string
  name: string
  code?: string
  credits: number
}): CourseOffering {
  const key = course.code || course.id
  if (CLASS_OFFERINGS_CATALOG[key]) {
    return CLASS_OFFERINGS_CATALOG[key]
  }
  if (CLASS_OFFERINGS_CATALOG[course.id]) {
    return CLASS_OFFERINGS_CATALOG[course.id]
  }

  // Deterministic generated fallback offering
  const hash = Array.from(course.id).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  )
  const duration = Math.min(Math.max(course.credits, 2), 3)
  const dayIndex1 = hash % 5
  const dayIndex2 = (hash + 2) % 5
  const start1 = 8 + (hash % 4) * 2 // 8, 10, 12, 14
  const start2 = 8 + ((hash + 1) % 4) * 2

  return {
    courseId: course.id,
    courseCode: course.code || course.id,
    courseName: course.name,
    credits: course.credits,
    sections: [
      {
        sectionId: `${course.id}-A`,
        sectionCode: "Kelas A",
        capacity: 40,
        enrolled: 30,
        lecturer: "Dosen Pengampu Utama, M.Kom.",
        schedule: {
          day: TIMETABLE_DAYS[dayIndex1],
          dayOfWeek: dayIndex1 + 1,
          start: start1,
          end: start1 + duration,
          duration,
          room: `R. FTMM ${(hash % 5) + 201}`,
        },
      },
      {
        sectionId: `${course.id}-B`,
        sectionCode: "Kelas B",
        capacity: 40,
        enrolled: 25,
        lecturer: "Dosen Pengampu Pendamping, M.T.",
        schedule: {
          day: TIMETABLE_DAYS[dayIndex2],
          dayOfWeek: dayIndex2 + 1,
          start: start2,
          end: start2 + duration,
          duration,
          room: `R. FTMM ${((hash + 1) % 5) + 201}`,
        },
      },
    ],
  }
}

export const SCHEDULE: ScheduleItem[] = [
  {
    id: 1,
    course: "Machine Learning",
    code: "II4042",
    sectionCode: "Kelas A",
    day: "Selasa",
    start: 10,
    duration: 2,
    color: "bg-teal/20 text-navy border-teal/50",
    room: "Lab Komputasi 1",
    lecturer: "Dr. Ir. Budi Santoso, M.Kom.",
  },
  {
    id: 2,
    course: "Data Visualization",
    code: "II4045",
    sectionCode: "Kelas A",
    day: "Selasa",
    start: 10,
    duration: 3,
    color: "bg-warning/20 text-navy border-warning/50",
    conflict: true,
    room: "Lab Komputasi 2",
    lecturer: "Ahmad Fauzi, S.Kom., M.Cs.",
  },
  {
    id: 3,
    course: "Kewarganegaraan",
    code: "KU2001",
    sectionCode: "Kelas A",
    day: "Rabu",
    start: 7,
    duration: 2,
    color: "bg-navy/10 text-navy border-navy/30",
    room: "R. 201",
    lecturer: "Drs. Sutrisno, M.Hum.",
  },
  {
    id: 4,
    course: "Deep Learning",
    code: "II4050",
    sectionCode: "Kelas A",
    day: "Kamis",
    start: 13,
    duration: 3,
    color: "bg-gold/20 text-navy border-gold/50",
    room: "Lab Komputasi 3",
    lecturer: "Dr. Hendra Wijaya, M.Sc.",
  },
]
