import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { authService, type AuthUser } from "../services/authService"

const STUDENT_ONLY_PAGES: Record<string, true> = {
  "degree-planner": true,
  chatbot: true,
}

interface SessionContextValue {
  user: AuthUser | null
  isLoggedIn: boolean
  login: (user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser) => void
  /** Satu-satunya aturan rute: halaman khusus mahasiswa disembunyikan untuk peran lain. */
  canAccess: (page: string) => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() =>
    authService.getStoredUser(),
  )
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    Boolean(authService.getStoredToken() && authService.getStoredUser()),
  )

  const login = useCallback((next: AuthUser) => {
    setUserState(next)
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUserState(null)
    setIsLoggedIn(false)
  }, [])

  const canAccess = useCallback(
    (page: string) =>
      (user?.role ?? "student") === "student" || !STUDENT_ONLY_PAGES[page],
    [user?.role],
  )

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      login,
      logout,
      setUser: setUserState,
      canAccess,
    }),
    [user, isLoggedIn, login, logout, canAccess],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession harus dipakai di dalam SessionProvider")
  }
  return context
}
