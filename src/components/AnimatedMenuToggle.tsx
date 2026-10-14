import { ChevronLeft, Menu } from "lucide-react"
import { cn } from "../utils"

interface AnimatedMenuToggleProps {
  isOpen: boolean
  onClick: () => void
  className?: string
}

export default function AnimatedMenuToggle({
  isOpen,
  onClick,
  className,
}: AnimatedMenuToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Sembunyikan bilah navigasi" : "Buka bilah navigasi"}
      title={isOpen ? "Sembunyikan Sidebar" : "Buka Sidebar"}
      className={cn(
        "p-2 text-muted hover:text-navy hover:bg-background rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 relative overflow-hidden group",
        isOpen && "bg-background/80 text-navy",
        className,
      )}
    >
      <div className="w-5 h-5 relative flex items-center justify-center">
        {/* Chevron Left icon when sidebar is OPEN */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out transform",
            isOpen
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 -rotate-90 pointer-events-none",
          )}
        >
          <ChevronLeft className="w-5 h-5 text-current" />
        </span>

        {/* 3-line Hamburger Menu icon when sidebar is CLOSED */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out transform",
            !isOpen
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-90 pointer-events-none",
          )}
        >
          <Menu className="w-5 h-5 text-current" />
        </span>
      </div>
    </button>
  )
}
