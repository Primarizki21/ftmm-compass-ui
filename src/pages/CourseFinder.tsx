import React, { useState, useEffect } from "react"
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Layers,
  GraduationCap,
} from "lucide-react"
import { cn } from "../utils"
import { Course, CourseCategory } from "../data"
import {
  ALL_COURSES,
  PROGRAMS,
  fetchCatalog,
  getProdiAbbreviation,
} from "../courseData"
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
  const [selectedParity, setSelectedParity] = useState<"all" | "odd" | "even">(
    "all",
  )
  const [selectedCredits, setSelectedCredits] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [activeProgram, setActiveProgram] = useState<string>("all")
  const [courses, setCourses] = useState<Course[]>(ALL_COURSES)
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(PROGRAMS)
  useEffect(() => {
    let active = true
    fetchCatalog(activeProgram).then((res) => {
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

    return () => {
      active = false
    }
  }, [activeProgram])

  const filtered = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.code ?? "").toLowerCase().includes(q) ||
      (c.prodiAbbr ?? "").toLowerCase().includes(q) ||
      (c.program ?? "").toLowerCase().includes(q)

    const matchesProgram =
      activeProgram === "all" ||
      c.program === activeProgram ||
      Boolean(
        c.prodiAbbr && getProdiAbbreviation(activeProgram) === c.prodiAbbr,
      )

    const matchesParity =
      selectedParity === "all" || c.parity === selectedParity

    const matchesCredits =
      selectedCredits === "all" ||
      (selectedCredits === "2" && c.credits === 2) ||
      (selectedCredits === "3" && c.credits === 3) ||
      (selectedCredits === "4" && c.credits === 4) ||
      (selectedCredits === "1" && c.credits === 1) ||
      (selectedCredits === "other" && c.credits > 4)

    const matchesCategory =
      selectedCategory === "all" || c.category === selectedCategory

    return (
      matchesSearch &&
      matchesProgram &&
      matchesParity &&
      matchesCredits &&
      matchesCategory
    )
  })

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeProgram !== "all" ||
    selectedParity !== "all" ||
    selectedCredits !== "all" ||
    selectedCategory !== "all"

  const handleResetFilters = () => {
    setSearchQuery("")
    setActiveProgram("all")
    setSelectedParity("all")
    setSelectedCredits("all")
    setSelectedCategory("all")
  }

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
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4 space-y-3.5 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Cari mata kuliah, kode (cth: AGI101, TI201), singkatan prodi (TI, TSD, TRKB, TE, RN)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-all text-sm font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Program Tabs with Abbreviations */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveProgram("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
              activeProgram === "all"
                ? "bg-gold text-white shadow-xs font-semibold"
                : "bg-surface border border-border text-muted hover:text-navy hover:bg-navy/5",
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Program</span>
          </button>
          {availablePrograms.map((p) => {
            const abbr = getProdiAbbreviation(p)
            const isActive = activeProgram === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActiveProgram(p)}
                title={p}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
                  isActive
                    ? "bg-navy text-white shadow-xs font-bold"
                    : "bg-surface border border-border text-muted hover:text-navy hover:bg-navy/5",
                )}
              >
                <span className="font-mono font-bold">{abbr}</span>
                <span className="hidden sm:inline font-normal text-[11px] opacity-80">
                  {p.replace(/^(Teknik|Teknologi)\s+/i, "")}
                </span>
              </button>
            )
          })}
        </div>

        {/* Secondary Filter Controls: Parity, SKS Dropdown, PDB Category Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Parity Selector */}
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setSelectedParity("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  selectedParity === "all"
                    ? "bg-navy text-white"
                    : "text-muted hover:text-navy",
                )}
              >
                Semua Sem
              </button>
              <button
                type="button"
                onClick={() => setSelectedParity("odd")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  selectedParity === "odd"
                    ? "bg-navy text-white"
                    : "text-muted hover:text-navy",
                )}
              >
                Ganjil
              </button>
              <button
                type="button"
                onClick={() => setSelectedParity("even")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  selectedParity === "even"
                    ? "bg-navy text-white"
                    : "text-muted hover:text-navy",
                )}
              >
                Genap
              </button>
            </div>

            {/* SKS Dropdown */}
            <div className="relative">
              <select
                value={selectedCredits}
                onChange={(e) => setSelectedCredits(e.target.value)}
                className="h-8 pl-3 pr-8 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:border-gold focus:border-gold focus:ring-1 focus:ring-gold outline-hidden cursor-pointer appearance-none transition-colors"
                aria-label="Filter Bobot SKS"
              >
                <option value="all">Bobot SKS: Semua</option>
                <option value="2">2 SKS (195 Matkul)</option>
                <option value="3">3 SKS (132 Matkul)</option>
                <option value="4">4 SKS (13 Matkul)</option>
                <option value="1">1 SKS (Praktikum)</option>
                <option value="other">&gt; 4 SKS (Tugas Akhir)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* PDB Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 pl-3 pr-8 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:border-gold focus:border-gold focus:ring-1 focus:ring-gold outline-hidden cursor-pointer appearance-none transition-colors"
                aria-label="Filter Kategori PDB"
              >
                <option value="all">Kategori: Semua</option>
                <option value="pdb_univ">
                  PDB Universitas (Campur se-UNAIR)
                </option>
                <option value="pdb_faculty">PDB FTMM (Sains Dasar)</option>
                <option value="prodi">Mata Kuliah Prodi</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted hover:text-navy hover:bg-navy/5 rounded-lg border border-border/80 transition-colors cursor-pointer"
                title="Reset seluruh filter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-muted font-mono font-medium">
            {filtered.length} dari {courses.length} matkul
          </span>
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
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {course.prodiAbbr && (
                        <span
                          className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-navy text-white tracking-wide flex-shrink-0"
                          title={`Program Studi ${course.program}`}
                        >
                          {course.prodiAbbr}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-navy">
                        {course.code ?? course.id}
                      </span>
                      {course.category === "pdb_univ" && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex-shrink-0"
                          title="PDB Universitas: Kelas Campur Seluruh Fakultas UNAIR (Semester 1–2)"
                        >
                          PDB Univ
                        </span>
                      )}
                      {course.category === "pdb_faculty" && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal/20 text-navy border border-teal/40 flex-shrink-0"
                          title="PDB FTMM: Dasar Sains & Rekayasa Bersama FTMM (Semester 1–2)"
                        >
                          PDB FTMM
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-base text-foreground mt-1.5 group-hover:text-gold transition-colors line-clamp-1">
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
