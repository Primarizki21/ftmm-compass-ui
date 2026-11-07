import { type Course } from "../../data"
import { isOddSemester } from "../../domain/academics"

export interface PlacedCourse extends Course {
  status: "completed" | "planned"
}

export const INITIAL_PLAN: Record<number, PlacedCourse[]> = {}

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
