import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "../../utils"

interface ModalShellProps {
  onClose: () => void
  labelledBy: string
  children: ReactNode
  panelClassName?: string
  overlayClassName?: string
}

/**
 * Satu perilaku dialog: Esc menutup, klik backdrop menutup, dan fokus kembali ke
 * elemen pemicu saat dialog ditutup.
 */
export default function ModalShell({
  onClose,
  labelledBy,
  children,
  panelClassName,
  overlayClassName,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    panelRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150",
        overlayClassName,
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn("outline-hidden", panelClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
