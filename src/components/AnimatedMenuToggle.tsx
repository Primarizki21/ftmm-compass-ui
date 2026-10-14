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
      aria-label={isOpen ? "Tutup bilah navigasi" : "Buka bilah navigasi"}
      title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
      className={cn(
        "p-2 text-muted hover:text-navy hover:bg-background rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
        className,
      )}
    >
      <div className="w-5 h-5 flex flex-col justify-center items-center relative">
        {/* Top bar */}
        <span
          className={cn(
            "h-0.5 w-5 bg-current rounded-full transition-all duration-300 ease-in-out transform origin-center",
            isOpen
              ? "translate-y-[5px] rotate-45"
              : "translate-y-[-5px] rotate-0",
          )}
        />
        {/* Middle bar */}
        <span
          className={cn(
            "h-0.5 w-5 bg-current rounded-full transition-all duration-200 ease-in-out transform origin-center",
            isOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100",
          )}
        />
        {/* Bottom bar */}
        <span
          className={cn(
            "h-0.5 w-5 bg-current rounded-full transition-all duration-300 ease-in-out transform origin-center",
            isOpen
              ? "-translate-y-[5px] -rotate-45"
              : "translate-y-[5px] rotate-0",
          )}
        />
      </div>
    </button>
  )
}
