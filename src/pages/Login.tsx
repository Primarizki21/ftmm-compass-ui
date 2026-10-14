import { useState, type FormEvent } from "react"
import {
  AlertCircle,
  ArrowRight,
  Compass,
  KeyRound,
  Lock,
  Mail,
  UserCheck,
} from "lucide-react"
import { authService, type AuthUser } from "../services/authService"

import BrandLogo from "../components/BrandLogo"

interface LoginProps {
  onLogin: (user: AuthUser) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [nim, setNim] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await authService.login({
        identifier: nim.trim(),
        password,
      })
      onLogin(response.user)
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat masuk. Silakan coba lagi.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const fillCredentials = (identifierVal: string, passwordVal: string) => {
    setNim(identifierVal)
    setPassword(passwordVal)
    setErrorMessage(null)
  }
  return (
    <div className="min-h-screen w-full flex bg-background font-sans">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-navy relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-navy-dark via-navy to-navy-light/90">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#d7b03d_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/30">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-gold tracking-wide">
              FTMM COMPASS
            </h1>
            <p className="text-xs text-teal-light uppercase tracking-wider font-mono">
              Academic Advisor
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-heading font-bold text-white leading-tight mb-6">
            Navigasi Perjalanan Akademikmu Bersama FTMM
          </h2>
          <p className="text-teal-light text-lg mb-8">
            Platform penasihat akademik terpadu untuk mahasiswa Fakultas
            Teknologi Maju dan Multidisiplin Universitas Airlangga. Susun
            rencana studi, atur jadwal, dan capai target kelulusanmu.
          </p>
          <div className="flex gap-4 items-center">
            <BrandLogo variant="login-hero" />
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <BrandLogo variant="login-form" className="lg:hidden" />
            <h2 className="text-3xl font-heading font-bold text-navy mb-2">
              Selamat Datang
            </h2>
            <p className="text-muted">
              Gunakan akun Cybercampus UNAIR untuk masuk
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-orange/10 border border-orange/30 text-orange flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Gagal Masuk</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                NIM / Email SSO
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan NIM atau Email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">
                  Kata Sandi
                </label>
                <a
                  href="#"
                  className="text-xs text-navy font-medium hover:text-gold transition-colors"
                >
                  Lupa sandi?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="password"
                  required
                  placeholder="Masukkan Kata Sandi"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-navy hover:bg-navy-light text-white rounded-xl font-medium transition-all focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Masuk ke Dashboard <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Testing Credentials Helper */}
          <div className="mt-6 p-4 rounded-xl border border-border bg-warm-bg/50">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
              <KeyRound className="w-3.5 h-3.5 text-gold" />
              <span>Akun Uji Coba (Testing Credentials)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials("164231001", "Mahasiswa2026!")}
                className="p-2.5 rounded-lg border border-border bg-white hover:border-gold/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between text-navy font-medium group-hover:text-gold mb-1">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal" />
                    Mahasiswa
                  </span>
                  <span className="text-[10px] text-muted">Isi Form</span>
                </div>
                <div className="text-[11px] font-mono text-muted truncate">
                  164231001
                </div>
                <div className="text-[10px] font-mono text-muted/80 truncate">
                  Mahasiswa2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    "dosen.testing@ftmm.unair.ac.id",
                    "DosenFTMM2026!",
                  )
                }
                className="p-2.5 rounded-lg border border-border bg-white hover:border-gold/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between text-navy font-medium group-hover:text-gold mb-1">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-navy" />
                    Dosen
                  </span>
                  <span className="text-[10px] text-muted">Isi Form</span>
                </div>
                <div className="text-[11px] font-mono text-muted truncate">
                  dosen.testing...
                </div>
                <div className="text-[10px] font-mono text-muted/80 truncate">
                  DosenFTMM2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillCredentials("admin@ftmm.unair.ac.id", "AdminFTMM2026!")
                }
                className="p-2.5 rounded-lg border border-border bg-white hover:border-gold/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between text-navy font-medium group-hover:text-gold mb-1">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-gold" />
                    Admin
                  </span>
                  <span className="text-[10px] text-muted">Isi Form</span>
                </div>
                <div className="text-[11px] font-mono text-muted truncate">
                  admin@ftmm...
                </div>
                <div className="text-[10px] font-mono text-muted/80 truncate">
                  AdminFTMM2026!
                </div>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} Fakultas Teknologi Maju dan
              Multidisiplin
              <br />
              Universitas Airlangga
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
