import { useState, useRef, useEffect } from "react"
import { Bell, Check, Clock, AlertTriangle, BookOpen } from "lucide-react"
import { cn } from "../utils"

import { apiFetch } from "../api/client"
import { type AuthUser } from "../services/authService"

export interface AcademicNotification {
  id: string
  title: string
  message: string
  type: "warning" | "deadline" | "info"
  timestamp: string
  isRead: boolean
}

interface NotificationDropdownProps {
  currentUser?: AuthUser | null
}

export default function NotificationDropdown({
  currentUser,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AcademicNotification[]>([])

  useEffect(() => {
    let mounted = true
    apiFetch<{
      items: {
        id: string
        title: string
        message: string
        type: AcademicNotification["type"]
        timestamp: string
        is_read: boolean
      }[]
    }>("/api/v1/notifications/me", { auth: true })
      .then((data) => {
        if (!mounted) return
        setNotifications(
          (data.items ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            type: item.type,
            timestamp: item.timestamp,
            isRead: item.is_read,
          })),
        )
      })
      .catch(() => {
        if (mounted) setNotifications([])
      })
    return () => {
      mounted = false
    }
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

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    await apiFetch("/api/v1/notifications/mark-all-read", {
      method: "POST",
      auth: true,
    }).catch(() => undefined)
  }

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    )
    await apiFetch(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      auth: true,
    }).catch(() => undefined)
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
