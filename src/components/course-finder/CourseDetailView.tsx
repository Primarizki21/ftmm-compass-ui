import React, { useState, useEffect } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  GraduationCap,
  BookOpen,
} from "lucide-react"
import { cn } from "../../utils"
import { Course } from "../../data"
import PrerequisiteDiagram from "./PrerequisiteDiagram"
import CourseDescriptionView from "./CourseDescriptionView"

export interface CourseDetailViewProps {
  course: Course
  catalog?: Course[]
  onBack: () => void
  onAdd: (c: Course) => void
  addedCourseIds: Set<string>
}

export default function CourseDetailView({
  course,
  catalog,
  onBack,
  onAdd,
  addedCourseIds,
}: CourseDetailViewProps) {
  const [currentCourse, setCurrentCourse] = useState<Course>(course)
  const [navHistory, setNavHistory] = useState<Course[]>([])

  useEffect(() => {
    setCurrentCourse(course)
    setNavHistory([])
  }, [course])

  const handleSelectCourse = (target: Course) => {
    setNavHistory((prev) => [...prev, currentCourse])
    setCurrentCourse(target)
  }

  const handleBack = () => {
    if (navHistory.length > 0) {
      const prevCourse = navHistory[navHistory.length - 1]
      setNavHistory((prev) => prev.slice(0, -1))
      setCurrentCourse(prevCourse)
    } else {
      onBack()
    }
  }

  const lastHistoryCourse =
    navHistory.length > 0 ? navHistory[navHistory.length - 1] : null

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-navy text-white rounded-xl p-6 mb-5 relative overflow-hidden flex-shrink-0">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-48 h-48 bg-teal/5 rounded-full blur-2xl" />
        <button
          onClick={handleBack}
          className="relative z-10 flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4 text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {lastHistoryCourse
            ? `Kembali ke ${
                lastHistoryCourse.code ? `[${lastHistoryCourse.code}] ` : ""
              }${lastHistoryCourse.name}`
            : "Kembali ke Daftar Matkul"}
        </button>
        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-teal-light font-bold">
              {currentCourse.code ?? currentCourse.id}
            </span>
            {currentCourse.prodiAbbr && (
              <span
                className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-white/20 text-white tracking-wide"
                title={`Program Studi: ${currentCourse.program}`}
              >
                {currentCourse.prodiAbbr} &bull; {currentCourse.program}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold mt-1 mb-4">
            {currentCourse.name}
          </h1>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              {currentCourse.credits} SKS
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              Semester {currentCourse.semester}
            </span>
            <span className="px-3 py-1 bg-gold/20 text-gold rounded-md text-sm font-bold uppercase tracking-wide border border-gold/30 backdrop-blur-sm">
              {currentCourse.type}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-md text-sm font-medium backdrop-blur-sm">
              Ditawarkan Sem{" "}
              {currentCourse.parity === "odd"
                ? "Ganjil (1, 3, 5, 7)"
                : "Genap (2, 4, 6, 8)"}
            </span>
            {currentCourse.category === "pdb_univ" && (
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-300/40 rounded-md text-sm font-bold backdrop-blur-sm">
                PDB Universitas
              </span>
            )}
            {currentCourse.category === "pdb_saintek" && (
              <span className="px-3 py-1 bg-teal/30 text-teal-light border border-teal/40 rounded-md text-sm font-bold backdrop-blur-sm">
                PDB Saintek
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Academic Classification Callout */}
        {currentCourse.category === "pdb_univ" && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg flex-shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-purple-900 mb-1">
                Pembelajaran Dasar Bersama (PDB) Tingkat Universitas
              </h3>
              <p className="text-xs text-purple-800 leading-relaxed">
                Mata kuliah wajib kurikulum nasional/universitas serta fondasi
                sains dasar yang diselenggarakan oleh Direktorat Pendidikan
                UNAIR. Diikuti secara terpadu oleh mahasiswa tingkat pertama
                (Semester 1–2).
              </p>
            </div>
          </div>
        )}

        {currentCourse.category === "pdb_saintek" && (
          <div className="bg-teal/10 border border-teal/30 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-teal/20 text-navy rounded-lg flex-shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-navy mb-1">
                Mata Kuliah PDB Saintek (Terapan Dasar FTMM)
              </h3>
              <p className="text-xs text-navy/80 leading-relaxed">
                Mata kuliah terapan sains dan rekayasa dasar bersama fakultas
                FTMM yang diambil oleh mahasiswa di lingkungan FTMM pada
                Semester 1 dan 2.
              </p>
            </div>
          </div>
        )}

        {currentCourse.category === "prodi" &&
          currentCourse.name.toLowerCase().includes("agama") && (
            <div className="bg-navy/5 border border-navy/15 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-navy/10 text-navy rounded-lg flex-shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-navy mb-1">
                  Mata Kuliah Agama Lanjutan (Kelas Khusus Program Studi{" "}
                  {currentCourse.prodiAbbr})
                </h3>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Berbeda dengan mata kuliah Agama 1 di semester 1 yang
                  merupakan kelas campur PDB se-UNAIR, mata kuliah Agama 2 ini
                  berfokus pada etika keilmuan dan profesi yang diselenggarakan
                  khusus dalam kelas per program studi.
                </p>
              </div>
            </div>
          )}

        {/* Description + Workload */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-heading font-bold text-lg text-navy mb-3">
            Deskripsi Mata Kuliah
          </h3>
          <CourseDescriptionView text={currentCourse.desc} />
          {currentCourse.workload && (
            <div className="mt-5 bg-background rounded-lg p-4 grid grid-cols-3 gap-4 text-center divide-x divide-border">
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {currentCourse.workload.hours}
                </div>
                <div className="text-xs text-muted mt-1">Jam/Semester</div>
              </div>
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {currentCourse.workload.lectureCredits}
                </div>
                <div className="text-xs text-muted mt-1">SKS Kuliah</div>
              </div>
              <div>
                <div className="text-2xl font-heading font-bold text-navy">
                  {currentCourse.workload.labCredits}
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
          <PrerequisiteDiagram
            course={currentCourse}
            catalog={catalog}
            onSelectCourse={handleSelectCourse}
          />
        </div>

        {/* Action */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <button
            onClick={() => onAdd(currentCourse)}
            disabled={addedCourseIds.has(currentCourse.id)}
            className={cn(
              "w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
              addedCourseIds.has(currentCourse.id)
                ? "bg-teal/10 text-teal border border-teal/30 cursor-default"
                : "bg-navy text-white hover:bg-navy-light",
            )}
          >
            {addedCourseIds.has(currentCourse.id) ? (
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
