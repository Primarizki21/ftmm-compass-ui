import type { Course } from "../../data"
import { cn } from "../../utils"
import CourseIdentityBadges from "./CourseIdentityBadges"

interface CourseBadgesProps {
  course: Course
  variant?: "overlay" | "inline"
  showParity?: boolean
  showLecturer?: boolean
  children?: React.ReactNode
}

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
      <CourseIdentityBadges course={course} variant={variant} />
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
