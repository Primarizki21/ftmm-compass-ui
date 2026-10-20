import type { ScheduleItem } from "../data"
import { getCurrentAcademicPeriod } from "./academicCalendar"

const DAY_OFFSETS: Record<string, number> = {
  senin: 0,
  selasa: 1,
  rabu: 2,
  kamis: 3,
  jumat: 4,
  sabtu: 5,
}

function formatIcsDateTime(date: Date, hours: number, minutes = 0): string {
  const y = date.getFullYear().toString().padStart(4, "0")
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  const h = Math.floor(hours).toString().padStart(2, "0")
  const min = Math.floor(minutes).toString().padStart(2, "0")
  return `${y}${m}${d}T${h}${min}00`
}

function formatUtcTimestamp(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0")
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const d = date.getUTCDate().toString().padStart(2, "0")
  const h = date.getUTCHours().toString().padStart(2, "0")
  const min = date.getUTCMinutes().toString().padStart(2, "0")
  const s = date.getUTCSeconds().toString().padStart(2, "0")
  return `${y}${m}${d}T${h}${min}${s}Z`
}

function getNextSemesterMonday(): Date {
  const now = new Date()
  const period = getCurrentAcademicPeriod(now)
  const fullYear = now.getFullYear()
  const isGanjil = period.term === "ganjil"

  // Sem Ganjil reference start: late August (~26 Aug); Sem Genap: mid Feb (~17 Feb)
  const refStart = isGanjil
    ? new Date(now.getMonth() <= 1 ? fullYear - 1 : fullYear, 7, 26)
    : new Date(fullYear, 1, 17)

  // Align to Monday
  const day = refStart.getDay() // 0 = Sunday, 1 = Monday
  const diffToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  const monday = new Date(refStart)
  monday.setDate(refStart.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function generateIcsCalendar(
  schedule: ScheduleItem[],
  options?: {
    calendarName?: string
    semesterWeeks?: number
  },
): string {
  const calName = options?.calendarName || "Jadwal Perkuliahan FTMM UNAIR"
  const weeks = options?.semesterWeeks || 16
  const now = new Date()
  const dtStamp = formatUtcTimestamp(now)
  const semMonday = getNextSemesterMonday()

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FTMM UNAIR//FTMM Compass Academic Planner//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Asia/Jakarta",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Jakarta",
    "X-LIC-LOCATION:Asia/Jakarta",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0700",
    "TZOFFSETTO:+0700",
    "TZNAME:WIB",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ]

  schedule.forEach((item, index) => {
    const dayKey = item.day.toLowerCase().trim()
    const dayOffset = DAY_OFFSETS[dayKey] ?? 0

    const eventDate = new Date(semMonday)
    eventDate.setDate(semMonday.getDate() + dayOffset)

    const dtStart = formatIcsDateTime(eventDate, item.start)
    const dtEnd = formatIcsDateTime(eventDate, item.start + item.duration)
    const uid = `ftmm-${item.code || "mk"}-${item.sectionCode || index}-${dayKey}-${item.start}@compass.ftmm.unair.ac.id`

    const summary = `[${item.code}] ${item.course}${
      item.sectionCode ? ` (${item.sectionCode})` : ""
    }`
    const description = [
      `Mata Kuliah: ${item.course}`,
      `Kode: ${item.code}`,
      `Kelas: ${item.sectionCode || "-"}`,
      `Dosen: ${item.lecturer || "Dosen Pengampu FTMM"}`,
      `Ruang: ${item.room || "-"}`,
      `Durasi: ${item.duration} Jam Perkuliahan`,
    ].join("\\n")

    const location = item.room
      ? `${item.room}, Kampus C MERR FTMM Universitas Airlangga`
      : "Fakultas Teknologi Maju dan Multidisiplin, Universitas Airlangga"

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=Asia/Jakarta:${dtStart}`,
      `DTEND;TZID=Asia/Jakarta:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    )
  })

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function exportTimetableToIcs(
  schedule: ScheduleItem[],
  filename = "jadwal-kuliah-ftmm.ics",
): boolean {
  if (typeof window === "undefined" || schedule.length === 0) {
    return false
  }

  try {
    const icsString = generateIcsCalendar(schedule)
    const blob = new Blob([icsString], {
      type: "text/calendar;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}
