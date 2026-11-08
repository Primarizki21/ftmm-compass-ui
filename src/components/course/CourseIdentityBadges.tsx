import type { Course } from "../../data"
import { cn } from "../../utils"

interface CourseIdentityBadgesProps {
  course: Course
  variant?: "overlay" | "inline"
}

export default function CourseIdentityBadges({
  course,
  variant = "inline",
}: CourseIdentityBadgesProps) {
  const overlay = variant === "overlay"
  const size = overlay ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {course.prodiAbbr && (
        <span
          className={cn(
            "rounded font-mono font-bold tracking-wide",
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
          "rounded font-mono font-bold",
          size,
          overlay ? "text-teal-light" : "bg-navy/8 text-navy",
        )}
      >
        {course.code || course.id}
      </span>
      {course.category === "pdb_univ" && (
        <span
          className={cn(
            "rounded font-bold",
            size,
            overlay
              ? "border border-purple-300/40 bg-purple-500/30 text-purple-200"
              : "border border-purple-200 bg-purple-100 text-purple-800",
          )}
        >
          PDB Univ
        </span>
      )}
      {course.category === "pdb_saintek" && (
        <span
          className={cn(
            "rounded font-bold",
            size,
            overlay
              ? "border border-teal/40 bg-teal/30 text-teal-light"
              : "border border-teal/40 bg-teal/20 text-navy",
          )}
        >
          PDB Saintek
        </span>
      )}
    </div>
  )
}
