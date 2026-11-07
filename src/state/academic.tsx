import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  academicService,
  type AcademicPeriod,
} from "../services/academicService"
import { apiErrorMessage } from "../api/client"
import { useSession } from "./session"

interface AcademicPeriodContextValue {
  period: AcademicPeriod | null
  isLoading: boolean
  error: string | null
}

const AcademicPeriodContext = createContext<AcademicPeriodContextValue | null>(
  null,
)

export function AcademicPeriodProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useSession()
  const [period, setPeriod] = useState<AcademicPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      setPeriod(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    academicService
      .getCurrent()
      .then((value) => {
        if (!active) return
        setPeriod(value)
        setError(null)
      })
      .catch((cause) => {
        if (active) {
          setError(apiErrorMessage(cause, "Periode akademik tidak tersedia."))
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isLoggedIn])

  const value = useMemo(
    () => ({ period, isLoading, error }),
    [period, isLoading, error],
  )

  return (
    <AcademicPeriodContext.Provider value={value}>
      {children}
    </AcademicPeriodContext.Provider>
  )
}

export function useAcademicPeriod(): AcademicPeriodContextValue {
  const context = useContext(AcademicPeriodContext)
  if (!context) {
    throw new Error(
      "useAcademicPeriod harus dipakai di dalam AcademicPeriodProvider",
    )
  }
  return context
}
