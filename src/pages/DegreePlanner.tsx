import React, { useState, useEffect, useMemo } from "react"
import {
  GripVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Lock,
  X,
  Calendar,
  Sparkles,
  RotateCcw,
  Search,
  Plus,
  Bookmark,
  Check,
} from "lucide-react"
import { cn } from "../utils"
import { Course, SCHEDULE } from "../data"
import { ALL_COURSES, PROGRAMS, fetchCatalog } from "../courseData"
import TimetableGrid from "../components/TimetableGrid"

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]
const TIMETABLE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]

export interface PlacedCourse extends Course {
  status: "completed" | "planned" | "wishlist"
}

const INITIAL_PLAN: Record<number, PlacedCourse[]> = {
  1: [
    {
      id: "MA1101",
      name: "Matematika I",
      credits: 4,
      semester: 1,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "completed",
    },
    {
      id: "FI1101",
      name: "Fisika Dasar I",
      credits: 4,
      semester: 1,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "completed",
    },
  ],
  2: [
    {
      id: "MA1201",
      name: "Matematika II",
      credits: 4,
      semester: 2,
      type: "Wajib",
      desc: "",
      parity: "even",
      status: "completed",
    },
    {
      id: "IF1210",
      name: "Dasar Pemrograman",
      credits: 3,
      semester: 2,
      type: "Wajib",
      desc: "",
      parity: "even",
      status: "completed",
    },
  ],
  5: [
    {
      id: "II4042",
      name: "Machine Learning",
      credits: 3,
      semester: 5,
      type: "Wajib",
      desc: "",
      parity: "odd",
      status: "planned",
    },
    {
      id: "II4045",
      name: "Data Visualization",
      credits: 3,
      semester: 5,
      type: "Pilihan",
      desc: "",
      parity: "odd",
      status: "planned",
    },
  ],
  6: [
    {
      id: "II4050",
      name: "Deep Learning",
      credits: 3,
      semester: 6,
      type: "Pilihan",
      desc: "",
      parity: "even",
      status: "wishlist",
    },
  ],
}

// Completed courses are locked; Wajib courses cannot change semester (intra-semester reordering only)
const isCompleted = (c: PlacedCourse) => c.status === "completed"
const isSemLocked = (c: PlacedCourse) =>
  c.type === "Wajib" && c.status !== "wishlist"

interface DegreePlannerProps {
  pendingCourses: Course[]
  setPendingCourses: React.Dispatch<React.SetStateAction<Course[]>>
  customPlan?: Record<number, PlacedCourse[]> | null
  appliedSummary?: {
    program_studi: string
    total_credits: number
    target_semester: number
    focus_tracks: string[]
    note?: string
  } | null
  onResetPlan?: () => void
}

type SemesterState = "idle" | "valid-hover" | "invalid" | "invalid-hover"
type Tab = "roadmap" | "timetable"

export default function DegreePlanner({
  pendingCourses,
  setPendingCourses,
  customPlan,
  appliedSummary,
  onResetPlan,
}: DegreePlannerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("roadmap")
  const [plan, setPlan] = useState<Record<number, PlacedCourse[]>>(
    customPlan || INITIAL_PLAN,
  )

  useEffect(() => {
    setPlan(customPlan || INITIAL_PLAN)
  }, [customPlan])
  const [pickerSem, setPickerSem] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState("")
  const [pickerProgram, setPickerProgram] = useState<string>("all")
  const [pickerType, setPickerType] = useState<"all" | "Pilihan" | "Wajib">(
    "all",
  )
  const [pickerStatus, setPickerStatus] = useState<"planned" | "wishlist">(
    "planned",
  )
  const [catalog, setCatalog] = useState<Course[]>(ALL_COURSES)
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(PROGRAMS)

  useEffect(() => {
    let isMounted = true
    fetchCatalog().then((res) => {
      if (!isMounted || !res) return
      if (res.courses?.length) {
        setCatalog(res.courses)
      }
      if (res.programs && res.programs.length > 0) {
        setAvailablePrograms(res.programs)
      } else if (res.courses?.length) {
        const derived = Array.from(
          new Set(
            res.courses.map((c) => c.program).filter(Boolean) as string[],
          ),
        ).sort((a, b) => a.localeCompare(b))
        if (derived.length > 0) setAvailablePrograms(derived)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Map course ID to semester where it is currently placed
  const placedMap = useMemo(() => {
    const map = new Map<string, number>()
    Object.entries(plan).forEach(([semStr, list]) => {
      list.forEach((c) => map.set(c.id, Number(semStr)))
    })
    return map
  }, [plan])

  // Close modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerSem(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleAddCourseFromModal = (course: Course) => {
    if (pickerSem === null) return
    const finalStatus = course.type === "Wajib" ? "planned" : pickerStatus
    const newCourse: PlacedCourse = {
      ...course,
      semester: pickerSem,
      status: finalStatus,
    }
    setPlan((prev) => ({
      ...prev,
      [pickerSem]: [...(prev[pickerSem] || []), newCourse],
    }))
    setPendingCourses((prev) => prev.filter((c) => c.id !== course.id))
  }
  const [dragging, setDragging] = useState<{
    course: PlacedCourse
    fromSem: number | "bank"
    fromIndex?: number
  } | null>(null)
  const [hoverSem, setHoverSem] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    sem: number
    index: number
  } | null>(null)

  // Auto-place Wajib courses into their designated semester; Pilihan stays in bank
  useEffect(() => {
    const wajibCourses = pendingCourses.filter((c) => c.type === "Wajib")
    if (wajibCourses.length === 0) return

    setPlan((prev) => {
      const next = { ...prev }
      wajibCourses.forEach((course) => {
        const sem = course.semester
        if (!next[sem]) next[sem] = []
        if (!next[sem].find((c) => c.id === course.id)) {
          next[sem] = [...next[sem], { ...course, status: "planned" }]
        }
      })
      return next
    })
    setPendingCourses((prev) => prev.filter((c) => c.type !== "Wajib"))
  }, [pendingCourses])

  const isOdd = (sem: number) => sem % 2 === 1

  const canDrop = (
    course: PlacedCourse,
    targetSem: number,
    fromSem: number | "bank",
  ): boolean => {
    if (isCompleted(course)) return false
    // Intra-semester reorder is always valid for both Wajib and Pilihan
    if (fromSem === targetSem) return true
    // Wajib courses cannot move to another semester
    if (isSemLocked(course)) return false
    // Pilihan courses must match semester parity
    if (course.parity === "odd" && !isOdd(targetSem)) return false
    if (course.parity === "even" && isOdd(targetSem)) return false
    return true
  }

  const semState = (sem: number): SemesterState => {
    if (!dragging) return "idle"
    const valid = canDrop(dragging.course, sem, dragging.fromSem)
    const hovering = hoverSem === sem
    if (!valid) return hovering ? "invalid-hover" : "invalid"
    return hovering ? "valid-hover" : "idle"
  }

  const handleDragStart = (
    e: React.DragEvent,
    course: PlacedCourse,
    from: number | "bank",
    fromIndex?: number,
  ) => {
    setDragging({ course, fromSem: from, fromIndex })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleCardDragOver = (e: React.DragEvent, sem: number, idx: number) => {
    if (!dragging) return
    if (!canDrop(dragging.course, sem, dragging.fromSem)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    const rect = e.currentTarget.getBoundingClientRect()
    const insertAfter = e.clientY > rect.top + rect.height / 2
    setHoverSem(sem)
    setDropTarget({ sem, index: insertAfter ? idx + 1 : idx })
  }

  const handleCardDrop = (e: React.DragEvent, sem: number, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const insertAfter = e.clientY > rect.top + rect.height / 2
    const targetIdx = insertAfter ? idx + 1 : idx
    handleDrop(e, sem, targetIdx)
  }
  const handleDragOver = (e: React.DragEvent, sem: number) => {
    if (!dragging) return
    if (canDrop(dragging.course, sem, dragging.fromSem)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
    }
    setHoverSem(sem)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setHoverSem(null)
      setDropTarget(null)
    }
  }

  const handleDrop = (
    e: React.DragEvent,
    sem: number,
    explicitTargetIndex?: number,
  ) => {
    e.preventDefault()
    if (!dragging || !canDrop(dragging.course, sem, dragging.fromSem)) return

    const { course, fromSem, fromIndex } = dragging
    const targetIdx =
      explicitTargetIndex !== undefined
        ? explicitTargetIndex
        : dropTarget?.sem === sem
          ? dropTarget.index
          : plan[sem]?.length || 0

    if (fromSem === sem) {
      // Intra-semester reordering (atas-bawah)
      setPlan((prev) => {
        const currentList = [...(prev[sem] || [])]
        const fromIdx =
          fromIndex !== undefined
            ? fromIndex
            : currentList.findIndex((c) => c.id === course.id)
        if (fromIdx === -1) return prev
        const [removed] = currentList.splice(fromIdx, 1)
        let insertAt =
          explicitTargetIndex !== undefined
            ? explicitTargetIndex
            : dropTarget?.sem === sem
              ? dropTarget.index
              : currentList.length
        if (insertAt > fromIdx) {
          insertAt -= 1
        }
        insertAt = Math.max(0, Math.min(insertAt, currentList.length))
        currentList.splice(insertAt, 0, removed)
        return { ...prev, [sem]: currentList }
      })
    } else if (fromSem === "bank") {
      // Drop from Bank Matkul Pilihan
      setPendingCourses((prev) => prev.filter((c) => c.id !== course.id))
      setPlan((prev) => {
        const currentList = [...(prev[sem] || [])]
        const insertAt = Math.max(0, Math.min(targetIdx, currentList.length))
        currentList.splice(insertAt, 0, {
          ...course,
          semester: sem,
          status: course.status || "planned",
        })
        return { ...prev, [sem]: currentList }
      })
    } else {
      // Cross-semester move (Pilihan)
      setPlan((prev) => {
        const sourceList = (prev[fromSem] || []).filter(
          (c) => c.id !== course.id,
        )
        const targetList = [...(prev[sem] || [])]
        const insertAt = Math.max(0, Math.min(targetIdx, targetList.length))
        targetList.splice(insertAt, 0, {
          ...course,
          semester: sem,
          status: course.status || "planned",
        })
        return {
          ...prev,
          [fromSem]: sourceList,
          [sem]: targetList,
        }
      })
    }

    setDragging(null)
    setHoverSem(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDragging(null)
    setHoverSem(null)
    setDropTarget(null)
  }

  const deleteCourse = (courseId: string, sem: number) => {
    setPlan((prev) => ({
      ...prev,
      [sem]: (prev[sem] || []).filter((c) => c.id !== courseId),
    }))
  }

  const pilihanPending = pendingCourses.filter((c) => c.type === "Pilihan")

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 bg-background p-1 rounded-xl border border-border w-fit flex-shrink-0">
        {([
          { key: "roadmap", label: "Roadmap Studi", icon: BookOpen },
          { key: "timetable", label: "Jadwal Aktif", icon: Calendar },
        ] as const).map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-navy text-white shadow-sm"
                  : "text-muted hover:text-navy",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── TAB: Roadmap Studi ─── */}
      {activeTab === "roadmap" && (
        <>
          {/* AI Generated Plan Banner */}
          {appliedSummary && (
            <div className="mb-4 p-4 bg-teal/15 border border-teal/40 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy text-gold rounded-lg shadow-sm">
                  <Sparkles className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-navy flex items-center gap-2">
                    Rencana Studi Personalisasi Compass AI
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-navy text-white rounded-full">
                      {appliedSummary.program_studi}
                    </span>
                  </h4>
                  <p className="text-xs text-muted">
                    Target Lulus:{" "}
                    <strong>Semester {appliedSummary.target_semester}</strong> •
                    Total Beban:{" "}
                    <strong>{appliedSummary.total_credits} SKS</strong> • Fokus:{" "}
                    <strong>{appliedSummary.focus_tracks.join(", ")}</strong>
                  </p>
                </div>
              </div>
              {onResetPlan && (
                <button
                  onClick={onResetPlan}
                  className="px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/10 rounded-lg transition-colors flex items-center gap-1.5 border border-navy/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              )}
            </div>
          )}

          <div className="mb-4 flex justify-between items-end flex-shrink-0">
            <div>
              <h3 className="font-heading font-bold text-lg text-navy mb-1">
                Rencana Studi (Roadmap)
              </h3>
              <p className="text-sm text-muted">
                Matkul <span className="font-medium text-navy">Wajib</span>{" "}
                otomatis terkunci di semesternya. Matkul{" "}
                <span className="font-medium text-navy">Pilihan</span> dapat
                dipindah-pindah.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {[
                {
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal" />,
                  label: "Selesai",
                  badge: "Lulus (Terkunci)",
                  badgeStyle: "bg-teal/10 text-navy border-teal/30",
                },
                {
                  icon: <Lock className="w-3.5 h-3.5 text-muted/70" />,
                  label: "Wajib",
                  badge: "Urutan Atas/Bawah (Tetap di Sem)",
                  badgeStyle: "bg-navy/8 text-navy border-navy/20",
                },
                {
                  icon: <Clock className="w-3.5 h-3.5 text-gold" />,
                  label: "Direncanakan",
                  badge: "Geser Sem & Atas/Bawah ⋮⋮",
                  badgeStyle: "bg-gold/15 text-navy border-gold/40",
                },
                {
                  icon: <Bookmark className="w-3.5 h-3.5 text-muted" />,
                  label: "Wishlist",
                  badge: "Geser Sem, Atas/Bawah & Hapus",
                  badgeStyle:
                    "bg-surface text-muted border-dashed border-border",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs shadow-2xs"
                >
                  {item.icon}
                  <span className="font-semibold text-navy">{item.label}</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded border leading-none font-medium",
                      item.badgeStyle,
                    )}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Drag hint */}
          {dragging && (
            <div className="mb-3 p-3 bg-navy/5 border border-navy/15 rounded-lg flex items-center gap-3 text-sm flex-shrink-0 animate-in fade-in duration-150">
              <GripVertical className="w-4 h-4 text-navy/40" />
              <span className="text-navy">
                <strong>{dragging.course.name}</strong>
                {isSemLocked(dragging.course) ? (
                  <>
                    {" "}
                    — matkul <strong>Wajib</strong>: hanya dapat diatur urutan
                    (atas/bawah) di <strong>Semester {dragging.fromSem}</strong>
                    .
                  </>
                ) : (
                  <>
                    {" "}
                    — matkul <strong>Pilihan</strong>: dapat dipindah ke
                    semester{" "}
                    <strong>
                      {dragging.course.parity === "odd"
                        ? "ganjil (1, 3, 5, 7)"
                        : "genap (2, 4, 6, 8)"}
                    </strong>{" "}
                    dan diatur urutan atas/bawah.
                  </>
                )}
              </span>
            </div>
          )}

          {/* Semester Columns */}
          <div className="flex-1 overflow-x-auto pb-1 min-h-0">
            <div className="flex gap-4 min-w-max h-full">
              {SEMESTERS.map((sem) => {
                const courses = plan[sem] || []
                const totalSKS = courses.reduce((acc, c) => acc + c.credits, 0)
                const state = semState(sem)
                const odd = isOdd(sem)

                return (
                  <div
                    key={sem}
                    className={cn(
                      "w-[256px] rounded-xl flex flex-col flex-shrink-0 border transition-all duration-150",
                      state === "idle" && "bg-background border-border",
                      state === "valid-hover" &&
                        "bg-teal/5 border-teal ring-2 ring-teal/25 shadow-lg",
                      state === "invalid" &&
                        "bg-foreground/3 border-border/70 opacity-55",
                      state === "invalid-hover" &&
                        "bg-danger/5 border-danger/40",
                    )}
                    onDragOver={(e) => handleDragOver(e, sem)}
                    onDrop={(e) => handleDrop(e, sem)}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Header */}
                    <div
                      className={cn(
                        "p-3 border-b rounded-t-xl flex justify-between items-center transition-colors",
                        state === "valid-hover"
                          ? "bg-teal/10 border-teal/30"
                          : "bg-surface border-border",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-bold text-navy text-sm">
                          Semester {sem}
                        </h4>
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                            odd
                              ? "bg-teal/10 text-navy"
                              : "bg-gold/10 text-navy",
                          )}
                        >
                          {odd ? "Ganjil" : "Genap"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted bg-background px-2 py-0.5 rounded">
                        {totalSKS} SKS
                      </span>
                    </div>

                    {/* Invalid warning */}
                    {(state === "invalid" || state === "invalid-hover") &&
                      dragging && (
                        <div
                          className={cn(
                            "mx-2 mt-2 p-2 rounded-lg flex items-center gap-1.5 text-[11px] font-medium",
                            state === "invalid-hover"
                              ? "bg-danger/10 text-danger border border-danger/25"
                              : "bg-muted/8 text-muted",
                          )}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          {isSemLocked(dragging.course)
                            ? `Khusus Semester ${dragging.fromSem}`
                            : `Hanya semester ${
                                dragging.course.parity === "odd"
                                  ? "ganjil"
                                  : "genap"
                              }`}
                        </div>
                      )}

                    {/* Course cards */}
                    <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]">
                      {courses.map((course, idx) => {
                        const completed = isCompleted(course)
                        const semLocked = isSemLocked(course)
                        const isDropTargetTop =
                          dropTarget?.sem === sem && dropTarget?.index === idx
                        return (
                          <div
                            key={course.id}
                            draggable={!completed}
                            onDragStart={
                              !completed
                                ? (e) => handleDragStart(e, course, sem, idx)
                                : undefined
                            }
                            onDragOver={(e) => handleCardDragOver(e, sem, idx)}
                            onDrop={(e) => handleCardDrop(e, sem, idx)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "p-3 rounded-lg border bg-surface flex flex-col group transition-all select-none relative",
                              completed
                                ? "cursor-default opacity-85"
                                : "cursor-move hover:cursor-move hover:shadow-md",
                              course.status === "completed" &&
                                "border-teal-light/50",
                              course.status === "planned" &&
                                !semLocked &&
                                "border-gold/50",
                              course.status === "planned" &&
                                semLocked &&
                                "border-navy/20",
                              course.status === "wishlist" &&
                                "border-dashed border-border",
                              isDropTargetTop &&
                                "border-t-2 border-t-teal shadow-md",
                            )}
                          >
                            {/* Header: Grip/Status + Kode MK di KIRI, Badges Tipe & Status di KANAN — SEMUA HORIZONTAL */}
                            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-border/40">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                  {completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                                  ) : (
                                    <GripVertical className="w-3.5 h-3.5 text-muted/50 opacity-60 group-hover:opacity-100 group-hover:text-navy transition-all" />
                                  )}
                                </div>
                                <span className="font-mono text-[11px] font-bold text-navy leading-none tracking-tight">
                                  {course.code || course.id}
                                </span>
                              </div>

                              {/* Badges horizontal: Tipe (Wajib/Pilihan) + Status (Lulus/Wishlist/Direncanakan) */}
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 flex-shrink-0 transition-opacity duration-150",
                                  !completed &&
                                    "group-hover:opacity-0 pointer-events-none",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded leading-none flex items-center gap-1",
                                    course.type === "Wajib"
                                      ? "bg-navy/8 text-navy"
                                      : "bg-gold/15 text-navy",
                                  )}
                                >
                                  {course.type === "Wajib" && (
                                    <Lock className="w-2.5 h-2.5 text-navy/70" />
                                  )}
                                  {course.type}
                                </span>

                                {course.status === "completed" && (
                                  <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal/15 text-navy leading-none flex items-center gap-1 font-medium">
                                    Lulus
                                  </span>
                                )}
                                {course.status === "wishlist" && (
                                  <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-dashed border-border text-muted leading-none flex items-center gap-1">
                                    <Bookmark className="w-2.5 h-2.5 text-muted" />
                                    Wishlist
                                  </span>
                                )}
                                {course.status === "planned" && !completed && (
                                  <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Body: Course Name */}
                            <h5 className="font-medium text-xs leading-snug text-foreground mb-1.5 line-clamp-2">
                              {course.name}
                            </h5>

                            {/* Footer: SKS */}
                            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                              <span>{course.credits} SKS</span>
                              {course.program && (
                                <span className="text-[9px] text-muted/70 truncate max-w-[120px]">
                                  {course.program}
                                </span>
                              )}
                            </div>

                            {/* Delete button — available for all non-completed courses, zero overlap with status icon */}
                            {!completed && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteCourse(course.id, sem)
                                }}
                                title="Hapus dari rencana semester"
                                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-background border border-border text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/30 opacity-0 group-hover:opacity-100 transition-all z-10"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}

                      {courses.length === 0 && (
                        <div
                          className={cn(
                            "h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-3 text-center transition-colors",
                            state === "valid-hover"
                              ? "border-teal/50 bg-teal/5 text-navy"
                              : "border-border text-muted",
                          )}
                        >
                          <p className="text-xs">
                            {state === "valid-hover"
                              ? "Lepaskan di sini"
                              : "Tarik matkul ke sini"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-border bg-surface rounded-b-xl flex-shrink-0">
                      <button
                        onClick={() => {
                          setPickerSem(sem)
                          setPickerSearch("")
                        }}
                        className="w-full py-1.5 text-xs font-semibold text-navy bg-navy/5 hover:bg-navy/10 rounded-lg border border-dashed border-navy/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Manual
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Course Bank — only Pilihan */}
          {pilihanPending.length > 0 && (
            <div className="border-t border-border pt-4 mt-3 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-4 h-4 text-navy" />
                <h4 className="font-heading font-bold text-sm text-navy">
                  Bank Matkul Pilihan
                </h4>
                <span className="text-xs font-mono text-muted bg-background border border-border px-2 py-0.5 rounded">
                  {pilihanPending.length} matkul
                </span>
                <p className="text-xs text-muted">
                  — Tarik ke semester yang sesuai
                </p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {pilihanPending.map((course) => (
                  <div
                    key={course.id}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(
                        e,
                        { ...course, status: "planned" } as PlacedCourse,
                        "bank",
                      )
                    }
                    onDragEnd={handleDragEnd}
                    className="bg-surface rounded-xl border border-gold/40 p-3 cursor-move flex-shrink-0 w-[196px] group hover:shadow-md hover:border-gold transition-all select-none"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-teal">
                        {course.code || course.id}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h5 className="font-medium text-xs text-navy leading-tight">
                      {course.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted">
                        {course.credits} SKS
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ml-auto",
                          course.parity === "odd"
                            ? "bg-teal/10 text-navy"
                            : "bg-gold/10 text-navy",
                        )}
                      >
                        {course.parity === "odd" ? "Ganjil" : "Genap"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Jadwal Aktif ─── */}
      {activeTab === "timetable" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-4 flex justify-between items-end flex-shrink-0">
            <div>
              <h3 className="font-heading font-bold text-lg text-navy">
                Jadwal Mingguan
              </h3>
              <p className="text-sm text-muted">Semester Ganjil 2024/2025</p>
            </div>
          </div>
          <TimetableGrid schedule={SCHEDULE} days={TIMETABLE_DAYS} />
        </div>
      )}
      {/* ─── MODAL: Tambah Matkul Manual ─── */}
      {pickerSem !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPickerSem(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-start justify-between bg-background/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-lg text-navy">
                    Tambah Matkul ke Semester {pickerSem}
                  </h3>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                      isOdd(pickerSem)
                        ? "bg-teal/15 text-navy border border-teal/30"
                        : "bg-gold/15 text-navy border border-gold/40",
                    )}
                  >
                    {isOdd(pickerSem) ? "Semester Ganjil" : "Semester Genap"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Menampilkan katalog matkul dengan periode{" "}
                  <strong>{isOdd(pickerSem) ? "ganjil" : "genap"}</strong>{" "}
                  sesuai aturan kurikulum FTMM.
                </p>
              </div>
              <button
                onClick={() => setPickerSem(null)}
                className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-navy/5 transition-colors"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            {(() => {
              const targetParity = isOdd(pickerSem) ? "odd" : "even"
              const q = pickerSearch.toLowerCase().trim()

              // Base pool filtered by semester rule, program, and search query
              const basePool = catalog.filter((c) => {
                // Wajib courses must match the exact target semester; Pilihan courses match semester parity (odd/even)
                if (c.type === "Wajib") {
                  if (c.semester !== pickerSem) return false
                } else {
                  if (c.parity !== targetParity) return false
                }
                if (pickerProgram !== "all" && c.program !== pickerProgram)
                  return false
                if (q) {
                  const matchName = c.name.toLowerCase().includes(q)
                  const matchId = c.id.toLowerCase().includes(q)
                  const matchCode = c.code
                    ? c.code.toLowerCase().includes(q)
                    : false
                  if (!matchName && !matchId && !matchCode) return false
                }
                return true
              })

              const pilihanCount = basePool.filter(
                (c) => c.type === "Pilihan",
              ).length
              const wajibCount = basePool.filter(
                (c) => c.type === "Wajib",
              ).length

              const filtered = basePool
                .filter((c) =>
                  pickerType === "all" ? true : c.type === pickerType,
                )
                .sort((a, b) => {
                  const aExact = a.semester === pickerSem ? 0 : 1
                  const bExact = b.semester === pickerSem ? 0 : 1
                  if (aExact !== bExact) return aExact - bExact
                  return a.name.localeCompare(b.name)
                })

              return (
                <>
                  <div className="p-4 border-b border-border bg-surface space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Search */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Cari nama matkul atau kode (misal: Data, II40, Fisika)..."
                          className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-teal/30 focus:border-teal text-foreground"
                          autoFocus
                        />
                        {pickerSearch && (
                          <button
                            onClick={() => setPickerSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                            aria-label="Hapus pencarian"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Program Studi Selector */}
                      <select
                        aria-label="Filter Program Studi"
                        value={pickerProgram}
                        onChange={(e) => setPickerProgram(e.target.value)}
                        className="text-xs py-2 px-3 rounded-lg border border-border bg-background text-navy font-medium focus:outline-hidden focus:ring-2 focus:ring-teal/30 focus:border-teal sm:w-[240px]"
                      >
                        <option value="all">Semua Program Studi</option>
                        {availablePrograms.map((prog) => (
                          <option key={prog} value={prog}>
                            {prog}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter & Add Status Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {/* Type Filter */}
                      <div
                        role="group"
                        aria-label="Filter tipe mata kuliah"
                        className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border"
                      >
                        {([
                          {
                            key: "all",
                            label: "Semua Tipe",
                            count: basePool.length,
                          },
                          {
                            key: "Pilihan",
                            label: "Pilihan",
                            count: pilihanCount,
                          },
                          {
                            key: "Wajib",
                            label: `Wajib Sem ${pickerSem}`,
                            count: wajibCount,
                          },
                        ] as const).map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setPickerType(t.key)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5",
                              pickerType === t.key
                                ? "bg-navy text-white shadow-2xs font-semibold"
                                : "text-muted hover:text-navy",
                            )}
                          >
                            <span>{t.label}</span>
                            <span
                              className={cn(
                                "text-[9px] font-mono px-1.5 py-0.2 rounded-full",
                                pickerType === t.key
                                  ? "bg-white/20 text-white"
                                  : "bg-surface text-muted border border-border",
                              )}
                            >
                              {t.count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Add Status Toggle */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted text-[11px] font-medium">
                          Tambahkan sebagai:
                        </span>
                        <div
                          role="group"
                          aria-label="Status penambahan mata kuliah"
                          className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border"
                        >
                          <button
                            type="button"
                            onClick={() => setPickerStatus("planned")}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                              pickerStatus === "planned"
                                ? "bg-gold text-navy shadow-2xs font-semibold"
                                : "text-muted hover:text-navy",
                            )}
                          >
                            <Clock
                              className={cn(
                                "w-3.5 h-3.5",
                                pickerStatus === "planned"
                                  ? "text-navy"
                                  : "text-gold",
                              )}
                            />
                            Direncanakan
                          </button>
                          <button
                            type="button"
                            onClick={() => setPickerStatus("wishlist")}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                              pickerStatus === "wishlist"
                                ? "bg-navy text-white shadow-2xs font-semibold"
                                : "text-muted hover:text-navy",
                            )}
                          >
                            <Bookmark
                              className={cn(
                                "w-3.5 h-3.5",
                                pickerStatus === "wishlist"
                                  ? "text-gold"
                                  : "text-muted",
                              )}
                            />
                            Wishlist
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
                    {filtered.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
                        <BookOpen className="w-8 h-8 text-muted/40 mb-2" />
                        <p className="text-sm font-medium text-navy">
                          Tidak ada mata kuliah yang cocok
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Coba ubah kata kunci pencarian, tipe matkul, atau
                          ganti filter program studi.
                        </p>
                      </div>
                    ) : (
                      filtered.map((course) => {
                        const placedInSem = placedMap.get(course.id)
                        const isAlreadyPlaced = placedInSem !== undefined

                        return (
                          <div
                            key={course.id}
                            className={cn(
                              "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                              isAlreadyPlaced
                                ? "bg-background/40 border-border/60 opacity-60"
                                : "bg-surface border-border hover:border-gold/60 hover:shadow-2xs",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-1">
                                <span className="font-mono text-[10px] font-bold text-navy bg-navy/8 px-1.5 py-0.5 rounded">
                                  {course.code || course.id}
                                </span>
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                    course.type === "Wajib"
                                      ? "bg-navy/10 text-navy"
                                      : "bg-gold/15 text-navy",
                                  )}
                                >
                                  {course.type}
                                </span>
                                <span className="text-[10px] text-muted font-mono">
                                  {course.credits} SKS • Sem {course.semester}
                                </span>
                                {course.program && (
                                  <span className="text-[10px] text-muted truncate max-w-[200px] hidden sm:inline">
                                    • {course.program}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-medium text-sm text-foreground leading-tight truncate">
                                {course.name}
                              </h4>
                            </div>

                            <div className="flex-shrink-0">
                              {isAlreadyPlaced ? (
                                <span className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-muted bg-background border border-border flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-teal" />
                                  Di Sem {placedInSem}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddCourseFromModal(course)
                                  }
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs",
                                    pickerStatus === "wishlist"
                                      ? "bg-surface text-navy border border-dashed border-navy/40 hover:bg-navy/5"
                                      : "bg-navy text-white hover:bg-navy-light",
                                  )}
                                >
                                  {pickerStatus === "wishlist" ? (
                                    <>
                                      <Bookmark className="w-3.5 h-3.5 text-navy" />
                                      Wishlist
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      Tambah
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )
            })()}

            {/* Modal Footer */}
            <div className="p-3 px-5 border-t border-border bg-background flex justify-between items-center text-xs text-muted">
              <span>
                Tekan <strong>Esc</strong> atau klik di luar untuk menutup
              </span>
              <button
                onClick={() => setPickerSem(null)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface font-medium text-navy transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
