import React, { useState, useEffect } from "react"
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { cn } from "../utils"
import { Course } from "../data"
import { ALL_COURSES, PROGRAMS, fetchCatalog } from "../courseData"
import CourseDetailView from "../components/course-finder/CourseDetailView"
import CourseQuickModal from "../components/course-finder/CourseQuickModal"

export interface CourseFinderProps {
  onAddToPlanner: (course: Course) => void
  addedCourseIds: Set<string>
}

export default function CourseFinder({
  onAddToPlanner,
  addedCourseIds,
}: CourseFinderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] =
    useState<"all" | "odd" | "even" | "3sks" | "4sks">("all")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [activeProgram, setActiveProgram] = useState<string>("all")
  const [courses, setCourses] = useState<Course[]>(ALL_COURSES)
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(PROGRAMS)
  const [, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    fetchCatalog(activeProgram)
      .then((res) => {
        if (!active) return
        if (res) {
          setCourses(res.courses)
          if (res.programs && res.programs.length > 0) {
            setAvailablePrograms(res.programs)
          }
        } else {
          setCourses(
            activeProgram === "all"
              ? ALL_COURSES
              : ALL_COURSES.filter((c) => c.program === activeProgram),
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeProgram])

  const pool = courses
  const filtered = pool.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.code ?? "").toLowerCase().includes(q)
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "odd" && c.parity === "odd") ||
      (activeFilter === "even" && c.parity === "even") ||
      (activeFilter === "3sks" && c.credits === 3) ||
      (activeFilter === "4sks" && c.credits === 4)
    return matchesSearch && matchesFilter
  })

  const handleAddToPlanner = (course: Course) => {
    onAddToPlanner(course)
    setSelectedCourse(null)
  }

  if (detailCourse) {
    return (
      <CourseDetailView
        course={detailCourse}
        onBack={() => setDetailCourse(null)}
        onAdd={handleAddToPlanner}
        addedCourseIds={addedCourseIds}
      />
    )
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Search & Filter Header */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4 space-y-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Cari mata kuliah, kode, atau kata kunci..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-all text-sm font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Semua Program" },
            ...availablePrograms.map((p) => ({ key: p, label: p })),
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveProgram(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                activeProgram === f.key
                  ? "bg-gold text-white"
                  : "bg-surface border border-border text-muted hover:text-navy",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { key: "all", label: "Semua" },
            { key: "odd", label: "Semester Ganjil" },
            { key: "even", label: "Semester Genap" },
            { key: "3sks", label: "3 SKS" },
            { key: "4sks", label: "4 SKS" },
          ] as const).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                activeFilter === f.key
                  ? "bg-navy text-white"
                  : "bg-surface border border-border text-muted hover:text-navy",
              )}
            >
              {f.key === "all" && <Filter className="w-3 h-3" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted">
            <BookOpen className="w-10 h-10 opacity-20 mb-3" />
            <p className="text-sm">Tidak ada mata kuliah yang sesuai filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
            {filtered.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="bg-surface rounded-xl border border-border p-4 cursor-pointer hover:border-gold hover:shadow-md transition-all flex flex-col gap-3 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-navy">
                      {course.code ?? course.id}
                    </span>
                    <h3 className="font-heading font-semibold text-base text-foreground mt-0.5 group-hover:text-gold transition-colors">
                      {course.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0",
                      course.type === "Wajib"
                        ? "bg-navy/8 text-navy"
                        : "bg-gold/10 text-navy",
                    )}
                  >
                    {course.type}
                  </span>
                </div>
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {course.desc}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted mt-auto">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {course.credits} SKS
                    </span>
                    <span>Sem {course.semester}</span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ml-auto",
                      course.parity === "odd"
                        ? "bg-teal/10 text-navy"
                        : "bg-gold/10 text-navy",
                    )}
                  >
                    {course.parity === "odd" ? "Ganjil" : "Genap"}
                  </span>
                </div>
                {addedCourseIds.has(course.id) && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-teal mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ditambahkan ke
                    Degree Planner
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Modal */}
      <CourseQuickModal
        course={selectedCourse}
        addedCourseIds={addedCourseIds}
        onClose={() => setSelectedCourse(null)}
        onAddToPlanner={handleAddToPlanner}
        onOpenDetail={(course) => {
          setDetailCourse(course)
          setSelectedCourse(null)
        }}
      />
    </div>
  )
}
