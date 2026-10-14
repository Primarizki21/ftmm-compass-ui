import { useEffect } from "react"
import {
  X,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ExternalLink,
  Trash2,
  GraduationCap,
  Layers,
} from "lucide-react"
import { cn } from "../../utils"
import { PlacedCourse, isCompleted, isOdd } from "./types"

interface CoursePlacementInfo {
  sem: number
  status: string
}

interface CourseInspectModalProps {
  course: PlacedCourse | null
  currentSem: number
  allPlan: Record<number, PlacedCourse[]>
  onClose: () => void
  onToggleStatus?: (
    courseId: string,
    sem: number,
    newStatus: "planned" | "wishlist",
  ) => void
  onDeleteCourse?: (courseId: string, sem: number) => void
  onOpenInCourseFinder?: (course: PlacedCourse) => void
}

export default function CourseInspectModal({
  course,
  currentSem,
  allPlan,
  onClose,
  onToggleStatus,
  onDeleteCourse,
  onOpenInCourseFinder,
}: CourseInspectModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!course) return null

  const completed = isCompleted(course)

  // Map courses taken before target semester
  const priorCourses = new Map<string, CoursePlacementInfo>()
  const sameOrLaterCourses = new Map<string, CoursePlacementInfo>()

  Object.entries(allPlan).forEach(([semStr, list]) => {
    const semNum = Number(semStr)
    list.forEach((c) => {
      const keyId = c.id.toLowerCase()
      const keyCode = c.code ? c.code.toLowerCase() : ""
      const keyName = c.name.toLowerCase()

      const item = { sem: semNum, status: c.status }
      if (semNum < currentSem) {
        priorCourses.set(keyId, item)
        if (keyCode) priorCourses.set(keyCode, item)
        priorCourses.set(keyName, item)
      } else {
        sameOrLaterCourses.set(keyId, item)
        if (keyCode) sameOrLaterCourses.set(keyCode, item)
        sameOrLaterCourses.set(keyName, item)
      }
    })
  })

  // Evaluate prerequisites
  const prereqNodes = course.prerequisites || []
  const evaluatedPrereqs = prereqNodes.map((node) => {
    const idKey = node.id.toLowerCase()
    const nameKey = node.name.toLowerCase()

    const priorMatch = priorCourses.get(idKey) || priorCourses.get(nameKey)
    if (priorMatch) {
      return {
        node,
        status: "satisfied" as const,
        detail: `Terpenuhi di Semester ${priorMatch.sem} (${
          priorMatch.status === "completed" ? "Lulus" : "Direncanakan"
        })`,
      }
    }

    const laterMatch =
      sameOrLaterCourses.get(idKey) || sameOrLaterCourses.get(nameKey)
    if (laterMatch) {
      return {
        node,
        status: "warning" as const,
        detail: `Terjadwal di Semester ${laterMatch.sem} (tidak mendahului semester ${currentSem})`,
      }
    }

    return {
      node,
      status: "missing" as const,
      detail: `Belum terjadwal di semester 1–${Math.max(1, currentSem - 1)}`,
    }
  })

  const hasPrereqIssues = evaluatedPrereqs.some((p) => p.status !== "satisfied")

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-inspect-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-background/50 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              {course.prodiAbbr && (
                <span
                  className="font-mono text-[9px] font-bold text-white bg-navy px-1.5 py-0.5 rounded tracking-wide"
                  title={`Program: ${course.program}`}
                >
                  {course.prodiAbbr}
                </span>
              )}
              <span className="font-mono text-xs font-bold text-navy bg-navy/8 px-2 py-0.5 rounded">
                {course.code || course.id}
              </span>
              {course.category === "pdb_univ" && (
                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                  PDB Universitas
                </span>
              )}
              {course.category === "pdb_saintek" && (
                <span className="text-[10px] font-bold bg-teal/20 text-navy border border-teal/40 px-1.5 py-0.5 rounded">
                  PDB Saintek
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded",
                  course.type === "Wajib"
                    ? "bg-navy/10 text-navy"
                    : "bg-gold/15 text-navy",
                )}
              >
                {course.type}
              </span>
            </div>

            <h3
              id="course-inspect-title"
              className="font-heading font-bold text-lg text-foreground leading-snug"
            >
              {course.name}
            </h3>

            <p className="text-xs text-muted mt-1 flex items-center gap-2">
              <span>
                {course.program || "Fakultas Teknologi Maju dan Multidisiplin"}
              </span>
              <span>&bull;</span>
              <span className="font-medium text-navy">
                Penempatan: Semester {currentSem} (
                {isOdd(currentSem) ? "Ganjil" : "Genap"})
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-navy/5 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Tutup jendela informasi mata kuliah"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background rounded-xl p-3 border border-border">
              <span className="text-[10px] font-medium text-muted block mb-1">
                Bobot SKS
              </span>
              <span className="font-heading font-bold text-base text-navy flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gold" />
                {course.credits} SKS
              </span>
            </div>

            <div className="bg-background rounded-xl p-3 border border-border">
              <span className="text-[10px] font-medium text-muted block mb-1">
                Term Kurikulum
              </span>
              <span className="font-heading font-bold text-base text-navy flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal" />
                Sem {course.semester} (
                {course.parity === "odd" ? "Ganjil" : "Genap"})
              </span>
            </div>

            <div className="bg-background rounded-xl p-3 border border-border">
              <span className="text-[10px] font-medium text-muted block mb-1">
                Status Rencana
              </span>
              <span
                className={cn(
                  "font-heading font-bold text-xs uppercase px-2 py-1 rounded inline-flex items-center gap-1",
                  course.status === "completed" && "bg-teal/15 text-navy",
                  course.status === "planned" && "bg-gold/15 text-navy",
                  course.status === "wishlist" &&
                    "bg-navy/10 text-navy border border-dashed border-border",
                )}
              >
                {course.status === "completed" && "Lulus"}
                {course.status === "planned" && "Direncanakan"}
                {course.status === "wishlist" && "Wishlist"}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-navy" />
              Deskripsi Silabus
            </h4>
            <p className="text-xs leading-relaxed text-foreground bg-background rounded-xl p-3.5 border border-border">
              {course.desc ||
                "Mata kuliah ini mencakup kompetensi inti pemahaman teori, analisis metode, dan studi kasus terapan sesuai kurikulum standar FTMM Universitas Airlangga."}
            </p>
          </div>

          {/* Academic Workload */}
          {course.workload && (
            <div>
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-navy" />
                Distribusi Jam & Beban Belajar
              </h4>
              <div className="bg-background rounded-xl p-3 border border-border flex items-center justify-around text-center text-xs">
                <div>
                  <span className="text-muted block text-[10px]">
                    Kuliah Teori
                  </span>
                  <span className="font-bold text-navy font-mono">
                    {course.workload.lectureCredits} SKS
                  </span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-muted block text-[10px]">
                    Praktikum / Lab
                  </span>
                  <span className="font-bold text-navy font-mono">
                    {course.workload.labCredits} SKS
                  </span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-muted block text-[10px]">
                    Total Waktu/Minggu
                  </span>
                  <span className="font-bold text-navy font-mono">
                    ~{course.workload.hours} Jam
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Prerequisite Inspection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-muted flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-navy" />
                Validasi Prasyarat Akademik
              </h4>
              <span className="text-[10px] font-mono text-muted">
                {evaluatedPrereqs.length} Prasyarat
              </span>
            </div>

            {evaluatedPrereqs.length === 0 ? (
              <div className="p-3 rounded-xl bg-teal/5 border border-teal/20 text-navy text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0" />
                <span>
                  Tidak ada mata kuliah prasyarat wajib untuk mengambil mata
                  kuliah ini.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {evaluatedPrereqs.map((item, idx) => (
                  <div
                    key={`${item.node.id}-${idx}`}
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors",
                      item.status === "satisfied" &&
                        "bg-teal/5 border-teal/30 text-navy",
                      item.status === "warning" &&
                        "bg-warning/10 border-warning/30 text-navy",
                      item.status === "missing" &&
                        "bg-danger/5 border-danger/30 text-danger",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px]">
                          {item.node.id}
                        </span>
                        <span className="font-medium text-foreground">
                          {item.node.name}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {item.detail}
                      </p>
                    </div>

                    <span className="flex-shrink-0 mt-0.5">
                      {item.status === "satisfied" && (
                        <CheckCircle2 className="w-4 h-4 text-teal" />
                      )}
                      {item.status === "warning" && (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      )}
                      {item.status === "missing" && (
                        <AlertTriangle className="w-4 h-4 text-danger" />
                      )}
                    </span>
                  </div>
                ))}

                {hasPrereqIssues && (
                  <p className="text-[11px] text-danger/90 italic mt-1">
                    * Perhatian: Mengambil matkul sebelum prasyarat selesai
                    berpotensi melanggar aturan KRS FTMM.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 border-t border-border bg-background/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!completed && onToggleStatus && (
              <button
                type="button"
                onClick={() => {
                  const targetStatus =
                    course.status === "wishlist" ? "planned" : "wishlist"
                  onToggleStatus(course.id, currentSem, targetStatus)
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface text-navy hover:bg-navy/5 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-gold" />
                {course.status === "wishlist"
                  ? "Tandai Direncanakan"
                  : "Pindahkan ke Wishlist"}
              </button>
            )}

            {!completed && onDeleteCourse && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCourse(course.id, currentSem)
                  onClose()
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onOpenInCourseFinder && (
              <button
                type="button"
                onClick={() => {
                  onOpenInCourseFinder(course)
                  onClose()
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy text-white hover:bg-navy-light shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Buka di Course Finder</span>
                <ExternalLink className="w-3.5 h-3.5 text-gold" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted hover:text-navy hover:bg-navy/5 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
