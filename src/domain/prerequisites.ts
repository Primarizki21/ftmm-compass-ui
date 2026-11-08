import type { Course, PrerequisiteNode } from "../data"

export interface PlannedCourse {
  id: string
  code?: string
  name: string
  status: string
}

export interface PrerequisiteStatus {
  node: PrerequisiteNode
  status: "satisfied" | "warning" | "missing" | "administrative"
  detail: string
}

interface Placement {
  semester: number
  status: string
}

interface PlacementIndex {
  prior: Map<string, Placement>
  later: Map<string, Placement>
}

function placementIndex(
  plan: Record<number, PlannedCourse[]>,
  currentSemester: number,
): PlacementIndex {
  const prior = new Map<string, Placement>()
  const later = new Map<string, Placement>()

  for (const [semesterKey, courses] of Object.entries(plan)) {
    const semester = Number(semesterKey)
    const target = semester < currentSemester ? prior : later
    for (const course of courses) {
      const placement = { semester, status: course.status }
      const keys = [course.id, course.name]
      if (course.code) keys.push(course.code)
      for (const key of keys) target.set(key.toLowerCase(), placement)
    }
  }

  return { prior, later }
}

/** Status tiap prasyarat terhadap posisi mata kuliah di rencana studi. */
export function evaluatePrerequisites(
  course: Course,
  plan: Record<number, PlannedCourse[]>,
  currentSemester: number,
): PrerequisiteStatus[] {
  const { prior, later } = placementIndex(plan, currentSemester)

  return (course.prerequisites ?? []).map((node) => {
    if (node.isAdministrative) {
      return {
        node,
        status: "administrative",
        detail: `Syarat administratif: ${node.name}`,
      }
    }

    const keys = [node.id.toLowerCase(), node.name.toLowerCase()]
    const priorMatch = keys
      .map((key) => prior.get(key))
      .find((match) => match !== undefined)
    if (priorMatch) {
      return {
        node,
        status: "satisfied",
        detail: `Terpenuhi di Semester ${priorMatch.semester} (${
          priorMatch.status === "completed" ? "Lulus" : "Direncanakan"
        })`,
      }
    }

    const laterMatch = keys
      .map((key) => later.get(key))
      .find((match) => match !== undefined)
    if (laterMatch) {
      return {
        node,
        status: "warning",
        detail: `Terjadwal di Semester ${laterMatch.semester} (tidak mendahului semester ${currentSemester})`,
      }
    }

    return {
      node,
      status: "missing",
      detail: `Belum terjadwal di semester 1–${Math.max(1, currentSemester - 1)}`,
    }
  })
}
