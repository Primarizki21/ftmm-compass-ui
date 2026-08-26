import React, { useState } from "react"
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  X,
  Plus,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react"
import { cn } from "../utils"
import { Course } from "../data"
import { ALL_COURSES, PROGRAMS } from "../courseData"

interface CourseFinderProps {
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

  const pool =
    activeProgram === "all"
      ? ALL_COURSES
      : ALL_COURSES.filter((c) => c.program === activeProgram)
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all text-sm font-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Semua Program" },
            ...PROGRAMS.map((p) => ({ key: p, label: p })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveProgram(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
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
          {[
            { key: "all", label: "Semua" },
            { key: "odd", label: "Semester Ganjil" },
            { key: "even", label: "Semester Genap" },
            { key: "3sks", label: "3 SKS" },
            { key: "4sks", label: "4 SKS" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
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
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-teal block">
                      {course.code ?? course.id}
                    </span>
                    <h4 className="font-heading font-bold text-navy mt-0.5 group-hover:text-gold transition-colors leading-tight">
                      {course.name}
                    </h4>
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
                <div className="flex items-center gap-3 mt-auto">
                  <span className="text-xs text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {course.credits} SKS
                  </span>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Sem {course.semester}
                  </span>
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
                  <div className="flex items-center gap-1.5 text-xs font-medium text-teal border-t border-border pt-2 -mx-0 -mb-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah ditambahkan
                    ke planner
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Popup */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCourse(null)
          }}
        >
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-navy text-white p-6 relative overflow-hidden flex-shrink-0">
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
              <div className="absolute -left-8 bottom-0 w-32 h-32 bg-teal/8 rounded-full blur-2xl" />
              <button
                onClick={() => setSelectedCourse(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative z-10">
                <span className="font-mono text-teal-light font-bold text-sm">
                  {selectedCourse.code ?? selectedCourse.id}
                </span>
                <h2 className="font-heading text-2xl font-bold mt-1 mb-4">
                  {selectedCourse.name}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                    {selectedCourse.credits} SKS
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                    Semester {selectedCourse.semester}
                  </span>
                  <span className="px-2.5 py-1 bg-gold/20 text-gold rounded-md text-xs font-bold uppercase tracking-wide backdrop-blur-sm border border-gold/30">
                    {selectedCourse.type}
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                    {selectedCourse.parity === "odd"
                      ? "Sem Ganjil"
                      : "Sem Genap"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                  Deskripsi
                </h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedCourse.desc}
                </p>
              </div>

              {selectedCourse.prerequisites &&
                selectedCourse.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                      Prasyarat
                    </h3>
                    <ul className="space-y-2">
                      {selectedCourse.prerequisites.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />
                          {p.id !== p.name && (
                            <span className="font-mono text-xs font-bold text-navy">
                              {p.id}
                            </span>
                          )}
                          <span className="text-foreground">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {selectedCourse.workload && (
                <div>
                  <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                    Beban Kuliah
                  </h3>
                  <div className="bg-background rounded-lg p-3 grid grid-cols-3 gap-3 text-center divide-x divide-border">
                    <div>
                      <div className="text-xl font-heading font-bold text-navy">
                        {selectedCourse.workload.hours}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        Jam/Sem
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-heading font-bold text-navy">
                        {selectedCourse.workload.lectureCredits}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        SKS Kuliah
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-heading font-bold text-navy">
                        {selectedCourse.workload.labCredits}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        SKS Praktikum
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border grid grid-cols-2 gap-3 flex-shrink-0">
              <button
                onClick={() => handleAddToPlanner(selectedCourse)}
                disabled={addedCourseIds.has(selectedCourse.id)}
                className={cn(
                  "py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  addedCourseIds.has(selectedCourse.id)
                    ? "bg-teal/10 text-teal border border-teal/30 cursor-default"
                    : "bg-navy text-white hover:bg-navy-light",
                )}
              >
                {addedCourseIds.has(selectedCourse.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Ditambahkan
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Degree Planner
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setDetailCourse(selectedCourse)
                  setSelectedCourse(null)
                }}
                className="py-2.5 rounded-lg border border-border text-sm font-medium text-navy hover:border-gold hover:bg-gold/5 transition-all flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" /> Detail Lengkap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Full Detail View ── */
interface CourseDetailViewProps {
  course: Course
  onBack: () => void
  onAdd: (c: Course) => void
  addedCourseIds: Set<string>
}

function CourseDetailView({
  course,
  onBack,
  onAdd,
  addedCourseIds,
}: CourseDetailViewProps) {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-navy text-white rounded-xl p-6 mb-5 relative overflow-hidden flex-shrink-0">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-48 h-48 bg-teal/5 rounded-full blur-2xl" />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Matkul
        </button>
        <div className="relative z-10">
          <span className="font-mono text-teal-light font-bold">
            {course.code ?? course.id}
          </span>
          <h1 className="font-heading text-3xl font-bold mt-1 mb-4">
            {course.name}
          </h1>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              {course.credits} SKS
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              Semester {course.semester}
            </span>
            <span className="px-3 py-1 bg-gold/20 text-gold rounded-md text-sm font-bold uppercase tracking-wide border border-gold/30 backdrop-blur-sm">
              {course.type}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              Ditawarkan Sem{" "}
              {course.parity === "odd"
                ? "Ganjil (1, 3, 5, 7)"
                : "Genap (2, 4, 6, 8)"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Description + Workload */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-heading font-bold text-lg text-navy mb-3">
            Deskripsi Mata Kuliah
          </h3>
          <p className="text-sm text-foreground leading-relaxed">
            {course.desc}
          </p>
          {course.workload && (
            <div className="mt-5 bg-background rounded-lg p-4 grid grid-cols-3 gap-4 text-center divide-x divide-border">
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {course.workload.hours}
                </div>
                <div className="text-xs text-muted mt-1">Jam/Semester</div>
              </div>
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {course.workload.lectureCredits}
                </div>
                <div className="text-xs text-muted mt-1">SKS Kuliah</div>
              </div>
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {course.workload.labCredits}
                </div>
                <div className="text-xs text-muted mt-1">SKS Praktikum</div>
              </div>
            </div>
          )}
        </div>

        {/* Prerequisite Diagram */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-heading font-bold text-lg text-navy mb-5">
            Diagram Alur Prasyarat
          </h3>
          <PrerequisiteDiagram course={course} />
        </div>

        {/* Action */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <button
            onClick={() => onAdd(course)}
            disabled={addedCourseIds.has(course.id)}
            className={cn(
              "w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
              addedCourseIds.has(course.id)
                ? "bg-teal/10 text-teal border border-teal/30 cursor-default"
                : "bg-navy text-white hover:bg-navy-light",
            )}
          >
            {addedCourseIds.has(course.id) ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Sudah Ditambahkan ke Degree
                Planner
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Tambahkan ke Degree Planner
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Prerequisite Flow Diagram ── */
function PrerequisiteDiagram({ course }: { course: Course }) {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return (
      <div className="bg-background rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-teal" />
        </div>
        <p className="text-sm font-medium text-navy">Tidak Ada Prasyarat</p>
        <p className="text-xs text-muted mt-1">
          Mata kuliah ini dapat langsung diambil.
        </p>
      </div>
    )
  }

  const NODE_W = 162
  const NODE_H = 54
  const H_GAP = 22
  const V_GAP = 64
  const CTRL = 28

  // Collect level-0 nodes (prereqs of prereqs), deduped
  const level0Map = new Map<string, { id: string name: string }>()
  course.prerequisites.forEach((p) => {
    ;(p.prereqs || []).forEach((pp) => {
      if (!level0Map.has(pp.id)) level0Map.set(pp.id, pp)
    })
  })
  const level0Nodes = Array.from(level0Map.values())
  const level1Nodes = course.prerequisites

  const hasLevel0 = level0Nodes.length > 0
  const numLevels = hasLevel0 ? 3 : 2

  const maxNodesPerRow = Math.max(level0Nodes.length, level1Nodes.length, 1)
  const svgWidth = maxNodesPerRow * NODE_W + (maxNodesPerRow - 1) * H_GAP + 80
  const svgHeight = numLevels * NODE_H + (numLevels - 1) * V_GAP + 40

  const getX = (index: number, total: number): number => {
    const contentW = total * NODE_W + (total - 1) * H_GAP
    const startX = (svgWidth - contentW) / 2
    return startX + index * (NODE_W + H_GAP)
  }

  // Y positions top-to-bottom: level0 at top, root at bottom
  const levelY: Record<number, number> = hasLevel0
    ? { 0: 20, 1: 20 + NODE_H + V_GAP, 2: 20 + 2 * (NODE_H + V_GAP) }
    : { 1: 20, 2: 20 + NODE_H + V_GAP }

  return (
    <div className="overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block mx-auto"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <defs>
          <marker
            id={`arrow-${course.id}`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
          </marker>
        </defs>

        {/* Edges: level1 → root */}
        {level1Nodes.map((p, pi) => {
          const x1 = getX(pi, level1Nodes.length) + NODE_W / 2
          const y1 = levelY[1] + NODE_H
          const x2 = getX(0, 1) + NODE_W / 2
          const y2 = levelY[2]
          return (
            <path
              key={`edge-l1-root-${p.id}`}
              d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
              stroke="#d1d5db"
              strokeWidth="1.5"
              fill="none"
              markerEnd={`url(#arrow-${course.id})`}
            />
          )
        })}

        {/* Edges: level0 → level1 */}
        {hasLevel0 &&
          level1Nodes.map((p, pi) =>
            (p.prereqs || []).map((pp) => {
              const ppIdx = level0Nodes.findIndex((n) => n.id === pp.id)
              if (ppIdx === -1) return null
              const x1 = getX(ppIdx, level0Nodes.length) + NODE_W / 2
              const y1 = levelY[0] + NODE_H
              const x2 = getX(pi, level1Nodes.length) + NODE_W / 2
              const y2 = levelY[1]
              return (
                <path
                  key={`edge-l0-l1-${pp.id}-${p.id}`}
                  d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
                  stroke="#d1d5db"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd={`url(#arrow-${course.id})`}
                />
              )
            }),
          )}

        {/* Level 0 nodes (base prerequisites) */}
        {hasLevel0 &&
          level0Nodes.map((node, i) => {
            const x = getX(i, level0Nodes.length)
            const y = levelY[0]
            return (
              <g key={node.id}>
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  fill="#f9fafb"
                  stroke="#e5e7eb"
                  strokeWidth="1.5"
                />
                {node.id !== node.name && (
                  <text
                    x={x + NODE_W / 2}
                    y={y + 17}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    letterSpacing="0.5"
                    fill="#165a49"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.id}
                  </text>
                )}
                <text
                  x={x + NODE_W / 2}
                  y={y + 32}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="#374151"
                  fontWeight="500"
                >
                  {node.name.length > 20
                    ? node.name.slice(0, 20) + "…"
                    : node.name}
                </text>
                <text
                  x={x + NODE_W / 2}
                  y={y + 46}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#9ca3af"
                >
                  Prasyarat Dasar
                </text>
              </g>
            )
          })}

        {/* Level 1 nodes (direct prerequisites) */}
        {level1Nodes.map((node, i) => {
          const x = getX(i, level1Nodes.length)
          const y = levelY[1]
          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill="#f0fdf8"
                stroke="#93f08e"
                strokeWidth="1.5"
              />
              {node.id !== node.name && (
                <text
                  x={x + NODE_W / 2}
                  y={y + 17}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="0.5"
                  fill="#0f3e32"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {node.id}
                </text>
              )}
              <text
                x={x + NODE_W / 2}
                y={y + 32}
                textAnchor="middle"
                fontSize="10.5"
                fill="#165a49"
                fontWeight="500"
              >
                {node.name.length > 20
                  ? node.name.slice(0, 20) + "…"
                  : node.name}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 46}
                textAnchor="middle"
                fontSize="8.5"
                fill="#6b7280"
              >
                Prasyarat Langsung
              </text>
            </g>
          )
        })}

        {/* Root node (current course) */}
        {(() => {
          const x = getX(0, 1)
          const y = levelY[2]
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill="#0f3e32"
                stroke="#d7b03d"
                strokeWidth="2"
              />
              <text
                x={x + NODE_W / 2}
                y={y + 17}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                letterSpacing="0.5"
                fill="#93f08e"
                fontFamily="JetBrains Mono, monospace"
              >
                {course.code ?? course.id}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 33}
                textAnchor="middle"
                fontSize="10.5"
                fill="#ffffff"
                fontWeight="600"
              >
                {course.name.length > 20
                  ? course.name.slice(0, 20) + "…"
                  : course.name}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 47}
                textAnchor="middle"
                fontSize="8.5"
                fill="#d7b03d"
              >
                Matkul Ini
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded bg-navy border-2 border-gold" />
          <span className="text-xs text-muted">Matkul ini</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded bg-teal/10 border border-teal/60" />
          <span className="text-xs text-muted">Prasyarat langsung</span>
        </div>
        {hasLevel0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 rounded bg-background border border-border" />
            <span className="text-xs text-muted">Prasyarat dasar</span>
          </div>
        )}
      </div>
    </div>
  )
}
