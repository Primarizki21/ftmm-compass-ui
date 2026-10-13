import React from "react"
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react"
import { cn } from "../../utils"
import { Course } from "../../data"
import PrerequisiteDiagram from "./PrerequisiteDiagram"

export interface CourseDetailViewProps {
  course: Course
  onBack: () => void
  onAdd: (c: Course) => void
  addedCourseIds: Set<string>
}

export default function CourseDetailView({
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
          className="relative z-10 flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4 text-sm font-medium cursor-pointer"
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
              "w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
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
