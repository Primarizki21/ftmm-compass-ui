import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Course } from "../data"
import { fetchCatalog } from "../courseData"

interface CatalogContextValue {
  courses: Course[]
  programs: string[]
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
  /** Menyisipkan hasil CRUD admin ke katalog aktif tanpa fetch ulang. */
  upsert: (course: Course) => void
  remove: (courseId: string) => void
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [programs, setPrograms] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchCatalog("all")
      setCourses(result.courses)
      setPrograms(result.programs)
      setError(null)
    } catch {
      setError("Katalog backend tidak tersedia.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const upsert = useCallback((course: Course) => {
    setCourses((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.id === course.id || (course.code && item.code === course.code),
      )
      if (index === -1) return [...prev, course]
      const next = [...prev]
      next[index] = course
      return next
    })
  }, [])

  const remove = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== courseId))
  }, [])

  const value = useMemo(
    () => ({ courses, programs, isLoading, error, reload, upsert, remove }),
    [courses, programs, isLoading, error, reload, upsert, remove],
  )

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext)
  if (!context) {
    throw new Error("useCatalog harus dipakai di dalam CatalogProvider")
  }
  return context
}
