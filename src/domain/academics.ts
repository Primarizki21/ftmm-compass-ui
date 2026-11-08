export type AcademicTerm = "ganjil" | "genap"

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export const MAX_SKS_PER_SEMESTER = 24

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
