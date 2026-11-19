import { AlertCircle, X } from "lucide-react"
import type { PollingPeriod } from "@/features/polling/pollingService"
import type { Course } from "@/shared/domain/models"
import { cn } from "@/shared/utils"

interface VotePriorityModalProps {
  course: Course | null
  priority: 1 | 2 | 3
  onPriorityChange: (priority: 1 | 2 | 3) => void
  isVoted: boolean
  remainingSlots: number
  maxVotes: number
  pollingPeriod: PollingPeriod | null
  isSubmitting: boolean
  error: string | null
  onSave: () => void
  onRemove: (courseId: string) => void
  onClose: () => void
}

export default function VotePriorityModal({
  course,
  priority,
  onPriorityChange,
  isVoted,
  remainingSlots,
  maxVotes,
  pollingPeriod,
  isSubmitting,
  error,
  onSave,
  onRemove,
  onClose,
}: VotePriorityModalProps) {
  if (!course) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
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
              {course.name}
            </h3>
            <p className="text-xs text-muted font-mono">
              {course.code || course.id} &bull; {course.credits} SKS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-navy hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
          <span className="text-muted font-medium">
            Slot Wishlist Tersedia:
          </span>
          <span className="font-mono font-bold text-navy">
            {isVoted
              ? `${remainingSlots} slot tersisa (terdaftar)`
              : `${remainingSlots} dari ${maxVotes} slot tersisa`}
          </span>
        </div>

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
                onClick={() => onPriorityChange(item.level)}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                  priority === item.level
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

        <div className="text-[11px] text-muted flex items-start gap-2 bg-gold/10 text-navy p-3 rounded-xl border border-gold/30">
          <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
          <p>
            {pollingPeriod
              ? `Mata kuliah pilihan memerlukan minimal ${pollingPeriod.min_quorum} peminat agar diusulkan buka pada semester depan.`
              : "Ambang kuorum belum tersedia karena periode polling belum dimuat."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="text-[11px] font-medium text-orange bg-orange/10 p-3 rounded-xl border border-orange/30"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {isVoted ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onRemove(course.id)}
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted hover:text-navy hover:bg-background transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting || (!isVoted && remainingSlots <= 0)}
              onClick={onSave}
              className="px-4 py-2 rounded-xl bg-gold text-navy text-xs font-bold hover:bg-gold/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Wishlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
