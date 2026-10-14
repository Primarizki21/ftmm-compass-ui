import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
} from "lucide-react"
import { cn } from "../../utils"
import { CourseOffering, getOfferingForCourse } from "../../data"
import { PlacedCourse } from "./types"

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

interface ClassSelectorPanelProps {
  activeSemester: number
  semesterCourses: PlacedCourse[]
  selectedSections: Record<string, string>
  onSelectSection: (courseId: string, sectionId: string) => void
  conflicts: TimetableConflict[]
  onAutoResolveConflicts?: () => void
}

export default function ClassSelectorPanel({
  activeSemester,
  semesterCourses,
  selectedSections,
  onSelectSection,
  conflicts,
  onAutoResolveConflicts,
}: ClassSelectorPanelProps) {
  const offerings: CourseOffering[] = semesterCourses.map((c) =>
    getOfferingForCourse(c),
  )

  const conflictingCourseIds = new Set<string>()
  conflicts.forEach((c) => {
    conflictingCourseIds.add(c.codeA)
    conflictingCourseIds.add(c.codeB)
  })

  const totalCredits = semesterCourses.reduce((sum, c) => sum + c.credits, 0)
  const selectedCount = semesterCourses.filter((c) =>
    Boolean(selectedSections[c.id]),
  ).length

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-xs p-4 sm:p-5 flex flex-col h-full">
      {/* Panel Header */}
      <div className="pb-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-navy" />
            <h3 className="font-heading font-bold text-base text-navy">
              Pilihan Kelas Semester {activeSemester}
            </h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-navy/8 text-navy border border-navy/15">
              {totalCredits} SKS Total
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Pilih section kelas perkuliahan aktif untuk menata jadwal mingguan
            dan mencegah bentrok.
          </p>
        </div>

        {/* Conflict Badge & Auto Resolve */}
        <div className="flex items-center gap-2">
          {conflicts.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-danger/10 text-danger border border-danger/25">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conflicts.length} Bentrok Jadwal
              </span>
              {onAutoResolveConflicts && (
                <button
                  type="button"
                  onClick={onAutoResolveConflicts}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-navy text-white hover:bg-navy-light transition-colors flex items-center gap-1 cursor-pointer"
                  title="Pilih kombinasi kelas yang tidak bentrok secara otomatis"
                >
                  <RotateCcw className="w-3 h-3 text-gold" />
                  Auto-Resolve
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal/15 text-navy border border-teal/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
              Bebas Bentrok
            </span>
          )}
        </div>
      </div>

      {/* Course List & Section Selectors */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-0.5">
        {semesterCourses.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl">
            <Calendar className="w-8 h-8 text-muted/40 mb-2" />
            <p className="text-xs font-medium text-navy">
              Belum ada mata kuliah di Semester {activeSemester}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Tambahkan matkul di tab Roadmap Studi terlebih dahulu.
            </p>
          </div>
        ) : (
          offerings.map((offering) => {
            const placedCourse = semesterCourses.find(
              (c) =>
                c.id === offering.courseId || c.code === offering.courseCode,
            )
            const currentSectionId =
              selectedSections[offering.courseId] ||
              offering.sections[0]?.sectionId ||
              ""
            const hasConflict = conflictingCourseIds.has(offering.courseCode)

            return (
              <div
                key={offering.courseId}
                className={cn(
                  "p-3.5 rounded-xl border transition-all",
                  hasConflict
                    ? "bg-danger/4 border-danger/40 ring-1 ring-danger/20"
                    : "bg-background border-border/80 hover:border-gold/50",
                )}
              >
                {/* Course Header Row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-navy bg-navy/8 px-1.5 py-0.5 rounded">
                        {offering.courseCode}
                      </span>
                      <span className="text-[11px] font-mono text-muted">
                        {offering.credits} SKS
                      </span>
                      {placedCourse?.type && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border text-navy">
                          {placedCourse.type}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {offering.courseName}
                    </h4>
                  </div>

                  {hasConflict && (
                    <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-3 h-3" />
                      Bentrok
                    </span>
                  )}
                </div>

                {/* Section Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {offering.sections.map((sec) => {
                    const isSelected = currentSectionId === sec.sectionId

                    return (
                      <button
                        key={sec.sectionId}
                        type="button"
                        onClick={() =>
                          onSelectSection(offering.courseId, sec.sectionId)
                        }
                        className={cn(
                          "p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                          isSelected
                            ? "bg-navy text-white border-navy shadow-2xs font-medium"
                            : "bg-surface border-border hover:border-navy/30 text-foreground",
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={cn(
                              "font-bold text-xs",
                              isSelected ? "text-gold" : "text-navy",
                            )}
                          >
                            {sec.sectionCode}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-mono",
                              isSelected ? "text-white/80" : "text-muted",
                            )}
                          >
                            {sec.enrolled}/{sec.capacity} Mhs
                          </span>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            isSelected ? "text-white" : "text-foreground",
                          )}
                        >
                          <Clock
                            className={cn(
                              "w-3 h-3 flex-shrink-0",
                              isSelected ? "text-gold" : "text-muted",
                            )}
                          />
                          <span className="font-medium">
                            {sec.schedule.day},{" "}
                            {sec.schedule.start.toString().padStart(2, "0")}:00
                            – {sec.schedule.end.toString().padStart(2, "0")}:00
                          </span>
                        </div>

                        <div
                          className={cn(
                            "flex items-center justify-between text-[11px] pt-1 border-t",
                            isSelected
                              ? "border-white/15 text-white/80"
                              : "border-border/60 text-muted",
                          )}
                        >
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {sec.schedule.room}
                          </span>
                          {sec.lecturer && (
                            <span
                              className="truncate max-w-[110px] text-[10px]"
                              title={sec.lecturer}
                            >
                              {sec.lecturer.split(",")[0]}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Panel Footer Summary */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
        <span>
          Terpilih: <strong className="text-navy">{selectedCount}</strong> dari{" "}
          {semesterCourses.length} matkul
        </span>
        <span className="font-mono text-[11px]">
          {conflicts.length === 0
            ? "Jadwal Valid"
            : `${conflicts.length} Konflik Perlu Dibenahi`}
        </span>
      </div>
    </div>
  )
}
