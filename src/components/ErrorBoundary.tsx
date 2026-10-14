import { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "[FTMM Compass] Uncaught UI Component Error:",
      error,
      errorInfo,
    )
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-surface border border-danger/30 shadow-sm flex flex-col items-center justify-center text-center my-6 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-navy">
              {this.props.fallbackTitle || "Komponen Gagal Ditampilkan"}
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Terjadi kendala pada komponen ini. Anda dapat mencoba memuat ulang
              atau beralih ke tab navigasi lain.
            </p>
          </div>
          {this.state.error && (
            <div className="w-full p-3 rounded-lg bg-background border border-border text-left font-mono text-[11px] text-danger/90 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-navy text-white hover:bg-navy-light transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gold" />
            Coba Muat Ulang Komponen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
