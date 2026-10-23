import type { ScheduleItem } from "../data"

export interface CompactScheduleEntry {
  c: string // code
  n: string // course name
  d: string // day
  s: number // start hour
  l: number // duration (length)
  r?: string // room
  k?: string // sectionCode
  t?: string // lecturer
  clr?: string // color class
}

export interface TimetableSharePayload {
  v: 1
  sem?: number
  items: CompactScheduleEntry[]
}

export interface DeserializedTimetableResult {
  schedule: ScheduleItem[]
  semester?: number
}

export interface CopyShareUrlResult {
  success: boolean
  url: string
}

const COLOR_PALETTE = [
  "bg-teal/20 text-navy border-teal/50",
  "bg-gold/20 text-navy border-gold/50",
  "bg-navy/10 text-navy border-navy/30",
  "bg-purple-100 text-purple-900 border-purple-300",
  "bg-blue-100 text-blue-900 border-blue-300",
  "bg-emerald-100 text-emerald-900 border-emerald-300",
]

function toBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str)
  let binary = ""
  const len = utf8Bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(utf8Bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4 !== 0) {
    base64 += "="
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export function serializeTimetable(
  schedule: ScheduleItem[],
  semester?: number,
): string {
  const payload: TimetableSharePayload = {
    v: 1,
    sem: semester,
    items: schedule.map((item) => ({
      c: item.code,
      n: item.course,
      d: item.day,
      s: item.start,
      l: item.duration,
      r: item.room || "",
      k: item.sectionCode || "",
      t: item.lecturer || "",
      clr: item.color || "",
    })),
  }

  const jsonStr = JSON.stringify(payload)
  return toBase64Url(jsonStr)
}

export function deserializeTimetable(
  encoded: string,
): DeserializedTimetableResult | null {
  try {
    const raw = fromBase64Url(encoded)
    const data = JSON.parse(raw) as TimetableSharePayload

    if (!data || !Array.isArray(data.items)) {
      return null
    }

    const items: ScheduleItem[] = data.items.map((item, idx) => ({
      id: `${item.c || "MK"}-${item.k || idx}-${item.d}-${item.s}`,
      code: item.c || "",
      course: item.n || item.c || "Mata Kuliah",
      day: item.d || "Senin",
      start: Number(item.s) || 8,
      duration: Number(item.l) || 2,
      room: item.r || "R. FTMM",
      sectionCode: item.k || undefined,
      lecturer: item.t || undefined,
      color: item.clr || COLOR_PALETTE[idx % COLOR_PALETTE.length],
      conflict: false,
    }))

    // Detect conflicts among items
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        const aEnd = a.start + a.duration
        const bEnd = b.start + b.duration
        if (a.day === b.day && a.start < bEnd && b.start < aEnd) {
          a.conflict = true
          b.conflict = true
        }
      }
    }

    return {
      schedule: items,
      semester: data.sem,
    }
  } catch {
    return null
  }
}

export function generateTimetableShareUrl(
  schedule: ScheduleItem[],
  semester?: number,
): string {
  const token = serializeTimetable(schedule, semester)
  if (typeof window === "undefined") {
    return `#timetable=${token}`
  }
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#timetable=${token}`
}

export function getSharedTimetableFromLocation(): DeserializedTimetableResult | null {
  if (typeof window === "undefined") return null

  // Check URL hash first (#timetable=... or #tt=...)
  const hash = window.location.hash
  if (hash) {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""))
    const ttToken = hashParams.get("timetable") || hashParams.get("tt")
    if (ttToken) {
      const res = deserializeTimetable(ttToken)
      if (res) return res
    }
  }

  // Check URL query string (?timetable=... or ?tt=...)
  const searchParams = new URLSearchParams(window.location.search)
  const queryToken = searchParams.get("timetable") || searchParams.get("tt")
  if (queryToken) {
    const res = deserializeTimetable(queryToken)
    if (res) return res
  }

  return null
}

export async function copyTimetableShareUrl(
  schedule: ScheduleItem[],
  semester?: number,
): Promise<CopyShareUrlResult> {
  const url = generateTimetableShareUrl(schedule, semester)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return { success: true, url }
    }
    // Fallback if clipboard API not available
    const textarea = document.createElement("textarea")
    textarea.value = url
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textarea)
    return { success, url }
  } catch {
    return { success: false, url }
  }
}
