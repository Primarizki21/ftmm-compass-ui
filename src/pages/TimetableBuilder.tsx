import React from "react"
import { AlertTriangle, Download, Printer } from "lucide-react"
import { cn } from "../utils"
import { SCHEDULE } from "../data"

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7) // 7:00 to 16:00

export default function TimetableBuilder() {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Warning Banner */}
      <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-danger">Terdeteksi Bentrok Jadwal</h4>
          <p className="text-sm text-danger/80 mt-1">
            <strong>II4042 Machine Learning</strong> dan{" "}
            <strong>II4045 Data Visualization</strong> bentrok pada hari Selasa
            jam 10:00 - 12:00.
          </p>
        </div>
        <button className="text-sm font-medium text-danger hover:underline">
          Lihat Alternatif Kelas
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="font-heading font-bold text-lg text-navy">
            Jadwal Mingguan
          </h3>
          <p className="text-sm text-muted">Semester Ganjil 2024/2025</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-surface">
            <Printer className="w-4 h-4" /> Cetak
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light">
            <Download className="w-4 h-4" /> Ekspor ICS
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 bg-surface border border-border rounded-xl shadow-sm overflow-auto relative">
        <div className="min-w-[800px] h-full flex flex-col">
          {/* Header Row */}
          <div className="flex border-b border-border bg-background/50 sticky top-0 z-20">
            <div className="w-16 border-r border-border flex-shrink-0"></div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex-1 p-3 text-center border-r border-border font-heading font-bold text-navy text-sm last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 flex relative">
            {/* Time Column */}
            <div className="w-16 border-r border-border flex flex-col flex-shrink-0 bg-background/50 sticky left-0 z-10">
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 relative">
                  <span className="absolute -top-2.5 right-2 text-xs font-mono text-muted">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div className="flex-1 flex relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2NEgxMDAwMCIgc3Ryb2tlPSIjZTllY2VmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 border-r border-border/50 last:border-r-0 relative"
                >
                  {SCHEDULE.filter((s) => s.day === day).map((item) => {
                    const top = (item.start - 7) * 64 // 64px per hour
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
                        <span className="font-mono text-xs font-bold opacity-80">
                          {item.code}
                        </span>
                        <span className="font-medium text-sm leading-tight mt-0.5 line-clamp-2">
                          {item.course}
                        </span>
                        <span className="text-xs mt-auto opacity-70">
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
    </div>
  )
}
