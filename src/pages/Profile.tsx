import { useState, useEffect } from "react"
import {
  User,
  GraduationCap,
  Mail,
  BookOpen,
  ShieldCheck,
  Calendar,
  Award,
  ArrowRight,
  LogOut,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
} from "lucide-react"
import { authService, type AuthUser } from "../services/authService"

interface ProfileProps {
  currentUser: AuthUser | null
  onNavigate: (page: string) => void
  onRequestLogout: () => void
}

export default function Profile({
  currentUser,
  onNavigate,
  onRequestLogout,
}: ProfileProps) {
  const [user, setUser] = useState<AuthUser | null>(currentUser)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => {
    setUser(currentUser)
  }, [currentUser])

  const handleRefreshProfile = async () => {
    setIsRefreshing(true)
    setRefreshError(null)
    try {
      const freshUser = await authService.getMe()
      setUser(freshUser)
    } catch (err: unknown) {
      setRefreshError(
        err instanceof Error ? err.message : "Gagal memperbarui profil",
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  const roleLabelMap: Record<string, string> = {
    student: "Mahasiswa Aktif",
    lecturer: "Dosen Pengajar",
    admin: "Administrator FTMM",
    faculty_staff: "Staf Fakultas",
  }

  const roleLabel = user?.role
    ? roleLabelMap[user.role] || user.role
    : "Mahasiswa Aktif"

  const studentProfile = user?.student_profile

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Banner / Identity Hero */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-navy to-navy-light text-gold flex items-center justify-center font-heading font-bold text-3xl shadow-md border-2 border-gold/30">
                {user?.full_name ? (
                  user.full_name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                ) : (
                  <User className="w-10 h-10 text-gold" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                <span className="flex h-3.5 w-3.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal"></span>
                </span>
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-navy">
                  {user?.full_name || "Mahasiswa FTMM"}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/15 text-navy border border-gold/40">
                  <Sparkles className="w-3 h-3 text-gold" />
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/15 text-navy-dark border border-teal/40">
                  <CheckCircle2 className="w-3 h-3 text-teal" />
                  Akun Terverifikasi
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {studentProfile?.student_number && (
                  <span className="font-mono text-navy font-medium bg-background px-2.5 py-0.5 rounded border border-border text-xs">
                    NIM: {studentProfile.student_number}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  {user?.email || "Belum ada email"}
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-muted" />
                  FTMM UNAIR
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={handleRefreshProfile}
              disabled={isRefreshing}
              title="Sinkronisasi Data Profil"
              className="px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-surface text-navy text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Memperbarui..." : "Sinkronkan"}</span>
            </button>
            <button
              type="button"
              onClick={onRequestLogout}
              className="px-4 py-2 rounded-xl bg-orange/10 hover:bg-orange/20 text-orange border border-orange/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {refreshError && (
          <div className="mt-4 p-3 rounded-lg bg-orange/10 border border-orange/30 text-orange text-xs">
            {refreshError}
          </div>
        )}
      </div>

      {/* Main Grid: Academic Data & Account Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academic Profile Cards (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Identitas Akademik Resmi */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="font-heading font-bold text-lg text-navy flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gold" />
                Identitas Akademik FTMM
              </h2>
              <span className="text-xs font-mono text-muted bg-background px-2 py-0.5 rounded border border-border">
                Kurikulum Resmi UNAIR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted block mb-1">
                  Program Studi
                </span>
                <p className="font-semibold text-navy">
                  {studentProfile?.study_program || "Teknologi Sains Data"}
                </p>
                <p className="text-[11px] font-mono text-muted mt-0.5">
                  Kode Prodi: {studentProfile?.program_code || "TSD"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted block mb-1">
                  Fakultas &amp; Kampus
                </span>
                <p className="font-semibold text-navy">
                  Fakultas Teknologi Maju dan Multidisiplin
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Kampus C Mulyorejo, Surabaya
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted block mb-1">
                  Tahun Angkatan
                </span>
                <p className="font-semibold text-navy font-mono text-base">
                  {studentProfile?.admission_year || 2023}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Kurikulum Berlaku:{" "}
                  {(studentProfile?.admission_year || 2023) <= 2024
                    ? "Kurikulum 2021"
                    : "Kurikulum 2025"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-xs text-muted block mb-1">
                  Semester Aktif
                </span>
                <p className="font-semibold text-navy text-base">
                  Semester {studentProfile?.current_semester || 3}
                </p>
                <p className="text-[11px] text-muted mt-0.5 font-mono">
                  {(studentProfile?.current_semester || 3) % 2 === 1
                    ? "Term Ganjil"
                    : "Term Genap"}{" "}
                  2024/2025
                </p>
              </div>
            </div>

            {/* Academic Regulation Callout (SOP FTMM) */}
            <div className="p-4 rounded-xl bg-navy/5 border border-navy/10 flex items-start gap-3">
              <Award className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="text-xs text-navy/90 leading-relaxed">
                <p className="font-semibold text-navy">
                  Ketentuan Beban Studi Semester (SOP Akademik FTMM UNAIR)
                </p>
                <p className="mt-1 text-muted">
                  Batas maksimal SKS yang dapat diambil pada semester berikutnya
                  ditentukan oleh Indeks Prestasi Semester (IPS):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-mono text-[11px]">
                  <span className="bg-surface px-2 py-1 rounded border border-border">
                    IPS &ge; 3.00: <strong>24 SKS</strong>
                  </span>
                  <span className="bg-surface px-2 py-1 rounded border border-border">
                    2.50–2.99: <strong>21 SKS</strong>
                  </span>
                  <span className="bg-surface px-2 py-1 rounded border border-border">
                    2.00–2.49: <strong>18 SKS</strong>
                  </span>
                  <span className="bg-surface px-2 py-1 rounded border border-border">
                    &lt; 2.00: <strong>15 SKS</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
            <h2 className="font-heading font-bold text-base text-navy mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal" />
              Akses Cepat Modul Perencanaan Studi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onNavigate("degree-planner")}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-gold/60 text-left transition-all group cursor-pointer"
              >
                <div className="text-xs font-semibold text-navy group-hover:text-gold flex items-center justify-between">
                  Degree Planner
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Atur roadmap 8 semester &amp; jadwal mingguan
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("course-finder")}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-gold/60 text-left transition-all group cursor-pointer"
              >
                <div className="text-xs font-semibold text-navy group-hover:text-gold flex items-center justify-between">
                  Course Finder
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Cari silabus &amp; pohon prasyarat matkul
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("chatbot")}
                className="p-3.5 rounded-xl border border-border bg-background hover:border-gold/60 text-left transition-all group cursor-pointer"
              >
                <div className="text-xs font-semibold text-navy group-hover:text-gold flex items-center justify-between">
                  Compass AI
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Konsultasi rekomendasi rencana studi cerdas
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Security, Session & Account Info (1 span) */}
        <div className="space-y-6">
          {/* Card: Informasi Keamanan Sesi */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <h2 className="font-heading font-bold text-base text-navy flex items-center gap-2 border-b border-border/80 pb-3">
              <ShieldCheck className="w-4 h-4 text-teal" />
              Keamanan &amp; Sesi Aktif
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
                <KeyRound className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy">Metode Autentikasi</p>
                  <p className="text-muted mt-0.5">
                    Cybercampus Single Sign-On (SSO) UNAIR
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
                <Clock className="w-4 h-4 text-navy-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy">Masa Berlaku Token</p>
                  <p className="text-muted mt-0.5 font-mono">
                    JWT Session (24 Jam / 86.400 detik)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
                <Calendar className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-navy">Status Hak Akses</p>
                  <p className="text-muted mt-0.5">
                    Role Terverifikasi:{" "}
                    <span className="font-mono font-semibold text-navy">
                      {user?.role || "student"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={onRequestLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange hover:bg-orange/90 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>

          {/* Card: Hak Pengguna & Bantuan */}
          <div className="bg-warm-bg/70 rounded-2xl border border-border p-5 text-xs text-muted space-y-2">
            <h3 className="font-semibold text-navy">Pusat Dukungan Akademik</h3>
            <p className="leading-relaxed">
              Jika terdapat ketidaksesuaian data identitas, status kurikulum,
              atau NIM, hubungi Bagian Akademik FTMM di Gedung Nano Lantai 1
              atau Helpdesk Cybercampus UNAIR.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
