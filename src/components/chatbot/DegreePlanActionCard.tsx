import {
  GraduationCap,
  CheckCircle2,
  Check,
  Map,
  ArrowRight,
} from "lucide-react"
import { cn } from "../../utils"
import { DegreePlanPayload } from "./chatService"

export interface DegreePlanActionCardProps {
  messageId: string
  payload: DegreePlanPayload
  isApplied: boolean
  onApplyPlan: (messageId: string, payload: DegreePlanPayload) => void
}

export default function DegreePlanActionCard({
  messageId,
  payload,
  isApplied,
  onApplyPlan,
}: DegreePlanActionCardProps) {
  return (
    <div className="bg-surface border-2 border-gold/40 rounded-2xl p-5 shadow-md flex flex-col gap-4 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gold/20 text-navy rounded-lg">
            <GraduationCap className="w-5 h-5 text-gold-dark" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-navy">
              {payload.summary.program_studi}
            </h4>
            <p className="text-xs text-muted">
              Rekomendasi Rencana Studi Personal
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 bg-teal/20 text-navy font-semibold rounded-full border border-teal/30 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-dark" />
          DAG Validated
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-background/60 p-3 rounded-xl border border-border/50 text-xs">
        <div>
          <span className="text-muted block text-[10px]">Target Lulus</span>
          <span className="font-bold text-navy">
            Sem {payload.summary.target_semester}
          </span>
        </div>
        <div>
          <span className="text-muted block text-[10px]">Total Beban</span>
          <span className="font-bold text-navy">
            {payload.summary.total_credits} SKS
          </span>
        </div>
        <div>
          <span className="text-muted block text-[10px]">Fokus Utama</span>
          <span
            className="font-bold text-navy truncate block"
            title={payload.summary.focus_tracks.join(", ")}
          >
            {payload.summary.focus_tracks[0] || "General"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApplyPlan(messageId, payload)}
        disabled={isApplied}
        className={cn(
          "w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer",
          isApplied
            ? "bg-teal/20 text-navy border border-teal/40 cursor-default"
            : "bg-navy text-white hover:bg-navy-light active:scale-[0.99]",
        )}
      >
        {isApplied ? (
          <>
            <Check className="w-4 h-4 text-navy font-bold" />
            Rencana Berhasil Diterapkan ke Degree Planner
          </>
        ) : (
          <>
            <Map className="w-4 h-4 text-gold" />
            Terapkan Rencana Ini ke Degree Planner
            <ArrowRight className="w-4 h-4 ml-auto" />
          </>
        )}
      </button>
    </div>
  )
}
