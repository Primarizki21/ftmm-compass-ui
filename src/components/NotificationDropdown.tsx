import { useState, useRef, useEffect } from "react"
import { Bell, Check, Clock, AlertTriangle, BookOpen } from "lucide-react"
import { cn } from "../utils"

import { type AuthUser } from "../services/authService"

export interface AcademicNotification {
  id: string
  title: string
  message: string
  type: "warning" | "deadline" | "info"
  timestamp: string
  isRead: boolean
}

const ROLE_NOTIFICATIONS: Record<string, AcademicNotification[]> = {
  student: [
    {
      id: "notif-mhs-1",
      title: "Deteksi Bentrok Jadwal Kuliah",
      message:
        "Terdapat bentrok jadwal antara II4042 (Machine Learning) dan II4045 (Data Visualization) pada Selasa 10:00.",
      type: "warning",
      timestamp: "10 menit lalu",
      isRead: false,
    },
    {
      id: "notif-mhs-2",
      title: "Batas Akhir Revisi KRS (PRS)",
      message:
        "Periode perubahan rencana studi semester aktif ditutup pada 30 Agustus 2024 pukul 23:59 WIB.",
      type: "deadline",
      timestamp: "2 jam lalu",
      isRead: false,
    },
    {
      id: "notif-mhs-3",
      title: "Hasil Polling Peminatan MK",
      message:
        "Mata kuliah pilihan yang kamu vote (TSD302) telah memenuhi kuorum pembukaan kelas perkuliahan.",
      type: "info",
      timestamp: "5 jam lalu",
      isRead: false,
    },
    {
      id: "notif-mhs-4",
      title: "Compass AI: Rekomendasi Tersedia",
      message:
        "Rencana studi optimal untuk Semester 5 dan 6 telah diperbarui berdasarkan target peminatanmu.",
      type: "info",
      timestamp: "1 hari lalu",
      isRead: true,
    },
  ],
  lecturer: [
    {
      id: "notif-dsn-1",
      title: "Pengajuan Rencana Studi Mahasiswa",
      message:
        "5 mahasiswa bimbingan akademik mengajukan draft KRS untuk diverifikasi dan disetujui.",
      type: "warning",
      timestamp: "15 menit lalu",
      isRead: false,
    },
    {
      id: "notif-dsn-2",
      title: "Batas Entri RPS & Presensi Perkuliahan",
      message:
        "Entri presensi dan pembaruan silabus/RPS semester aktif wajib dilengkapi sebelum Week 5.",
      type: "deadline",
      timestamp: "3 jam lalu",
      isRead: false,
    },
    {
      id: "notif-dsn-3",
      title: "Update Kuorum MK Pilihan Anda",
      message:
        "Mata kuliah TSD302 (Pembelajaran Mesin Lanjut) mencapai kuorum 42 peminat (siap buka 2 kelas paralel).",
      type: "info",
      timestamp: "6 jam lalu",
      isRead: false,
    },
    {
      id: "notif-dsn-4",
      title: "Jadwal Mengajar Terkonfirmasi",
      message:
        "Alokasi ruang kuliah TSD201 Kelas A telah ditetapkan di Ruang Kuliah Bersama 3.02.",
      type: "info",
      timestamp: "1 hari lalu",
      isRead: true,
    },
  ],
  admin: [
    {
      id: "notif-adm-1",
      title: "Monitoring Polling Pra-KRS",
      message:
        "Periode pemilihan MK Pilihan Semester Ganjil 2024/2025 sedang aktif (142 mahasiswa telah submit).",
      type: "info",
      timestamp: "20 menit lalu",
      isRead: false,
    },
    {
      id: "notif-adm-2",
      title: "Mata Kuliah di Bawah Kuorum",
      message:
        "3 mata kuliah pilihan belum memenuhi kuorum minimum (15 mahasiswa) menjelang penutupan polling.",
      type: "warning",
      timestamp: "2 jam lalu",
      isRead: false,
    },
    {
      id: "notif-adm-3",
      title: "Audit Integritas Kurikulum",
      message:
        "Sinkronisasi otomatis katalog 5 prodi dengan SSOT lokal berhasil (195 matkul terverifikasi).",
      type: "info",
      timestamp: "1 hari lalu",
      isRead: true,
    },
    {
      id: "notif-adm-4",
      title: "Verifikasi Akun Pengajar Baru",
      message:
        "2 akun dosen baru terdaftar dari Cybercampus dan memerlukan verifikasi penugasan unit prodi.",
      type: "deadline",
      timestamp: "2 hari lalu",
      isRead: true,
    },
  ],
}

interface NotificationDropdownProps {
  currentUser?: AuthUser | null
}

export default function NotificationDropdown({
  currentUser,
}: NotificationDropdownProps) {
  const activeRole = currentUser?.role || "student"
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AcademicNotification[]>(
    () => ROLE_NOTIFICATIONS[activeRole] || ROLE_NOTIFICATIONS.student,
  )

  useEffect(() => {
    const role = currentUser?.role || "student"
    setNotifications(ROLE_NOTIFICATIONS[role] || ROLE_NOTIFICATIONS.student)
  }, [currentUser?.role])

  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notifikasi akademik (${unreadCount} belum dibaca)`}
        className={cn(
          "p-2 text-muted hover:text-navy hover:bg-background rounded-lg transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
          isOpen && "bg-background text-navy",
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger border-2 border-surface" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-navy text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm">
                Notifikasi Akademik
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gold text-navy-dark">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-teal-light hover:text-white flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tandai terbaca</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">
                Tidak ada notifikasi saat ini.
              </div>
            ) : (
              notifications.map((item) => {
                const isWarning = item.type === "warning"
                const isDeadline = item.type === "deadline"
                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={cn(
                      "p-3.5 hover:bg-background/80 transition-colors cursor-pointer flex gap-3 text-left",
                      !item.isRead && "bg-gold/5",
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isWarning ? (
                        <div className="w-7 h-7 rounded-full bg-orange/15 text-orange flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : isDeadline ? (
                        <div className="w-7 h-7 rounded-full bg-danger/15 text-danger flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-teal/20 text-navy flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={cn(
                            "text-xs font-semibold truncate",
                            !item.isRead
                              ? "text-navy"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-muted whitespace-nowrap font-mono">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-background/50 border-t border-border text-center">
            <span className="text-[11px] text-muted">
              Terhubung dengan Kalender Akademik FTMM UNAIR
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
