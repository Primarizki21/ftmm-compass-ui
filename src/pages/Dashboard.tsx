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
  Award,
  Activity,
  Server,
  Database,
  Sparkles,
  UserCheck,
  ShieldAlert,
} from "lucide-react"
import { SCHEDULE, TIMETABLE_DAYS, ScheduleItem } from "../data"
import TimetableGrid from "../components/TimetableGrid"
import { type AuthUser } from "../services/authService"
import {
  pollingService,
  type DemandAnalyticsResponse,
  type PollingPeriod,
  type StudentVote,
} from "../services/pollingService"
import {
  dashboardService,
  type DashboardMeResponse,
} from "../services/dashboardService"
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
  const [dashboardData, setDashboardData] =
    useState<DashboardMeResponse | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(true)

  const displayedSchedule = useMemo<ScheduleItem[]>(() => {
    if (currentUser?.role === "admin") return []
    if (currentUser?.role === "lecturer") {
      if (dashboardData?.schedule?.length) {
        return dashboardData.schedule.map((item) => {
          const [sh, sm] = (item.start_time || "08:00").split(":").map(Number)
          const [eh, em] = (item.end_time || "10:00").split(":").map(Number)
          const startHour = (sh || 0) + (sm || 0) / 60
          const endHour = (eh || 0) + (em || 0) / 60
          const duration = Math.max(1, endHour - startHour)
          return {
            id: item.id,
            course: item.course_name,
            code: item.course_code,
            day: item.day,
            start: startHour,
            duration: duration,
            color: item.color || "teal",
            room: item.room,
            sectionCode: item.class_name,
            lecturer: item.lecturer,
          }
        })
      }
      return []
    }
    if (schedule && schedule.length > 0) return schedule
    if (!dashboardData?.schedule?.length) return SCHEDULE
    return dashboardData.schedule.map((item) => {
      const [sh, sm] = (item.start_time || "08:00").split(":").map(Number)
      const [eh, em] = (item.end_time || "10:00").split(":").map(Number)
      const startHour = (sh || 0) + (sm || 0) / 60
      const endHour = (eh || 0) + (em || 0) / 60
      const duration = Math.max(1, endHour - startHour)
      return {
        id: item.id,
        course: item.course_name,
        code: item.course_code,
        day: item.day,
        start: startHour,
        duration: duration,
        color: item.color || "teal",
        room: item.room,
        sectionCode: item.class_name,
        lecturer: item.lecturer,
      }
    })
  }, [currentUser?.role, dashboardData, schedule])

  const hasConflict = displayedSchedule.some((s) => s.conflict)

  const [selectedProdi, setSelectedProdi] = useState<string>("all")
  const [demandAnalytics, setDemandAnalytics] =
    useState<DemandAnalyticsResponse | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [pollingPeriod, setPollingPeriod] = useState<PollingPeriod | null>(null)
  const [studentVotes, setStudentVotes] = useState<StudentVote[]>([])

  useEffect(() => {
    let mounted = true
    setIsLoadingDashboard(true)
    dashboardService
      .getDashboardMe()
      .then((data) => {
        if (mounted) setDashboardData(data)
      })
      .catch(() => {
        // Fallback anggap aman jika offline
      })
      .finally(() => {
        if (mounted) setIsLoadingDashboard(false)
      })
    return () => {
      mounted = false
    }
  }, [currentUser])
  useEffect(() => {
    let mounted = true
    setIsLoadingAnalytics(true)

    if (currentUser?.role === "student") {
      Promise.all([
        pollingService.getActivePeriod(),
        pollingService.getMyVotes(),
      ])
        .then(([period, votes]) => {
          if (!mounted) return
          setPollingPeriod(period)
          setStudentVotes(votes)
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setIsLoadingAnalytics(false)
        })
    } else {
      Promise.all([
        pollingService.getActivePeriod(),
        pollingService.getDemandAnalytics(selectedProdi),
      ])
        .then(([period, analytics]) => {
          if (!mounted) return
          setPollingPeriod(period)
          setDemandAnalytics(analytics)
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setIsLoadingAnalytics(false)
        })
    }

    return () => {
      mounted = false
    }
  }, [selectedProdi, currentUser])

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
  if (isLoadingDashboard && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-xs font-mono">Memuat data dashboard akademik...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Four Stat Cards */}
      {/* Four Dynamic Stat Cards Based on Role */}
      {dashboardData?.stats?.type === "lecturer" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Matakuliah Diampu */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-navy-light/10 rounded-full blur-2xl group-hover:bg-navy-light/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-navy" /> Mata Kuliah Diampu
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.courses_taught}
              </span>
              <span className="text-muted text-xs mb-1">Matakuliah</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              3 Kelas Paralel Aktif
            </p>
          </div>

          {/* Beban SKS Mengajar */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gold" /> Beban Mengajar (BKD)
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.sks_taught}
              </span>
              <span className="text-muted text-xs mb-1">
                / 12 SKS Standar BKD
              </span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gold h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (dashboardData.stats.sks_taught / 12) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1.5 font-mono">
              Pemenuhan:{" "}
              {Math.round((dashboardData.stats.sks_taught / 12) * 100)}%
              tridharma pengajaran
            </p>
          </div>

          {/* Mahasiswa Diajar */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal/10 rounded-full blur-2xl group-hover:bg-teal/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-teal" /> Total Mahasiswa
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.total_students}
              </span>
              <span className="text-muted text-xs mb-1">Mahasiswa</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Bimbingan Wali: {dashboardData.stats.advisee_students} Mahasiswa
            </p>
          </div>

          {/* Status Dosen */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-dark/10 rounded-full blur-2xl group-hover:bg-teal-dark/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-teal-dark" /> Status Penugasan
            </h3>
            <div className="flex items-end gap-1.5 mt-2">
              <span className="text-2xl font-heading font-bold text-navy">
                {dashboardData.stats.status}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Program Studi: Teknologi Sains Data
            </p>
          </div>
        </div>
      ) : dashboardData?.stats?.type === "admin" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Mahasiswa */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal/10 rounded-full blur-2xl group-hover:bg-teal/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-teal" /> Mahasiswa Aktif
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.total_active_students.toLocaleString(
                  "id-ID",
                )}
              </span>
              <span className="text-muted text-xs mb-1">Mahasiswa</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Tersebar di 5 Program Studi
            </p>
          </div>

          {/* Total Dosen */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-gold" /> Dosen Pengajar
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.total_lecturers}
              </span>
              <span className="text-muted text-xs mb-1">Dosen</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Dosen Tetap &amp; LB FTMM
            </p>
          </div>

          {/* Total Kurikulum & Matkul */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-navy-light/10 rounded-full blur-2xl group-hover:bg-navy-light/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-navy" /> Kurikulum &amp; MK
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData.stats.total_courses}
              </span>
              <span className="text-muted text-xs mb-1">Mata Kuliah</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              {dashboardData.stats.total_study_programs} Program Studi Aktif
            </p>
          </div>

          {/* Status Sistem & Polling */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-dark/10 rounded-full blur-2xl group-hover:bg-teal-dark/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-teal-dark" /> Periode Aktif
            </h3>
            <div className="flex items-end gap-1.5 mt-2">
              <span className="text-xl font-heading font-bold text-navy">
                {dashboardData.stats.active_polling_period}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Status: {dashboardData.stats.system_status}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SKS Ditempuh */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-light/10 rounded-full blur-2xl group-hover:bg-teal-light/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-teal" /> SKS Ditempuh
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.sks_completed
                  : 44}
              </span>
              <span className="text-muted text-xs mb-1">
                /{" "}
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.sks_target
                  : 144}{" "}
                SKS
              </span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-teal h-full rounded-full transition-all"
                style={{
                  width: `${
                    dashboardData?.stats?.type === "student"
                      ? dashboardData.stats.completion_percentage
                      : 30.5
                  }%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1.5 font-mono">
              {dashboardData?.stats?.type === "student"
                ? `${dashboardData.stats.completion_percentage.toFixed(1)}% selesai`
                : "30.5% selesai"}
            </p>
          </div>

          {/* Semester Aktif */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gold" /> Semester Aktif
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.current_semester
                  : 3}
              </span>
              <span className="text-muted text-xs mb-1">
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.term_name
                  : "Ganjil 24/25"}
              </span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Status: Mahasiswa Aktif
            </p>
          </div>

          {/* Matkul Direncanakan */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-navy-light/5 rounded-full blur-2xl group-hover:bg-navy-light/10 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-navy-light" />{" "}
              Direncanakan
            </h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.courses_planned
                  : 6}
              </span>
              <span className="text-muted text-xs mb-1">Matakuliah</span>
            </div>
            <p className="text-[10px] text-muted mt-3 font-mono">
              Total:{" "}
              {dashboardData?.stats?.type === "student"
                ? dashboardData.stats.sks_planned
                : 20}{" "}
              SKS
            </p>
          </div>

          {/* IPK Kumulatif */}
          <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal/10 rounded-full blur-2xl group-hover:bg-teal/20 transition-colors" />
            <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-teal-dark" /> IPK
              Kumulatif
            </h3>
            <div className="flex items-end gap-1.5 mt-2">
              <span className="text-3xl font-heading font-bold text-navy">
                {dashboardData?.stats?.type === "student"
                  ? dashboardData.stats.gpa.toFixed(2)
                  : "3.78"}
              </span>
              <span className="text-muted text-xs mb-1">/ 4.00</span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-teal h-full rounded-full"
                style={{
                  width: `${
                    dashboardData?.stats?.type === "student"
                      ? (dashboardData.stats.gpa / 4.0) * 100
                      : 94.5
                  }%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1.5 font-mono">
              Predikat:{" "}
              {dashboardData?.stats?.type === "student"
                ? dashboardData.stats.predicate
                : "Dengan Pujian (Cumlaude)"}
            </p>
          </div>
        </div>
      )}

      {/* Schedule Widget (Student & Lecturer) OR Operational Monitoring (Admin) */}
      {currentUser?.role === "admin" ? (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-navy/10 text-navy flex-shrink-0">
                <Activity className="w-5 h-5 text-navy" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-navy">
                  Monitoring Operasional &amp; Layanan Akademik FTMM
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Status infrastruktur basis data kurikulum, gateway dual-tier,
                  dan kesiapan sistem 5 program studi.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 font-semibold self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sistem Operasional Normal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-gold" />
                  PostgreSQL 16 Engine
                </span>
                <span className="h-2 w-2 rounded-full bg-teal"></span>
              </div>
              <p className="text-xl font-heading font-bold text-navy">
                36 Tabel Aktif
              </p>
              <p className="text-[11px] text-muted">
                Lulus 97/97 static audit checks (Baseline V2.1 RC1).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-teal" />
                  FastAPI Gateway Dual-Tier
                </span>
                <span className="h-2 w-2 rounded-full bg-teal"></span>
              </div>
              <p className="text-xl font-heading font-bold text-navy">
                Online &amp; Resilient
              </p>
              <p className="text-[11px] text-muted">
                Rute /api/v1/* dan /api/* backward-compatible aktif.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-navy-light" />
                  Master Kurikulum 5 Prodi
                </span>
                <span className="h-2 w-2 rounded-full bg-teal"></span>
              </div>
              <p className="text-xl font-heading font-bold text-navy">
                195 Mata Kuliah
              </p>
              <p className="text-[11px] text-muted">
                TSD, TRKB, RN, TI, dan TE sinkron dengan SSOT resmi.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-navy" />
              <h3 className="font-heading font-bold text-lg text-navy">
                {dashboardData?.stats?.type === "lecturer"
                  ? "Jadwal Mengajar Dosen Minggu Ini"
                  : "Jadwal Perkuliahan Minggu Ini"}
              </h3>
              <span className="text-xs font-mono text-muted bg-background border border-border px-2 py-0.5 rounded">
                {dashboardData?.period_name || "Semester Ganjil 2024/2025"} ·
                Week {dashboardData?.academic_week || 4}
              </span>
              {hasConflict && (
                <span className="flex items-center gap-1 text-xs font-medium text-danger bg-danger/8 px-2 py-0.5 rounded-full border border-danger/20">
                  <AlertTriangle className="w-3 h-3" /> Bentrok
                </span>
              )}
            </div>
            {currentUser?.role === "student" && (
              <button
                onClick={() => onNavigate("degree-planner")}
                className="text-sm font-medium text-navy hover:text-gold transition-colors flex items-center gap-1 cursor-pointer"
              >
                Buka di Degree Planner <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <TimetableGrid
            schedule={displayedSchedule}
            days={TIMETABLE_DAYS}
            compact
            onNavigate={onNavigate}
          />
        </div>
      )}
      {/* Lecturer-Specific Operational Section: Kelas Ampuan & Advisee Review */}
      {currentUser?.role === "lecturer" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kelas Ampuan Panel */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-navy/10 text-navy">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-navy">
                    Daftar Kelas Ampuan Aktif
                  </h3>
                  <p className="text-xs text-muted">
                    Semester Ganjil 2024/2025 · 3 Kelas Paralel
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal/15 text-navy-dark border border-teal/30">
                3 Mata Kuliah
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy px-1.5 py-0.5 rounded bg-surface border border-border">
                      TSD201
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      Struktur Data (Kelas A)
                    </span>
                  </div>
                  <p className="text-xs text-muted flex items-center gap-2 mt-1">
                    <span>Senin 08:00 - 10:30</span>
                    <span>•</span>
                    <span>RKB 3.02</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-navy">38/40</span>
                  <p className="text-[10px] text-teal-dark font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal" /> RPS Terunggah
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy px-1.5 py-0.5 rounded bg-surface border border-border">
                      TSD301
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      Analisis Big Data (Kelas B)
                    </span>
                  </div>
                  <p className="text-xs text-muted flex items-center gap-2 mt-1">
                    <span>Rabu 10:00 - 12:30</span>
                    <span>•</span>
                    <span>Lab Komputasi FTMM</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-navy">28/30</span>
                  <p className="text-[10px] text-teal-dark font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal" /> RPS Terunggah
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-navy px-1.5 py-0.5 rounded bg-surface border border-border">
                      TSD302
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      Pembelajaran Mesin Lanjut (Kelas A)
                    </span>
                  </div>
                  <p className="text-xs text-muted flex items-center gap-2 mt-1">
                    <span>Kamis 13:00 - 15:30</span>
                    <span>•</span>
                    <span>RKB 2.05</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-navy">42/45</span>
                  <p className="text-[10px] text-teal-dark font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal" /> RPS Terunggah
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bimbingan Perwalian Panel */}
          <div className="bg-surface rounded-xl border border-border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal/15 text-navy">
                  <UserCheck className="w-4 h-4 text-teal" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-navy">
                    Bimbingan Akademik (Perwalian)
                  </h3>
                  <p className="text-xs text-muted">
                    Status Rencana Studi 24 Mahasiswa Angkatan 2022 & 2023
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold/15 text-navy border border-gold/30">
                Periode PRS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-background border border-border text-center">
                <span className="text-2xl font-bold font-heading text-navy">
                  18
                </span>
                <p className="text-[11px] text-muted mt-0.5">KRS Disetujui</p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-teal" />
              </div>
              <div className="p-3 rounded-xl bg-background border border-border text-center">
                <span className="text-2xl font-bold font-heading text-gold">
                  5
                </span>
                <p className="text-[11px] text-muted mt-0.5">
                  Menunggu Verifikasi
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-gold" />
              </div>
              <div className="p-3 rounded-xl bg-background border border-border text-center">
                <span className="text-2xl font-bold font-heading text-orange">
                  1
                </span>
                <p className="text-[11px] text-muted mt-0.5">
                  Perlu Evaluasi IPS
                </p>
                <span className="inline-block mt-1 w-2 h-2 rounded-full bg-orange" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gold/10 border border-gold/30 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <div className="text-xs text-navy">
                <p className="font-semibold">Perhatian Perwalian Aktif</p>
                <p className="text-[11px] text-muted mt-0.5">
                  1 mahasiswa (NIM: 164221018) mengajukan 22 SKS dengan capaian
                  IPS semester lalu 2.45 (Batas SOP FTMM: Maksimal 18 SKS).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-KRS Section: Separated for Student (Personal Status) vs Lecturer/Admin (Demand Analytics) */}
      {currentUser?.role === "student" ? (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gold/15 text-navy flex-shrink-0">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-bold text-lg text-navy">
                    Status Partisipasi Polling Pre-KRS Saya
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-navy border border-gold/30">
                    {pollingPeriod?.term === "genap"
                      ? "Semester Genap"
                      : "Semester Ganjil"}{" "}
                    {pollingPeriod?.academic_year || "2024/2025"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Pilihlah hingga {pollingPeriod?.max_votes_per_student || 3}{" "}
                  mata kuliah pilihan untuk menentukan pembukaan kelas pada
                  semester mendatang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("course-finder")}
              className="h-9 px-4 rounded-lg bg-navy hover:bg-navy-light text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start md:self-center"
            >
              <span>Pilih MK di Course Finder</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {studentVotes.length === 0 ? (
            <div className="p-6 rounded-xl bg-background border border-dashed border-border text-center space-y-2">
              <p className="text-sm font-semibold text-navy">
                Anda belum memilih mata kuliah pilihan pada periode ini.
              </p>
              <p className="text-xs text-muted max-w-md mx-auto">
                Partisipasi voting Anda sangat penting agar Program Studi dapat
                mengakomodasi kuota dan membuka kelas paralel yang Anda
                butuhkan.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("course-finder")}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold/15 hover:bg-gold/25 text-navy border border-gold/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                Mulai Memilih MK Pilihan
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  Mata Kuliah Pilihan yang Anda Prioritaskan (
                  {studentVotes.length}/
                  {pollingPeriod?.max_votes_per_student || 3}):
                </span>
                <span className="font-mono text-[11px] text-teal-dark font-medium">
                  Tersimpan di Akun Anda
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {studentVotes.map((v) => (
                  <div
                    key={v.vote_id || v.course_id}
                    className="p-4 rounded-xl bg-background border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-navy border border-gold/30">
                        Prioritas {v.priority}
                      </span>
                      <span className="font-mono text-xs font-bold text-navy">
                        {v.course_code || v.course_id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-navy line-clamp-2">
                      {v.course_name || v.course_id}
                    </p>
                    <p className="text-[10px] text-muted font-mono">
                      Waktu Vote:{" "}
                      {new Date(v.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
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
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-muted"
                    >
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
      )}
    </div>
  )
}
