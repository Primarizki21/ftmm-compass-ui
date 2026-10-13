import React, { useState, useEffect, useMemo } from "react"
import { BookOpen, Calendar } from "lucide-react"
import { cn } from "../utils"
import { Course, SCHEDULE } from "../data"
import { ALL_COURSES, PROGRAMS, fetchCatalog } from "../courseData"
import TimetableGrid from "../components/TimetableGrid"
import {
  PlacedCourse,
  SEMESTERS,
  TIMETABLE_DAYS,
  INITIAL_PLAN,
  SemesterState,
  Tab,
  DegreePlannerProps,
  canDrop,
} from "../components/degree-planner/types"
import PlannerHeader from "../components/degree-planner/PlannerHeader"
import {
  SemesterColumn,
  ElectiveCourseBank,
} from "../components/degree-planner/SemesterColumn"
import CoursePickerModal from "../components/degree-planner/CoursePickerModal"
import CourseInspectModal from "../components/degree-planner/CourseInspectModal"
import ClassSelectorPanel, {
  TimetableConflict,
} from "../components/degree-planner/ClassSelectorPanel"
import { getOfferingForCourse, ScheduleItem } from "../data"

export type { PlacedCourse } from "../components/degree-planner/types"

export default function DegreePlanner({
  pendingCourses,
  setPendingCourses,
  customPlan,
  appliedSummary,
  onResetPlan,
  onNavigate,
  activeSchedule,
  onUpdateSchedule,
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
  const [inspectCourse, setInspectCourse] = useState<{
    course: PlacedCourse
    sem: number
  } | null>(null)
  const [activeTimetableSem, setActiveTimetableSem] = useState<number>(5)
  const [selectedSections, setSelectedSections] =
    useState<Record<string, string>>({
      II4042: "II4042-A",
      II4045: "II4045-A",
      KU2001: "KU2001-A",
      II4050: "II4050-A",
    })
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
  }, [pendingCourses, setPendingCourses])

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

  const handleToggleStatus = (
    courseId: string,
    sem: number,
    newStatus: "planned" | "wishlist",
  ) => {
    setPlan((prev) => ({
      ...prev,
      [sem]: (prev[sem] || []).map((c) =>
        c.id === courseId ? { ...c, status: newStatus } : c,
      ),
    }))
    if (inspectCourse && inspectCourse.course.id === courseId) {
      setInspectCourse((prev) =>
        prev
          ? {
              ...prev,
              course: { ...prev.course, status: newStatus },
            }
          : null,
      )
    }
  }

  // Active semester courses for timetable view
  const currentTimetableCourses = useMemo(
    () => plan[activeTimetableSem] || [],
    [plan, activeTimetableSem],
  )

  // Derive dynamic schedule items & detect conflicts
  const { dynamicSchedule, conflicts } = useMemo(() => {
    const COLOR_PALETTE = [
      "bg-teal/20 text-navy border-teal/50",
      "bg-gold/20 text-navy border-gold/50",
      "bg-navy/10 text-navy border-navy/30",
      "bg-purple-100 text-purple-900 border-purple-300",
      "bg-blue-100 text-blue-900 border-blue-300",
      "bg-emerald-100 text-emerald-900 border-emerald-300",
    ]

    const items: ScheduleItem[] = []
    currentTimetableCourses.forEach((c, index) => {
      const offering = getOfferingForCourse(c)
      const chosenSectionId = selectedSections[c.id]
      const section =
        offering.sections.find((s) => s.sectionId === chosenSectionId) ||
        offering.sections[0]

      if (section) {
        items.push({
          id: `${c.id}-${section.sectionId}`,
          course: c.name,
          code: c.code || c.id,
          sectionCode: section.sectionCode,
          day: section.schedule.day,
          start: section.schedule.start,
          duration: section.schedule.duration,
          color: COLOR_PALETTE[index % COLOR_PALETTE.length],
          room: section.schedule.room,
          lecturer: section.lecturer,
        })
      }
    })

    // Detect overlapping slots
    const foundConflicts: TimetableConflict[] = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        const aEnd = a.start + a.duration
        const bEnd = b.start + b.duration

        if (a.day === b.day && a.start < bEnd && b.start < aEnd) {
          a.conflict = true
          b.conflict = true
          foundConflicts.push({
            courseA: a.course,
            codeA: a.code,
            sectionA: a.sectionCode || "Kelas",
            courseB: b.course,
            codeB: b.code,
            sectionB: b.sectionCode || "Kelas",
            day: a.day,
            start: Math.max(a.start, b.start),
            end: Math.min(aEnd, bEnd),
          })
        }
      }
    }

    return { dynamicSchedule: items, conflicts: foundConflicts }
  }, [currentTimetableCourses, selectedSections])

  // Sync timetable schedule with parent state
  useEffect(() => {
    if (onUpdateSchedule) {
      onUpdateSchedule(dynamicSchedule)
    }
  }, [dynamicSchedule, onUpdateSchedule])

  const handleSelectSection = (courseId: string, sectionId: string) => {
    setSelectedSections((prev) => ({
      ...prev,
      [courseId]: sectionId,
    }))
  }

  // Auto-resolve conflicts by picking conflict-free section alternatives
  const handleAutoResolveConflicts = () => {
    const updated = { ...selectedSections }
    currentTimetableCourses.forEach((c) => {
      const offering = getOfferingForCourse(c)
      if (offering.sections.length > 1) {
        const alternate = offering.sections.find(
          (s) => s.sectionId !== updated[c.id],
        )
        if (alternate) {
          updated[c.id] = alternate.sectionId
        }
      }
    })
    setSelectedSections(updated)
  }

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
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
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
          <PlannerHeader
            appliedSummary={appliedSummary}
            onResetPlan={onResetPlan}
            dragging={dragging}
          />

          {/* Semester Columns */}
          <div className="flex-1 overflow-x-auto pb-1 min-h-0">
            <div className="flex gap-4 min-w-max h-full">
              {SEMESTERS.map((sem) => (
                <SemesterColumn
                  key={sem}
                  sem={sem}
                  courses={plan[sem] || []}
                  state={semState(sem)}
                  dragging={dragging}
                  dropTarget={dropTarget}
                  onDragOverColumn={handleDragOver}
                  onDropColumn={handleDrop}
                  onDragLeaveColumn={handleDragLeave}
                  onCardDragStart={handleDragStart}
                  onCardDragOver={handleCardDragOver}
                  onCardDrop={handleCardDrop}
                  onDragEnd={handleDragEnd}
                  onDeleteCourse={deleteCourse}
                  onOpenManualPicker={(s) => {
                    setPickerSem(s)
                    setPickerSearch("")
                  }}
                  onSelectCourse={(c) => setInspectCourse({ course: c, sem })}
                />
              ))}
            </div>
          </div>

          {/* Course Bank — only Pilihan */}
          <ElectiveCourseBank
            pendingCourses={pendingCourses}
            onDragStartBank={handleDragStart}
            onDragEnd={handleDragEnd}
            onSelectCourse={(c) =>
              setInspectCourse({ course: c, sem: c.semester || 5 })
            }
          />

          {/* Modal Pop-up: Tambah Manual */}
          <CoursePickerModal
            pickerSem={pickerSem}
            pickerSearch={pickerSearch}
            setPickerSearch={setPickerSearch}
            pickerProgram={pickerProgram}
            setPickerProgram={setPickerProgram}
            pickerType={pickerType}
            setPickerType={setPickerType}
            pickerStatus={pickerStatus}
            setPickerStatus={setPickerStatus}
            availablePrograms={availablePrograms}
            catalog={catalog}
            placedMap={placedMap}
            onClose={() => setPickerSem(null)}
            onAddCourse={handleAddCourseFromModal}
          />

          {/* Modal Pop-up: Inspeksi Silabus & Prasyarat In-Situ */}
          <CourseInspectModal
            course={inspectCourse ? inspectCourse.course : null}
            currentSem={inspectCourse ? inspectCourse.sem : 1}
            allPlan={plan}
            onClose={() => setInspectCourse(null)}
            onToggleStatus={handleToggleStatus}
            onDeleteCourse={deleteCourse}
            onOpenInCourseFinder={() => {
              onNavigate?.("course-finder")
            }}
          />
        </>
      )}

      {/* ─── TAB: Jadwal Aktif ─── */}
      {activeTab === "timetable" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Timetable Header & Semester Picker */}
          <div className="mb-4 flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-navy">
                  Jadwal Kuliah Aktif
                </h3>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-gold/15 text-navy border border-gold/30">
                  Semester Ganjil 2024/2025
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Konfigurasikan kelas perkuliahan mahasiswa untuk melihat jadwal
                mingguan dan menyelesaikan bentrok waktu.
              </p>
            </div>

            {/* Semester Switcher */}
            <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border">
              <span className="text-xs text-muted font-medium px-2">
                Tampilkan Semester:
              </span>
              {SEMESTERS.map((sem) => {
                const count = (plan[sem] || []).length
                const isActive = activeTimetableSem === sem
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setActiveTimetableSem(sem)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                      isActive
                        ? "bg-navy text-white shadow-2xs"
                        : "text-muted hover:text-navy hover:bg-navy/5",
                    )}
                  >
                    <span>Sem {sem}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-[9px] font-mono px-1 rounded-full",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-surface text-muted border border-border",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Timetable Body: Left Class Selector & Right Grid */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden pb-1">
            {/* Left Column: Class Selector Panel (5 cols on desktop) */}
            <div className="lg:col-span-5 h-[400px] lg:h-full min-h-0 flex flex-col">
              <ClassSelectorPanel
                activeSemester={activeTimetableSem}
                semesterCourses={currentTimetableCourses}
                selectedSections={selectedSections}
                onSelectSection={handleSelectSection}
                conflicts={conflicts}
                onAutoResolveConflicts={handleAutoResolveConflicts}
              />
            </div>

            {/* Right Column: Timetable Grid (7 cols on desktop) */}
            <div className="lg:col-span-7 flex flex-col min-h-0 h-[520px] lg:h-full">
              <TimetableGrid schedule={dynamicSchedule} days={TIMETABLE_DAYS} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
