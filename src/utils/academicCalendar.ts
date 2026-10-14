/**
 * Utility to calculate current academic period and active week
 * based on UNAIR FTMM canonical academic calendar baseline.
 */

export interface AcademicContextInfo {
  academicYear: string
  term: "ganjil" | "genap" | "pendek"
  termDisplay: string
  weekDisplay: string
  isExamWeek?: boolean
}

export function getCurrentAcademicPeriod(
  currentDate: Date = new Date(),
): AcademicContextInfo {
  const month = currentDate.getMonth() + 1 // 1-12
  const fullYear = currentDate.getFullYear()

  // Academic calendar logic:
  // - Semester Ganjil: August to January (months 8, 9, 10, 11, 12, 1)
  // - Semester Genap: February to July (months 2, 3, 4, 5, 6, 7)
  const isGanjil = month >= 8 || month === 1
  const academicYear = isGanjil
    ? month === 1
      ? `${fullYear - 1}/${fullYear}`
      : `${fullYear}/${fullYear + 1}`
    : `${fullYear - 1}/${fullYear}`

  const termDisplay = isGanjil
    ? `Semester Ganjil ${academicYear}`
    : `Semester Genap ${academicYear}`

  // Estimate active academic week (1-16 weeks)
  // Sem Ganjil starts late August (~August 26)
  // Sem Genap starts mid February (~February 17)
  let semStart: Date
  if (isGanjil) {
    const startYear = month === 1 ? fullYear - 1 : fullYear
    semStart = new Date(startYear, 7, 26) // 26 August
  } else {
    semStart = new Date(fullYear, 1, 17) // 17 February
  }

  const diffMs = currentDate.getTime() - semStart.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekNum = Math.floor(diffDays / 7) + 1

  let weekDisplay = "Week 4"
  if (weekNum >= 1 && weekNum <= 16) {
    if (weekNum === 8) {
      weekDisplay = "Week 8 (Pekan UTS)"
    } else if (weekNum === 16) {
      weekDisplay = "Week 16 (Pekan UAS)"
    } else {
      weekDisplay = `Week ${weekNum}`
    }
  } else if (weekNum < 1) {
    weekDisplay = "Masa KRS / Persiapan"
  } else {
    weekDisplay = "Masa Evaluasi Semester"
  }

  return {
    academicYear,
    term: isGanjil ? "ganjil" : "genap",
    termDisplay,
    weekDisplay,
  }
}
