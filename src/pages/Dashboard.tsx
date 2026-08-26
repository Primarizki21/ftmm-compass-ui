import React from "react"
import {
  BookOpen,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from "lucide-react"
import { SCHEDULE } from "../data"
import TimetableGrid from "../components/TimetableGrid"

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]

interface DashboardProps {
  onNavigate: (page: any) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const hasConflict = SCHEDULE.some((s) => s.conflict)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Four Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SKS Ditempuh */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-light/10 rounded-full blur-2xl group-hover:bg-teal-light/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-teal" /> SKS Ditempuh
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-heading font-bold text-navy">
              84
            </span>
            <span className="text-muted text-xs mb-1">/ 144 SKS</span>
          </div>
          <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal h-full rounded-full transition-all"
              style={{ width: "58%" }}
            />
          </div>
          <p className="text-[10px] text-muted mt-1.5 font-mono">58% selesai</p>
        </div>

        {/* Semester Aktif */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gold" /> Semester Aktif
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-heading font-bold text-navy">5</span>
            <span className="text-muted text-xs mb-1">Ganjil 24/25</span>
          </div>
          <p className="text-[10px] text-muted mt-3 font-mono">Status: Aktif</p>
        </div>

        {/* Matkul Direncanakan */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-navy-light/5 rounded-full blur-2xl group-hover:bg-navy-light/10 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-navy-light" />{" "}
            Direncanakan
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-heading font-bold text-navy">7</span>
            <span className="text-muted text-xs mb-1">Matakuliah</span>
          </div>
          <p className="text-[10px] text-muted mt-3 font-mono">Total: 21 SKS</p>
        </div>

        {/* IPK Kumulatif */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal/10 rounded-full blur-2xl group-hover:bg-teal/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-dark" /> IPK Kumulatif
          </h3>
          <div className="flex items-end gap-1.5 mt-2">
            <span className="text-3xl font-heading font-bold text-navy">
              3.75
            </span>
            <span className="text-muted text-xs mb-1">/ 4.00</span>
          </div>
          <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal h-full rounded-full"
              style={{ width: "93.75%" }}
            />
          </div>
          <p className="text-[10px] text-muted mt-1.5 font-mono">
            Predikat: Cumlaude
          </p>
        </div>
      </div>

      {/* Schedule Widget */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-navy" />
            <h3 className="font-heading font-bold text-lg text-navy">
              Jadwal Minggu Ini
            </h3>
            <span className="text-xs font-mono text-muted bg-background border border-border px-2 py-0.5 rounded">
              Ganjil 24/25 · Week 4
            </span>
            {hasConflict && (
              <span className="flex items-center gap-1 text-xs font-medium text-danger bg-danger/8 px-2 py-0.5 rounded-full border border-danger/20">
                <AlertTriangle className="w-3 h-3" /> Bentrok
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate("degree-planner")}
            className="text-sm font-medium text-navy hover:text-gold transition-colors flex items-center gap-1"
          >
            Buka di Degree Planner <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <TimetableGrid
          schedule={SCHEDULE}
          days={DAYS}
          compact
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}
