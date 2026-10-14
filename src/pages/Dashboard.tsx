import { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Download,
  Filter,
  Flame,
  Users,
  GraduationCap,
} from "lucide-react"
import { SCHEDULE, TIMETABLE_DAYS, ScheduleItem } from "../data"
import TimetableGrid from "../components/TimetableGrid"
import { type AuthUser } from "../services/authService"
import {
  pollingService,
  type DemandAnalyticsResponse,
  type PollingPeriod,
} from "../services/pollingService"

interface DashboardProps {
  onNavigate: (page: string) => void
  schedule?: ScheduleItem[]
  currentUser?: AuthUser | null
}
export default function Dashboard({
  onNavigate,
  schedule,
  currentUser,
}: DashboardProps) {
  const activeSchedule = schedule || SCHEDULE
  const hasConflict = activeSchedule.some((s) => s.conflict)

  const [selectedProdi, setSelectedProdi] = useState<string>("all")
  const [demandAnalytics, setDemandAnalytics] =
    useState<DemandAnalyticsResponse | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [pollingPeriod, setPollingPeriod] = useState<PollingPeriod | null>(null)

  useEffect(() => {
    let mounted = true
    setIsLoadingAnalytics(true)
    Promise.all([
      pollingService.getActivePeriod(),
      pollingService.getDemandAnalytics(selectedProdi),
    ])
      .then(([period, analytics]) => {
        if (!mounted) return
        setPollingPeriod(period)
        setDemandAnalytics(analytics)
      })
      .finally(() => {
        if (mounted) setIsLoadingAnalytics(false)
      })
    return () => {
      mounted = false
    }
  }, [selectedProdi])

  const items = useMemo(() => demandAnalytics?.items || [], [demandAnalytics])

  const handleExportCSV = () => {
    if (!items.length) return
    const headers = [
      "Kode MK",
      "Nama Mata Kuliah",
      "Program Studi",
      "SKS",
      "Total Peminat",
      "Prioritas 1",
      "Prioritas 2",
      "Prioritas 3",
      "Min Quorum",
      "Status",
      "Proyeksi Kelas",
    ]

    const rows = items.map((it) => [
      `"${it.course_code}"`,
      `"${it.course_name.replace(/"/g, '""')}"`,
      `"${it.study_program}"`,
      it.credits,
      it.total_votes,
      it.priority_1_votes,
      it.priority_2_votes,
      it.priority_3_votes,
      it.min_quorum,
      it.status,
      it.projected_classes,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `rekap_peminatan_mk_pilihan_${selectedProdi}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
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
          schedule={activeSchedule}
          days={TIMETABLE_DAYS}
          compact
          onNavigate={onNavigate}
        />
      </div>

      {/* Pre-KRS Elective Wishlist & Demand Forecasting Analytics (Dosen / Kaprodi / Akademik) */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-navy/10 text-navy flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-lg text-navy">
                  Rekap Analitik Peminatan MK Pilihan (Pre-KRS)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-navy border border-gold/30">
                  {pollingPeriod?.term === "genap"
                    ? "Semester Genap"
                    : "Semester Ganjil"}{" "}
                  {pollingPeriod?.academic_year || "2024/2025"}
                </span>
                {currentUser?.role && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-navy/10 text-navy border border-navy/20">
                    Role: {currentUser.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Monitoring kuota real-time dan proyeksi pembukaan kelas untuk
                Kaprodi &amp; Dosen FTMM UNAIR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {/* Prodi Filter */}
            <div className="relative">
              <select
                value={selectedProdi}
                onChange={(e) => setSelectedProdi(e.target.value)}
                className="h-9 pl-8 pr-8 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:border-gold focus:border-gold focus:ring-1 focus:ring-gold outline-hidden cursor-pointer appearance-none transition-colors"
                aria-label="Filter Program Studi Analitik"
              >
                <option value="all">Semua Prodi FTMM</option>
                <option value="Teknologi Sains Data">
                  Teknologi Sains Data (TSD)
                </option>
                <option value="Rekayasa Nanoteknologi">
                  Rekayasa Nanoteknologi (RN)
                </option>
                <option value="Teknik Industri">Teknik Industri (TI)</option>
                <option value="Teknik Elektro">Teknik Elektro (TE)</option>
                <option value="TRKB">TRKB</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!items.length || isLoadingAnalytics}
              className="h-9 px-3.5 rounded-lg bg-navy hover:bg-navy-light text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Summary Mini Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-muted block text-[11px]">
              Total Mahasiswa Partisipan
            </span>
            <span className="text-xl font-heading font-bold text-navy flex items-center gap-1.5 mt-0.5">
              <Users className="w-4 h-4 text-teal" />
              {demandAnalytics?.total_students_voted || 0}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-muted block text-[11px]">
              Mata Kuliah Qualified (&ge; 15)
            </span>
            <span className="text-xl font-heading font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {items.filter((i) => i.status === "QUALIFIED").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-muted block text-[11px]">
              Mata Kuliah Borderline (10–14)
            </span>
            <span className="text-xl font-heading font-bold text-amber-700 flex items-center gap-1.5 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {items.filter((i) => i.status === "BORDERLINE").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-muted block text-[11px]">
              Total Proyeksi Kelas
            </span>
            <span className="text-xl font-heading font-bold text-navy flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="w-4 h-4 text-gold" />
              {items.reduce((acc, curr) => acc + curr.projected_classes, 0)}{" "}
              Kelas
            </span>
          </div>
        </div>

        {/* Demand Forecasting Table */}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-3.5 py-3 font-semibold">Kode MK</th>
                <th className="px-3.5 py-3 font-semibold">Mata Kuliah</th>
                <th className="px-3.5 py-3 font-semibold">Prodi</th>
                <th className="px-3.5 py-3 font-semibold text-center">SKS</th>
                <th className="px-3.5 py-3 font-semibold text-center">
                  Total Peminat
                </th>
                <th className="px-3.5 py-3 font-semibold text-center">
                  Prioritas 1
                </th>
                <th className="px-3.5 py-3 font-semibold text-center">
                  Status
                </th>
                <th className="px-3.5 py-3 font-semibold text-center">
                  Proyeksi Kelas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Tidak ada data analitik untuk filter prodi ini.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.course_id}
                    className="hover:bg-background/60 transition-colors"
                  >
                    <td className="px-3.5 py-3 font-mono font-bold text-navy">
                      {row.course_code}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-foreground">
                      {row.course_name}
                    </td>
                    <td className="px-3.5 py-3 text-muted">
                      <span className="inline-block px-1.5 py-0.5 bg-background border border-border rounded font-mono text-[10px]">
                        {row.program_code || row.study_program}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono">
                      {row.credits}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="font-bold font-mono text-navy inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange" />
                        {row.total_votes}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono font-semibold text-navy">
                      {row.priority_1_votes}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {row.status === "QUALIFIED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          QUALIFIED
                        </span>
                      )}
                      {row.status === "BORDERLINE" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          BORDERLINE
                        </span>
                      )}
                      {row.status === "UNQUALIFIED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                          UNQUALIFIED
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="font-mono font-bold text-navy px-2 py-0.5 rounded bg-background border border-border">
                        {row.projected_classes > 0
                          ? `${row.projected_classes} Kelas`
                          : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
