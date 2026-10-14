import { useState } from "react"
import { Compass } from "lucide-react"
import { cn } from "../utils"
import logoFtmm from "../assets/branding/logo-ftmm.webp"
import logoUnair from "../assets/branding/logo-unair.webp"

interface BrandLogoProps {
  variant?: "sidebar" | "login-hero" | "login-form" | "header"
  className?: string
  showSubtitle?: boolean
}

export default function BrandLogo({
  variant = "sidebar",
  className,
  showSubtitle = true,
}: BrandLogoProps) {
  const [ftmmError, setFtmmError] = useState(false)
  const [unairError, setUnairError] = useState(false)

  if (variant === "sidebar") {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {/* Elevated brand pill for optimal contrast on dark navy */}
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-white/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {!unairError ? (
              <img
                src={logoUnair}
                alt="Logo Universitas Airlangga"
                className="w-9 h-9 object-contain flex-shrink-0"
                onError={() => setUnairError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs flex-shrink-0">
                UA
              </div>
            )}
            <div className="h-7 w-px bg-border/80 flex-shrink-0" />
            {!ftmmError ? (
              <img
                src={logoFtmm}
                alt="Logo FTMM UNAIR"
                className="h-8 max-w-[130px] object-contain flex-shrink-0"
                onError={() => setFtmmError(true)}
              />
            ) : (
              <span className="font-heading font-bold text-xs text-navy tracking-tight truncate">
                FTMM UNAIR
              </span>
            )}
          </div>
        </div>

        {/* Brand Title & Compass Emblem */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/30 relative overflow-hidden group flex-shrink-0">
            <Compass className="w-6 h-6 transition-transform duration-700 group-hover:rotate-180" />
            <div className="absolute w-[2px] h-4 bg-gold top-1 left-1/2 -translate-x-1/2 rounded-full" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-lg tracking-wide text-gold whitespace-nowrap">
              FTMM COMPASS
            </h1>
            {showSubtitle && (
              <p className="text-[10px] text-teal-light uppercase tracking-wider font-mono whitespace-nowrap">
                Academic Advisor
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "login-hero") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/20 flex items-center gap-3">
          <img
            src={logoUnair}
            alt="Logo Universitas Airlangga"
            className="w-12 h-12 object-contain"
          />
          <div className="h-8 w-px bg-border/80" />
          <img
            src={logoFtmm}
            alt="Logo FTMM UNAIR"
            className="h-9 max-w-[180px] object-contain"
          />
        </div>
      </div>
    )
  }

  if (variant === "login-form") {
    return (
      <div
        className={cn("flex items-center justify-center gap-3 mb-6", className)}
      >
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-border flex items-center gap-3">
          <img
            src={logoUnair}
            alt="Logo Universitas Airlangga"
            className="w-12 h-12 object-contain"
          />
          <div className="h-8 w-px bg-border" />
          <img
            src={logoFtmm}
            alt="Logo FTMM UNAIR"
            className="h-9 max-w-[180px] object-contain"
          />
        </div>
      </div>
    )
  }

  // Default compact header variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoUnair}
        alt="UNAIR"
        className="w-7 h-7 object-contain flex-shrink-0"
      />
      <img
        src={logoFtmm}
        alt="FTMM"
        className="h-6 max-w-[100px] object-contain flex-shrink-0"
      />
    </div>
  )
}
