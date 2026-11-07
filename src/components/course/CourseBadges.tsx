import type { Course } from "../../data"
import { cn } from "../../utils"

interface CourseBadgesProps {
  course: Course
  variant?: "overlay" | "inline"
  showParity?: boolean
  showLecturer?: boolean
  children?: React.ReactNode
}

/** Kluster badge mata kuliah: prodi, kode, SKS/semester, tipe, dan kategori kurikulum. */
export default function CourseBadges({
  course,
  variant = "inline",
  showParity = false,
  showLecturer = false,
  children,
}: CourseBadgesProps) {
  const overlay = variant === "overlay"
  const chip = overlay
    ? "bg-white/10 text-white backdrop-blur-sm"
    : "bg-navy/8 text-navy"
  const size = overlay ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {course.prodiAbbr && (
        <span
          className={cn(
            "font-mono font-bold tracking-wide rounded",
            size,
            overlay ? "bg-white/20 text-white" : "bg-navy text-white",
          )}
          title={`Program Studi: ${course.program}`}
        >
          {course.prodiAbbr}
        </span>
      )}
      <span
        className={cn(
          "font-mono font-bold rounded",
          size,
          overlay ? "text-teal-light" : "bg-navy/8 text-navy",
        )}
      >
        {course.code || course.id}
      </span>
      <span className={cn("font-medium rounded", size, chip)}>
        {course.credits} SKS
      </span>
      <span className={cn("font-medium rounded", size, chip)}>
        Semester {course.semester}
      </span>
      <span
        className={cn(
          "font-bold uppercase tracking-wide rounded",
          size,
          overlay
            ? "bg-gold/20 text-gold border border-gold/30"
            : course.type === "Wajib"
              ? "bg-navy/10 text-navy"
              : "bg-gold/15 text-navy",
        )}
      >
        {course.type}
      </span>
      {course.category === "pdb_univ" && (
        <span
          className={cn(
            "font-bold rounded",
            size,
            overlay
              ? "bg-purple-500/30 text-purple-200 border border-purple-300/40"
              : "bg-purple-100 text-purple-800 border border-purple-200",
          )}
        >
          PDB Univ
        </span>
      )}
      {course.category === "pdb_saintek" && (
        <span
          className={cn(
            "font-bold rounded",
            size,
            overlay
              ? "bg-teal/30 text-teal-light border border-teal/40"
              : "bg-teal/20 text-navy border border-teal/40",
          )}
        >
          PDB Saintek
        </span>
      )}
      {showParity && (
        <span className={cn("font-medium rounded", size, chip)}>
          Ditawarkan Sem{" "}
          {course.parity === "odd"
            ? "Ganjil (1, 3, 5, 7)"
            : "Genap (2, 4, 6, 8)"}
        </span>
      )}
      {showLecturer && (
        <span className={cn("font-medium rounded", size, chip)}>
          {course.lecturer || "Dosen Pengampu FTMM"}
        </span>
      )}
      {children}
    </div>
  )
}
