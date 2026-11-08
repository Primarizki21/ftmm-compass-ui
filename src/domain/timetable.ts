import type { ScheduleItem } from "../data"

export interface TimetableConflict {
  courseA: string
  codeA: string
  sectionA: string
  courseB: string
  codeB: string
  sectionB: string
  day: string
  start: number
  end: number
}

/**
 * Menandai `ScheduleItem.conflict` dan mengembalikan rincian bentrok. Satu
 * algoritma dipakai planner dan jadwal hasil impor.
 */
export function markConflicts(items: ScheduleItem[]): TimetableConflict[] {
  const conflicts: TimetableConflict[] = []

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const aEnd = a.start + a.duration
      const bEnd = b.start + b.duration
      if (a.day !== b.day || a.start >= bEnd || b.start >= aEnd) continue

      a.conflict = true
      b.conflict = true
      conflicts.push({
        courseA: a.course,
        codeA: a.code,
        sectionA: a.sectionCode || "Kelas",
        courseB: b.course,
        codeB: b.code,
        sectionB: b.sectionCode || "Kelas",
        day: a.day,
        start: Math.max(a.start, b.start),
        end: Math.min(aEnd, bEnd),
      })
    }
  }

  return conflicts
}
