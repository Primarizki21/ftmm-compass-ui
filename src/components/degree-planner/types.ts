import { type Course } from "../../data"
import { isOddSemester } from "../../domain/academics"

export interface PlacedCourse extends Course {
  status: "completed" | "planned"
}

export const INITIAL_PLAN: Record<number, PlacedCourse[]> = {
  1: [
    {
      id: "MA1101",
      name: "Matematika I",
      credits: 4,
      semester: 1,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "completed",
    },
    {
      id: "FI1101",
      name: "Fisika Dasar I",
      credits: 4,
      semester: 1,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "completed",
    },
  ],
  2: [
    {
      id: "MA1201",
      name: "Matematika II",
      credits: 4,
      semester: 2,
      type: "Wajib",
      desc: "",
      parity: "even",
      status: "completed",
    },
    {
      id: "IF1210",
      name: "Dasar Pemrograman",
      credits: 3,
      semester: 2,
      type: "Wajib",
      desc: "",
      parity: "even",
      status: "completed",
    },
  ],
  5: [
    {
      id: "II4042",
      name: "Machine Learning",
      credits: 3,
      semester: 5,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "planned",
    },
    {
      id: "II4045",
      name: "Data Visualization",
      credits: 3,
      semester: 5,
      type: "Pilihan",
      desc: "",
      parity: "odd",
      status: "planned",
    },
  ],
  6: [
    {
      id: "II4050",
      name: "Deep Learning",
      credits: 3,
      semester: 6,
      type: "Pilihan",
      desc: "",
      parity: "even",
      status: "planned",
    },
  ],
}

export const isCompleted = (c: PlacedCourse): boolean =>
  c.status === "completed"

export const isSemLocked = (c: PlacedCourse): boolean => c.type === "Wajib"

export const canDrop = (
  course: PlacedCourse,
  targetSem: number,
  fromSem: number | "bank",
): boolean => {
  if (isCompleted(course)) return false
  if (fromSem === targetSem) return true
  if (isSemLocked(course)) return false
  if (course.parity === "odd" && !isOddSemester(targetSem)) return false
  if (course.parity === "even" && isOddSemester(targetSem)) return false
  return true
}
export type SemesterState = "idle" | "valid-hover" | "invalid" | "invalid-hover"

export type Tab = "roadmap" | "timetable"

export interface DegreePlannerProps {
  onNavigate?: (
    page: string,
    options?: {
      tab?: Tab
      course?: Course
    },
  ) => void
  initialTab?: Tab
}
