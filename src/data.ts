export interface PrerequisiteNode {
  id: string
  name: string
  prereqs?: { id: string name: string }[]
}

export interface WorkloadInfo {
  hours: number
  lectureCredits: number
  labCredits: number
}

export interface Course {
  id: string
  /** Official course code (e.g. EF401); differs from id when ids are program-scoped. */
  code?: string
  /** Owning study program, set for courses loaded from the curriculum catalog. */
  program?: string
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  desc: string
  parity: "odd" | "even"
  prerequisites?: PrerequisiteNode[]
  workload?: WorkloadInfo
}

export const TIMETABLE_DAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
] as const
export interface ScheduleItem {
  id: number
  course: string
  code: string
  day: string
  start: number
  duration: number
  color: string
  conflict?: boolean
  room: string
}

export const SCHEDULE: ScheduleItem[] = [
  {
    id: 1,
    course: "Machine Learning",
    code: "II4042",
    day: "Selasa",
    start: 10,
    duration: 2,
    color: "bg-teal/20 text-navy border-teal/50",
    room: "Lab Komputasi 1",
  },
  {
    id: 2,
    course: "Data Visualization",
    code: "II4045",
    day: "Selasa",
    start: 10,
    duration: 3,
    color: "bg-warning/20 text-navy border-warning/50",
    conflict: true,
    room: "Lab Komputasi 2",
  },
  {
    id: 3,
    course: "Kewarganegaraan",
    code: "KU2001",
    day: "Rabu",
    start: 7,
    duration: 2,
    color: "bg-navy/10 text-navy border-navy/30",
    room: "R. 201",
  },
  {
    id: 4,
    course: "Deep Learning",
    code: "II4050",
    day: "Kamis",
    start: 13,
    duration: 3,
    color: "bg-gold/20 text-navy border-gold/50",
    room: "Lab Komputasi 3",
  },
]
