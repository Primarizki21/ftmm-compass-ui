export type AcademicTerm = "ganjil" | "genap"

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export const MAX_SKS_PER_SEMESTER = 24

export const SEMESTER_WEEKS = 16

/** Batas SKS semester berikutnya menurut IPS (SOP Akademik FTMM UNAIR). */
export const SKS_CAP_BY_IPS = [
  { minIps: 3, sks: 24, label: "IPS ≥ 3.00" },
  { minIps: 2.5, sks: 21, label: "2.50–2.99" },
  { minIps: 2, sks: 18, label: "2.00–2.49" },
  { minIps: 0, sks: 15, label: "< 2.00" },
] as const

export function isOddSemester(semester: number): boolean {
  return semester % 2 === 1
}

export function parityOfSemester(semester: number): "odd" | "even" {
  return isOddSemester(semester) ? "odd" : "even"
}

export function termOfSemester(semester: number): AcademicTerm {
  return isOddSemester(semester) ? "ganjil" : "genap"
}

export interface AcademicPeriod {
  academicYear: string
  term: AcademicTerm
  termDisplay: string
  weekDisplay: string
}

/** Awal semester baseline FTMM: 26 Agustus (ganjil) dan 17 Februari (genap). */
export function semesterStart(term: AcademicTerm, reference: Date): Date {
  const year = reference.getFullYear()
  const month = reference.getMonth() + 1
  return term === "ganjil"
    ? new Date(month === 1 ? year - 1 : year, 7, 26)
    : new Date(year, 1, 17)
}

/** Senin pertama pada atau setelah awal semester berjalan (dipakai ekspor ICS). */
export function semesterStartMonday(reference: Date = new Date()): Date {
  const start = semesterStart(termOf(reference), reference)
  const day = start.getDay()
  const monday = new Date(start)
  monday.setDate(start.getDate() + (day === 0 ? 1 : day === 1 ? 0 : 8 - day))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function termOf(reference: Date): AcademicTerm {
  const month = reference.getMonth() + 1
  return month >= 8 || month === 1 ? "ganjil" : "genap"
}

export function currentAcademicPeriod(
  reference: Date = new Date(),
): AcademicPeriod {
  const month = reference.getMonth() + 1
  const year = reference.getFullYear()
  const term = termOf(reference)
  const academicYear =
    term === "ganjil"
      ? month === 1
        ? `${year - 1}/${year}`
        : `${year}/${year + 1}`
      : `${year - 1}/${year}`

  const start = semesterStart(term, reference)
  const week =
    Math.floor((reference.getTime() - start.getTime()) / 86_400_000 / 7) + 1

  let weekDisplay: string
  if (week < 1) {
    weekDisplay = "Masa KRS / Persiapan"
  } else if (week > SEMESTER_WEEKS) {
    weekDisplay = "Masa Evaluasi Semester"
  } else if (week === 8) {
    weekDisplay = "Week 8 (Pekan UTS)"
  } else if (week === SEMESTER_WEEKS) {
    weekDisplay = `Week ${SEMESTER_WEEKS} (Pekan UAS)`
  } else {
    weekDisplay = `Week ${week}`
  }

  return {
    academicYear,
    term,
    termDisplay: `Semester ${
      term === "ganjil" ? "Ganjil" : "Genap"
    } ${academicYear}`,
    weekDisplay,
  }
}
