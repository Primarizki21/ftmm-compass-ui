import React from "react"
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Lock,
  Clock,
  Bookmark,
  GripVertical,
} from "lucide-react"
import { PlacedCourse, isSemLocked } from "./types"

interface PlannerHeaderProps {
  appliedSummary?: {
    program_studi: string
    total_credits: number
    target_semester: number
    focus_tracks: string[]
    note?: string
  } | null
  onResetPlan?: () => void
  dragging: {
    course: PlacedCourse
    fromSem: number | "bank"
    fromIndex?: number
  } | null
}

const LEGEND_ITEMS = [
  {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal" />,
    label: "Selesai",
    badge: "Lulus (Terkunci)",
    badgeStyle: "bg-teal/10 text-navy border-teal/30",
  },
  {
    icon: <Lock className="w-3.5 h-3.5 text-muted/70" />,
    label: "Wajib",
    badge: "Urutan Atas/Bawah (Tetap di Sem)",
    badgeStyle: "bg-navy/8 text-navy border-navy/20",
  },
  {
    icon: <Clock className="w-3.5 h-3.5 text-gold" />,
    label: "Direncanakan",
    badge: "Geser Sem & Atas/Bawah ⋮⋮",
    badgeStyle: "bg-gold/15 text-navy border-gold/40",
  },
  {
    icon: <Bookmark className="w-3.5 h-3.5 text-muted" />,
    label: "Wishlist",
    badge: "Geser Sem, Atas/Bawah & Hapus",
    badgeStyle: "bg-surface text-muted border-dashed border-border",
  },
] as const

export default function PlannerHeader({
  appliedSummary,
  onResetPlan,
  dragging,
}: PlannerHeaderProps) {
  return (
    <>
      {/* AI Generated Plan Banner */}
      {appliedSummary && (
        <div className="mb-4 p-4 bg-teal/15 border border-teal/40 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy text-gold rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-navy flex items-center gap-2">
                Rencana Studi Personalisasi Compass AI
                <span className="text-[10px] font-mono px-2 py-0.5 bg-navy text-white rounded-full">
                  {appliedSummary.program_studi}
                </span>
              </h4>
              <p className="text-xs text-muted">
                Target Lulus:{" "}
                <strong>Semester {appliedSummary.target_semester}</strong> •
                Total Beban: <strong>{appliedSummary.total_credits} SKS</strong>{" "}
                • Fokus:{" "}
                <strong>{appliedSummary.focus_tracks.join(", ")}</strong>
              </p>
            </div>
          </div>
          {onResetPlan && (
            <button
              onClick={onResetPlan}
              className="px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/10 rounded-lg transition-colors flex items-center gap-1.5 border border-navy/20 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          )}
        </div>
      )}

      {/* Header & Legend */}
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="font-heading font-bold text-lg text-navy mb-1">
            Rencana Studi (Roadmap)
          </h3>
          <p className="text-sm text-muted">
            Matkul <span className="font-medium text-navy">Wajib</span> otomatis
            terkunci di semesternya. Matkul{" "}
            <span className="font-medium text-navy">Pilihan</span> dapat
            dipindah-pindah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs shadow-2xs"
            >
              {item.icon}
              <span className="font-semibold text-navy">{item.label}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border leading-none font-medium ${item.badgeStyle}`}
              >
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Drag hint */}
      {dragging && (
        <div className="mb-3 p-3 bg-navy/5 border border-navy/15 rounded-lg flex items-center gap-3 text-sm flex-shrink-0 animate-in fade-in duration-150">
          <GripVertical className="w-4 h-4 text-navy/40" />
          <span className="text-navy">
            <strong>{dragging.course.name}</strong>
            {isSemLocked(dragging.course) ? (
              <>
                {" "}
                — matkul <strong>Wajib</strong>: hanya dapat diatur urutan
                (atas/bawah) di <strong>Semester {dragging.fromSem}</strong>.
              </>
            ) : (
              <>
                {" "}
                — matkul <strong>Pilihan</strong>: dapat dipindah ke semester{" "}
                <strong>
                  {dragging.course.parity === "odd"
                    ? "ganjil (1, 3, 5, 7)"
                    : "genap (2, 4, 6, 8)"}
                </strong>{" "}
                dan diatur urutan atas/bawah.
              </>
            )}
          </span>
        </div>
      )}
    </>
  )
}
