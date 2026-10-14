import { useState, useEffect, useMemo } from "react"
import {
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  RotateCcw,
  Layers,
  GraduationCap,
  Flame,
  Star,
  X,
  AlertCircle,
} from "lucide-react"
import { cn } from "../utils"
import { Course } from "../data"
import {
  pollingService,
  type PollingPeriod,
  type StudentVote,
  type DemandAnalyticsResponse,
} from "../services/pollingService"
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
  initialCourse?: Course | null
  onClearInitialCourse?: () => void
}

export default function CourseFinder({
  onAddToPlanner,
  addedCourseIds,
  initialCourse,
  onClearInitialCourse,
}: CourseFinderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedParity, setSelectedParity] = useState<"all" | "odd" | "even">(
    "all",
  )
  const [selectedCredits, setSelectedCredits] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [filterMostDemanded, setFilterMostDemanded] = useState(false)
  const [pollingPeriod, setPollingPeriod] = useState<PollingPeriod | null>(null)
  const [myVotes, setMyVotes] = useState<StudentVote[]>([])
  const [demandStats, setDemandStats] = useState<Record<string, number>>({})
  const [priorityModalCourse, setPriorityModalCourse] = useState<Course | null>(
    null,
  )
  const [modalPriority, setModalPriority] = useState<1 | 2 | 3>(1)
  const [isSubmittingVote, setIsSubmittingVote] = useState(false)
  useEffect(() => {
    if (initialCourse) {
      setDetailCourse(initialCourse)
    }
  }, [initialCourse])
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
  useEffect(() => {
    let mounted = true
    Promise.all([
      pollingService.getActivePeriod(),
      pollingService.getMyVotes(),
      pollingService.getDemandAnalytics("all"),
    ]).then(
      ([
        period,
        votes,
        analytics,
      ]: [PollingPeriod, StudentVote[], DemandAnalyticsResponse]) => {
        if (!mounted) return
        setPollingPeriod(period)
        setMyVotes(votes)
        const stats: Record<string, number> = {}
        analytics.items.forEach((item) => {
          stats[item.course_id] = item.total_votes
          if (item.course_code) {
            stats[item.course_code] = item.total_votes
          }
        })
        setDemandStats(stats)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const list = courses.filter((c) => {
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

    if (filterMostDemanded) {
      return [...list].sort((a, b) => {
        const aVotes = demandStats[a.id] || demandStats[a.code || ""] || 0
        const bVotes = demandStats[b.id] || demandStats[b.code || ""] || 0
        return bVotes - aVotes
      })
    }

    return list
  }, [
    courses,
    searchQuery,
    activeProgram,
    selectedParity,
    selectedCredits,
    selectedCategory,
    filterMostDemanded,
    demandStats,
  ])

  const myVoteMap = useMemo(() => {
    const map: Record<string, StudentVote> = {}
    myVotes.forEach((v) => {
      map[v.course_id] = v
    })
    return map
  }, [myVotes])

  const maxVotes = pollingPeriod?.max_votes_per_student || 3
  const remainingSlots = Math.max(0, maxVotes - myVotes.length)

  const handleOpenPriorityModal = (course: Course) => {
    const currentVote =
      myVoteMap[course.id] || (course.code ? myVoteMap[course.code] : undefined)
    setModalPriority(currentVote?.priority || 1)
    setPriorityModalCourse(course)
  }

  const handleSaveVote = async () => {
    if (!priorityModalCourse) return
    setIsSubmittingVote(true)
    try {
      const vote = await pollingService.submitVote({
        course_id: priorityModalCourse.id,
        priority: modalPriority,
      })
      setMyVotes((prev) => {
        const filteredVotes = prev.filter(
          (v) =>
            v.course_id !== priorityModalCourse.id &&
            v.course_id !== (priorityModalCourse.code || ""),
        )
        return [...filteredVotes, vote]
      })
      setDemandStats((prev) => {
        const existing = prev[priorityModalCourse.id] || 0
        const hasPrior = Boolean(myVoteMap[priorityModalCourse.id])
        return {
          ...prev,
          [priorityModalCourse.id]: hasPrior ? existing : existing + 1,
        }
      })
      setPriorityModalCourse(null)
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const handleRemoveVote = async (courseId: string) => {
    setIsSubmittingVote(true)
    try {
      await pollingService.removeVote(courseId)
      setMyVotes((prev) => prev.filter((v) => v.course_id !== courseId))
      setDemandStats((prev) => ({
        ...prev,
        [courseId]: Math.max(0, (prev[courseId] || 1) - 1),
      }))
      setPriorityModalCourse(null)
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeProgram !== "all" ||
    selectedParity !== "all" ||
    selectedCredits !== "all" ||
    selectedCategory !== "all" ||
    filterMostDemanded
  const handleResetFilters = () => {
    setSearchQuery("")
    setActiveProgram("all")
    setSelectedParity("all")
    setSelectedCredits("all")
    setSelectedCategory("all")
    setFilterMostDemanded(false)
  }

  const handleAddToPlanner = (course: Course) => {
    onAddToPlanner(course)
    setSelectedCourse(null)
  }

  if (detailCourse) {
    return (
      <CourseDetailView
        course={detailCourse}
        catalog={courses}
        onBack={() => {
          setDetailCourse(null)
          onClearInitialCourse?.()
        }}
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
                  &bull; {p}
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
                <option value="pdb_univ">PDB Universitas</option>
                <option value="pdb_saintek">PDB Saintek</option>
                <option value="prodi">Mata Kuliah Prodi</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </div>
            {/* Pill Filter Cepat: Paling Diminati */}
            <button
              type="button"
              onClick={() => setFilterMostDemanded(!filterMostDemanded)}
              className={cn(
                "h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                filterMostDemanded
                  ? "bg-orange text-white border-orange shadow-xs"
                  : "bg-surface border-border text-muted hover:text-orange hover:border-orange/50",
              )}
              title="Urutkan mata kuliah berdasarkan peminat terbanyak"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Paling Diminati</span>
            </button>

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
                          title="PDB Universitas (Semester 1–2)"
                        >
                          PDB Univ
                        </span>
                      )}
                      {course.category === "pdb_saintek" && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal/20 text-navy border border-teal/40 flex-shrink-0"
                          title="PDB Saintek (Semester 1–2)"
                        >
                          PDB Saintek
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
                {course.type === "Pilihan" && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/70 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-[11px] text-muted">
                      <Flame className="w-3.5 h-3.5 text-orange flex-shrink-0" />
                      <span>
                        <strong className="text-navy font-mono font-bold">
                          {demandStats[course.id] ||
                            demandStats[course.code || ""] ||
                            0}
                        </strong>{" "}
                        peminat / Min. {pollingPeriod?.min_quorum || 15}
                      </span>
                    </div>
                    {(() => {
                      const vote =
                        myVoteMap[course.id] ||
                        (course.code ? myVoteMap[course.code] : undefined)
                      const targetSem = course.semester || 6
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenPriorityModal(course)
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs",
                            vote
                              ? "bg-gold text-navy hover:bg-gold/90"
                              : "bg-navy text-white hover:bg-navy-light",
                          )}
                        >
                          <Star
                            className={cn(
                              "w-3 h-3",
                              vote ? "fill-navy text-navy" : "text-gold",
                            )}
                          />
                          <span>
                            {vote
                              ? `★ Di Wishlist (Prioritas ${vote.priority})`
                              : `☆ Wishlist Sem ${targetSem}`}
                          </span>
                        </button>
                      )
                    })()}
                  </div>
                )}
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
        catalog={courses}
        addedCourseIds={addedCourseIds}
        onClose={() => setSelectedCourse(null)}
        onAddToPlanner={handleAddToPlanner}
        onOpenDetail={(course) => {
          setDetailCourse(course)
          setSelectedCourse(null)
        }}
      />

      {/* Priority & Wishlist Selection Modal */}
      {priorityModalCourse && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPriorityModalCourse(null)}
        >
          <div
            className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
                  Pre-KRS Elective Wishlist
                </span>
                <h3 className="font-heading font-bold text-lg text-navy line-clamp-1">
                  {priorityModalCourse.name}
                </h3>
                <p className="text-xs text-muted font-mono">
                  {priorityModalCourse.code || priorityModalCourse.id} &bull;{" "}
                  {priorityModalCourse.credits} SKS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPriorityModalCourse(null)}
                className="p-1 rounded-lg text-muted hover:text-navy hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slot Info Banner */}
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
              <span className="text-muted font-medium">
                Slot Wishlist Tersedia:
              </span>
              <span className="font-mono font-bold text-navy">
                {Boolean(myVoteMap[priorityModalCourse.id])
                  ? `${remainingSlots} slot tersisa (terdaftar)`
                  : `${remainingSlots} dari ${maxVotes} slot tersisa`}
              </span>
            </div>

            {/* Priority Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-navy block">
                Tingkat Prioritas Peminatan:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { level: 1, label: "Prioritas 1", desc: "Paling Diinginkan" },
                  { level: 2, label: "Prioritas 2", desc: "Pilihan Cadangan" },
                  { level: 3, label: "Prioritas 3", desc: "Alternatif Ketiga" },
                ] as const).map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setModalPriority(item.level)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                      modalPriority === item.level
                        ? "bg-navy text-white border-navy ring-2 ring-gold/50 shadow-xs"
                        : "bg-surface border-border text-foreground hover:border-gold",
                    )}
                  >
                    <span className="font-bold text-sm">P{item.level}</span>
                    <span className="text-[10px] opacity-80 leading-tight">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quorum Note */}
            <div className="text-[11px] text-muted flex items-start gap-2 bg-gold/10 text-navy p-3 rounded-xl border border-gold/30">
              <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p>
                Mata kuliah pilihan memerlukan minimal{" "}
                <strong>{pollingPeriod?.min_quorum || 15} peminat</strong> agar
                diusulkan buka pada semester depan.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {Boolean(myVoteMap[priorityModalCourse.id]) ? (
                <button
                  type="button"
                  disabled={isSubmittingVote}
                  onClick={() => handleRemoveVote(priorityModalCourse.id)}
                  className="px-4 py-2 text-xs font-bold text-orange hover:bg-orange/10 rounded-xl transition-colors cursor-pointer"
                >
                  Hapus dari Wishlist
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPriorityModalCourse(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted hover:text-navy hover:bg-background transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingVote ||
                    (!Boolean(myVoteMap[priorityModalCourse.id]) &&
                      remainingSlots <= 0)
                  }
                  onClick={handleSaveVote}
                  className="px-4 py-2 rounded-xl bg-gold text-navy text-xs font-bold hover:bg-gold/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {isSubmittingVote ? "Menyimpan..." : "Simpan Wishlist"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
