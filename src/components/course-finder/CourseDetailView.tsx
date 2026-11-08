import { useState, useEffect } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  GraduationCap,
  BookOpen,
} from "lucide-react"
import { cn } from "../../utils"
import { Course } from "../../data"
import { type AuthUser } from "../../services/authService"
import PrerequisiteDiagram from "./PrerequisiteDiagram"
import CourseDescriptionView from "./CourseDescriptionView"
import CourseBadges from "../course/CourseBadges"
import WorkloadGrid from "../course/WorkloadGrid"

export interface CourseDetailViewProps {
  course: Course
  catalog: Course[]
  onBack: () => void
  onAdd: (c: Course) => void
  addedCourseIds: Set<string>
  currentUser?: AuthUser | null
}

export default function CourseDetailView({
  course,
  catalog,
  onBack,
  onAdd,
  addedCourseIds,
  currentUser,
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
          <h1 className="font-heading text-3xl font-bold mb-4">
            {currentCourse.name}
          </h1>
          <CourseBadges
            course={currentCourse}
            variant="overlay"
            showParity
            showLecturer
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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

        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-heading font-bold text-lg text-navy mb-3">
            Deskripsi Mata Kuliah
          </h3>
          <CourseDescriptionView text={currentCourse.desc} />
          {currentCourse.workload && (
            <div className="mt-5">
              <WorkloadGrid
                workload={currentCourse.workload}
                title="Beban Kuliah"
              />
            </div>
          )}
        </div>

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

        {currentUser?.role === "student" && (
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
                  <CheckCircle2 className="w-4 h-4" /> Sudah Ditambahkan ke
                  Degree Planner
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Tambahkan ke Degree Planner
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
