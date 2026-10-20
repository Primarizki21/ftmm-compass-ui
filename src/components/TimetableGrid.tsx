import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Share2,
  Check,
  Download,
  Printer,
  Sparkles,
} from "lucide-react"
import { cn } from "../utils"
import type { ScheduleItem } from "../data"
import {
  copyTimetableShareUrl,
  getSharedTimetableFromLocation,
} from "../utils/timetableShare"
import { exportTimetableToIcs } from "../utils/icsExport"

const HOURS = Array.from({ length: 10 }, (_, i) => i + 7)

interface TimetableGridProps {
  schedule: ScheduleItem[]
  days: readonly string[]
  compact?: boolean
  semester?: number
  onNavigate?: (
    page: string,
    options?: {
      tab?: "roadmap" | "timetable"
      course?: unknown
    },
  ) => void
  onItemClick?: (item: ScheduleItem) => void
  onLoadSharedSchedule?: (items: ScheduleItem[], semester?: number) => void
  showActions?: boolean
}

export default function TimetableGrid({
  schedule,
  days,
  compact,
  semester,
  onNavigate,
  onItemClick,
  onLoadSharedSchedule,
  showActions = true,
}: TimetableGridProps) {
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [sharedData, setSharedData] = useState<{
    schedule: ScheduleItem[]
    semester?: number
  } | null>(null)

  // Auto-read shared timetable from URL on mount
  useEffect(() => {
    const shared = getSharedTimetableFromLocation()
    if (shared && shared.schedule.length > 0) {
      setSharedData(shared)
      onLoadSharedSchedule?.(shared.schedule, shared.semester)
    }
  }, [onLoadSharedSchedule])

  const displayedSchedule = sharedData ? sharedData.schedule : schedule
  const conflictingItems = displayedSchedule.filter((s) => s.conflict)
  const hasConflict = conflictingItems.length > 0
  const rowHeight = compact ? 38 : 44

  const handleCopyLink = async () => {
    const res = await copyTimetableShareUrl(displayedSchedule, semester)
    if (res.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportIcs = () => {
    const ok = exportTimetableToIcs(
      displayedSchedule,
      `jadwal-kuliah-ftmm${semester ? `-sem${semester}` : ""}.ics`,
    )
    if (ok) {
      setExported(true)
      setTimeout(() => setExported(false), 2000)
    }
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const handleDismissShared = () => {
    setSharedData(null)
    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("timetable")
    ) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      )
    }
  }

  return (
    <>
      {/* Printable Header — Visible ONLY when printing */}
      <div className="hidden print:block mb-4 border-b-2 border-navy pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-heading text-navy">
              UNIVERSITAS AIRLANGGA
            </h1>
            <h2 className="text-sm font-semibold text-navy/90">
              FAKULTAS TEKNOLOGI MAJU DAN MULTIDISIPLIN
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Jadwal Perkuliahan Mahasiswa{" "}
              {semester ? `• Semester ${semester}` : "• Semester Aktif"}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <p className="font-semibold text-navy">FTMM Compass Timetable</p>
            <p>
              {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
            </p>
          </div>
        </div>
      </div>

      {/* Shared Timetable Banner */}
      {sharedData && (
        <div className="bg-teal/15 border border-teal/40 rounded-xl p-3 mb-3 flex items-center justify-between gap-3 text-xs text-navy flex-shrink-0 print:hidden animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-dark flex-shrink-0" />
            <span>
              <strong>Jadwal Dimuat dari Tautan Berbagi:</strong> Menampilkan{" "}
              {sharedData.schedule.length} kelas terjadwal.
            </span>
          </div>
          <button
            onClick={handleDismissShared}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border text-navy font-semibold hover:bg-navy/5 cursor-pointer transition-colors"
          >
            Kembali ke Jadwal Default
          </button>
        </div>
      )}

      {/* Timetable Action Bar (Sharing, Export ICS, Print/PDF) */}
      {!compact && showActions && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-navy bg-navy/5 border border-navy/15 px-2.5 py-1 rounded-lg">
              {displayedSchedule.length} Kelas Terdaftar
            </span>
            {hasConflict && (
              <span className="text-xs font-semibold text-danger bg-danger/10 border border-danger/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conflictingItems.length} Bentrok
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Share URL Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Salin tautan jadwal ke clipboard ala NUSMods"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                copied
                  ? "bg-teal/20 text-navy border-teal/50"
                  : "bg-surface hover:bg-navy/5 text-navy border-border hover:border-navy/30",
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-navy" />
                  <span>Tautan Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Salin Tautan Jadwal</span>
                </>
              )}
            </button>

            {/* Export ICS Button */}
            <button
              type="button"
              onClick={handleExportIcs}
              title="Ekspor ke iCalendar (.ics) untuk Google Calendar / Apple Calendar"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                exported
                  ? "bg-gold/20 text-navy border-gold/50"
                  : "bg-surface hover:bg-navy/5 text-navy border-border hover:border-navy/30",
              )}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exported ? "Terekspor!" : "Ekspor (.ics)"}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              title="Cetak jadwal atau simpan sebagai dokumen PDF"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-navy text-white hover:bg-navy-light border-navy flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Jadwal / Simpan PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Conflict banner — above grid in full mode */}
      {!compact && hasConflict && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 mb-4 flex-shrink-0 print:hidden">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-danger text-sm">
              Terdeteksi Bentrok Jadwal Kuliah ({conflictingItems.length}{" "}
              Matkul)
            </h4>
            <p className="text-xs text-danger/80 mt-1">
              {conflictingItems
                .map((c) => `${c.code} (${c.sectionCode || "Kelas"})`)
                .join(" dan ")}{" "}
              memiliki irisan waktu kuliah pada hari yang sama. Silakan pilih
              kelas alternatif di panel pemilihan kelas.
            </p>
          </div>
        </div>
      )}

      {/* Timetable grid */}
      <div
        className={cn(
          "overflow-auto print-timetable-surface",
          !compact
            ? "flex-1 bg-surface border border-border rounded-xl shadow-xs relative"
            : "bg-surface relative",
        )}
      >
        <div
          className={cn("flex flex-col w-full min-w-0", !compact && "h-full")}
        >
          {/* Header Row */}
          <div className="flex border-b border-border bg-background/50 sticky top-0 z-20">
            <div
              className={cn(
                "border-r border-border flex-shrink-0",
                compact ? "w-14" : "w-16",
              )}
            />
            {days.map((day) => (
              <div
                key={day}
                className={cn(
                  "flex-1 text-center border-r border-border font-heading font-bold text-navy last:border-r-0",
                  compact ? "p-2.5 text-xs" : "p-3 text-sm",
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className={cn("flex relative", !compact && "flex-1")}>
            {/* Time Column */}
            <div
              className={cn(
                "border-r border-border flex flex-col flex-shrink-0 bg-background/50 sticky left-0 z-10",
                compact ? "w-14" : "w-16",
              )}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${rowHeight}px` }}
                  className="relative"
                >
                  <span
                    className={cn(
                      "absolute font-mono text-muted",
                      compact
                        ? "-top-2 right-1.5 text-[10px]"
                        : "-top-2.5 right-2 text-xs",
                    )}
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div
              className="flex-1 flex relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='${rowHeight}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 ${rowHeight}H10000' stroke='%23e9ecef' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
              }}
            >
              {days.map((day) => (
                <div
                  key={day}
                  className="flex-1 border-r border-border/50 last:border-r-0 relative"
                >
                  {displayedSchedule
                    .filter((s) => s.day === day)
                    .map((item) => {
                      const top = (item.start - 7) * rowHeight
                      const height = item.duration * rowHeight
                      return (
                        <div
                          key={item.id}
                          onClick={() => onItemClick?.(item)}
                          className={cn(
                            "absolute left-1 right-1 rounded-md p-2 border shadow-2xs flex flex-col overflow-hidden transition-all",
                            item.color,
                            item.conflict &&
                              "border-danger border-dashed bg-danger/15 z-10 ring-1 ring-danger/30",
                            onItemClick && "cursor-pointer hover:shadow-md",
                          )}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          {item.conflict && (
                            <div className="absolute top-1 right-1 text-danger">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span
                              className={cn(
                                "font-mono font-bold opacity-80",
                                compact ? "text-[9px]" : "text-xs",
                              )}
                            >
                              {item.code}
                            </span>
                            {item.sectionCode && (
                              <span
                                className={cn(
                                  "font-bold px-1 py-0.2 rounded bg-navy/10 text-navy",
                                  compact ? "text-[8px]" : "text-[9px]",
                                )}
                              >
                                {item.sectionCode}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "font-medium leading-tight mt-0.5 line-clamp-2",
                              compact ? "text-xs" : "text-sm",
                            )}
                          >
                            {item.course}
                          </span>
                          <span
                            className={cn(
                              "mt-auto opacity-70",
                              compact ? "text-[10px]" : "text-xs",
                            )}
                          >
                            {item.room}
                          </span>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conflict banner — below grid in compact mode */}
      {compact && hasConflict && (
        <div className="px-5 pb-5 print:hidden">
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-danger font-medium">
                Bentrok jadwal terdeteksi ({conflictingItems.length} Matkul)
              </p>
              <p className="text-xs text-danger/70 mt-0.5">
                {conflictingItems
                  .map(
                    (c) =>
                      `${c.code} ${c.sectionCode ? `(${c.sectionCode})` : ""}`,
                  )
                  .join(" dan ")}{" "}
                memiliki jam kuliah bertabrakan.
              </p>
            </div>
            <button
              onClick={() =>
                onNavigate?.("degree-planner", { tab: "timetable" })
              }
              className="text-xs font-medium text-danger hover:underline flex-shrink-0 whitespace-nowrap cursor-pointer"
            >
              Perbaiki &rarr;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
