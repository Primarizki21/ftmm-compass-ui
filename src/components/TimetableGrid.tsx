import React from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { cn } from "../utils"
import type { ScheduleItem } from "../data"

const HOURS = Array.from({ length: 10 }, (_, i) => i + 7)

interface TimetableGridProps {
  schedule: ScheduleItem[]
  days: string[]
  compact?: boolean
  onNavigate?: (page: string) => void
}

export default function TimetableGrid({
  schedule,
  days,
  compact,
  onNavigate,
}: TimetableGridProps) {
  const hasConflict = schedule.some((s) => s.conflict)

  return (
    <>
      {/* Conflict banner — above grid in full mode */}
      {!compact && hasConflict && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 mb-5 flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-danger">
              Terdeteksi Bentrok Jadwal
            </h4>
            <p className="text-sm text-danger/80 mt-1">
              <strong>II4042 Machine Learning</strong> dan{" "}
              <strong>II4045 Data Visualization</strong> bentrok pada hari
              Selasa jam 10:00 – 12:00.
            </p>
          </div>
          <button className="text-sm font-medium text-danger hover:underline flex-shrink-0">
            Lihat Alternatif
          </button>
        </div>
      )}

      {/* Timetable grid */}
      <div
        className={cn(
          "overflow-auto",
          !compact &&
            "flex-1 bg-surface border border-border rounded-xl shadow-sm relative",
        )}
        style={compact ? { maxHeight: "420px" } : undefined}
      >
        <div
          className={cn(
            "flex flex-col",
            compact ? "min-w-[640px]" : "min-w-[800px] h-full",
          )}
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
                <div key={hour} className="h-16 relative">
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
            <div className="flex-1 flex relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2NEgxMDAwMCIgc3Ryb2tlPSIjZTllY2VmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
              {days.map((day) => (
                <div
                  key={day}
                  className="flex-1 border-r border-border/50 last:border-r-0 relative"
                >
                  {schedule
                    .filter((s) => s.day === day)
                    .map((item) => {
                      const top = (item.start - 7) * 64
                      const height = item.duration * 64
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "absolute left-1 right-1 rounded-md p-2 border shadow-sm flex flex-col overflow-hidden",
                            item.color,
                            item.conflict &&
                              "border-danger border-dashed bg-danger/10 z-10 animate-pulse",
                          )}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          {item.conflict && (
                            <div className="absolute top-1 right-1 text-danger">
                              <AlertTriangle className="w-3 h-3" />
                            </div>
                          )}
                          <span
                            className={cn(
                              "font-mono font-bold opacity-80",
                              compact ? "text-[9px]" : "text-xs",
                            )}
                          >
                            {item.code}
                          </span>
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
        <div className="px-5 pb-5">
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-danger font-medium">
                Bentrok jadwal terdeteksi
              </p>
              <p className="text-xs text-danger/70 mt-0.5">
                <span className="font-mono font-bold">II4042</span> Machine
                Learning dan <span className="font-mono font-bold">II4045</span>{" "}
                Data Visualization bentrok Selasa 10:00–12:00
              </p>
            </div>
            <button
              onClick={() => onNavigate?.("degree-planner")}
              className="text-xs font-medium text-danger hover:underline flex-shrink-0 whitespace-nowrap"
            >
              Perbaiki &rarr;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
