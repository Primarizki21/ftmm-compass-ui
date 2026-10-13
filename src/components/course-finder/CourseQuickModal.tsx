import React from "react"
import {
  X,
  CheckCircle2,
  Plus,
  ChevronRight,
  GraduationCap,
  BookOpen,
} from "lucide-react"
import { cn } from "../../utils"
import { Course } from "../../data"
export interface CourseQuickModalProps {
  course: Course | null
  addedCourseIds: Set<string>
  onClose: () => void
  onAddToPlanner: (course: Course) => void
  onOpenDetail: (course: Course) => void
}

export default function CourseQuickModal({
  course,
  addedCourseIds,
  onClose,
  onAddToPlanner,
  onOpenDetail,
}: CourseQuickModalProps) {
  if (!course) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-navy text-white p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 bottom-0 w-32 h-32 bg-teal/8 rounded-full blur-2xl" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white z-10 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-teal-light font-bold text-sm">
                {course.code ?? course.id}
              </span>
              {course.prodiAbbr && (
                <span
                  className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-mono font-bold tracking-wide"
                  title={`Program Studi: ${course.program}`}
                >
                  {course.prodiAbbr}
                </span>
              )}
            </div>
            <h2 className="font-heading text-2xl font-bold mt-1 mb-4">
              {course.name}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                {course.credits} SKS
              </span>
              <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                Semester {course.semester}
              </span>
              <span className="px-2.5 py-1 bg-gold/20 text-gold rounded-md text-xs font-bold uppercase tracking-wide backdrop-blur-sm border border-gold/30">
                {course.type}
              </span>
              <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-medium backdrop-blur-sm">
                {course.parity === "odd" ? "Sem Ganjil" : "Sem Genap"}
              </span>
              {course.category === "pdb_univ" && (
                <span className="px-2.5 py-1 bg-purple-500/30 text-purple-200 border border-purple-300/40 rounded-md text-xs font-bold backdrop-blur-sm">
                  PDB Univ (Campur)
                </span>
              )}
              {course.category === "pdb_faculty" && (
                <span className="px-2.5 py-1 bg-teal/30 text-teal-light border border-teal/40 rounded-md text-xs font-bold backdrop-blur-sm">
                  PDB FTMM (Sains Dasar)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {course.category === "pdb_univ" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg flex-shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-purple-900 mb-0.5">
                  Mata Kuliah PDB Universitas (Kelas Campur)
                </div>
                <p className="text-purple-800 leading-relaxed">
                  Pembelajaran Dasar Bersama (PDB) Universitas Airlangga. Kelas
                  diikuti secara gabungan oleh mahasiswa dari berbagai fakultas
                  se-UNAIR (Semester 1–2).
                </p>
              </div>
            </div>
          )}

          {course.category === "pdb_faculty" && (
            <div className="bg-teal/10 border border-teal/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-1.5 bg-teal/20 text-navy rounded-lg flex-shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-navy mb-0.5">
                  Mata Kuliah Dasar Bersama FTMM (STEM Dasar)
                </div>
                <p className="text-navy/80 leading-relaxed">
                  Mata kuliah dasar sains dan rekayasa bersama tingkat fakultas.
                  Diikuti oleh mahasiswa seluruh program studi di FTMM (Semester
                  1–2).
                </p>
              </div>
            </div>
          )}

          {course.category === "prodi" &&
            course.name.toLowerCase().includes("agama") && (
              <div className="bg-navy/5 border border-navy/15 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-1.5 bg-navy/10 text-navy rounded-lg flex-shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-navy mb-0.5">
                    Mata Kuliah Agama Lanjutan (Kelas Khusus Prodi{" "}
                    {course.prodiAbbr})
                  </div>
                  <p className="text-foreground/80 leading-relaxed">
                    Mata kuliah etika profesi keagamaan tingkat lanjut. Berbeda
                    dengan Agama 1, kelas ini diselenggarakan khusus per program
                    studi.
                  </p>
                </div>
              </div>
            )}

          <div>
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Deskripsi
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {course.desc}
            </p>
          </div>
          {course.prerequisites && course.prerequisites.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Prasyarat
              </h3>
              <ul className="space-y-2">
                {course.prerequisites.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
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

          {course.workload && (
            <div>
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Beban Kuliah
              </h3>
              <div className="bg-background rounded-lg p-3 grid grid-cols-3 gap-3 text-center divide-x divide-border">
                <div>
                  <div className="text-xl font-heading font-bold text-navy">
                    {course.workload.hours}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">Jam/Sem</div>
                </div>
                <div>
                  <div className="text-xl font-heading font-bold text-navy">
                    {course.workload.lectureCredits}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    SKS Kuliah
                  </div>
                </div>
                <div>
                  <div className="text-xl font-heading font-bold text-navy">
                    {course.workload.labCredits}
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
            type="button"
            onClick={() => onAddToPlanner(course)}
            disabled={addedCourseIds.has(course.id)}
            className={cn(
              "py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
              addedCourseIds.has(course.id)
                ? "bg-teal/10 text-teal border border-teal/30 cursor-default"
                : "bg-navy text-white hover:bg-navy-light",
            )}
          >
            {addedCourseIds.has(course.id) ? (
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
            type="button"
            onClick={() => onOpenDetail(course)}
            className="py-2.5 rounded-lg border border-border text-sm font-medium text-navy hover:border-gold hover:bg-gold/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" /> Detail Lengkap
          </button>
        </div>
      </div>
    </div>
  )
}
