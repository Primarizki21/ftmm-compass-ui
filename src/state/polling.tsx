import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  pollingService,
  type DemandAnalyticsResponse,
  type PollingPeriod,
  type StudentVote,
} from "../services/pollingService"
import { apiErrorMessage } from "../api/client"

interface PollingContextValue {
  period: PollingPeriod | null
  myVotes: StudentVote[]
  demand: Record<string, DemandAnalyticsResponse>
  isLoading: boolean
  error: string | null
  loadDemand: (studyProgram: string) => Promise<void>
  submitVote: (courseId: string, priority: 1 | 2 | 3) => Promise<void>
  removeVote: (courseId: string) => Promise<void>
}

const PollingContext = createContext<PollingContextValue | null>(null)

export function PollingProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PollingPeriod | null>(null)
  const [myVotes, setMyVotes] = useState<StudentVote[]>([])
  const [demand, setDemand] = useState<Record<string, DemandAnalyticsResponse>>(
    {},
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    Promise.all([pollingService.getActivePeriod(), pollingService.getMyVotes()])
      .then(([nextPeriod, votes]) => {
        if (!active) return
        setPeriod(nextPeriod)
        setMyVotes(votes)
      })
      .catch((cause) => {
        if (active) setError(apiErrorMessage(cause, "Polling tidak tersedia."))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const loadDemand = useCallback(async (studyProgram: string) => {
    const key = studyProgram || "all"
    try {
      const result = await pollingService.getDemandAnalytics(studyProgram)
      setDemand((prev) => ({ ...prev, [key]: result }))
      setPeriod(result.period)
    } catch (cause) {
      setError(apiErrorMessage(cause, "Rekap peminatan tidak tersedia."))
    }
  }, [])

  const submitVote = useCallback(
    async (courseId: string, priority: 1 | 2 | 3) => {
      const vote = await pollingService.submitVote({
        course_id: courseId,
        priority,
      })
      setMyVotes((prev) => [
        ...prev.filter((item) => item.course_id !== courseId),
        vote,
      ])
    },
    [],
  )

  const removeVote = useCallback(async (courseId: string) => {
    await pollingService.removeVote(courseId)
    setMyVotes((prev) => prev.filter((item) => item.course_id !== courseId))
  }, [])

  const value = useMemo(
    () => ({
      period,
      myVotes,
      demand,
      isLoading,
      error,
      loadDemand,
      submitVote,
      removeVote,
    }),
    [
      period,
      myVotes,
      demand,
      isLoading,
      error,
      loadDemand,
      submitVote,
      removeVote,
    ],
  )

  return (
    <PollingContext.Provider value={value}>{children}</PollingContext.Provider>
  )
}

export function usePolling(): PollingContextValue {
  const context = useContext(PollingContext)
  if (!context) {
    throw new Error("usePolling harus dipakai di dalam PollingProvider")
  }
  return context
}
