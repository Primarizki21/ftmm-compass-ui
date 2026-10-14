import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { cn } from "./utils"
import { Course, SCHEDULE, ScheduleItem } from "./data"

// Pages
import Dashboard from "./pages/Dashboard"
import CourseFinder from "./pages/CourseFinder"
import DegreePlanner, { PlacedCourse } from "./pages/DegreePlanner"
import Chatbot, { DegreePlanPayload } from "./pages/Chatbot"
import Profile from "./pages/Profile"
import Login from "./pages/Login"
import ErrorBoundary from "./components/ErrorBoundary"
import { authService, type AuthUser } from "./services/authService"

import BrandLogo from "./components/BrandLogo"
import AnimatedMenuToggle from "./components/AnimatedMenuToggle"
import NotificationDropdown from "./components/NotificationDropdown"
import { getCurrentAcademicPeriod } from "./utils/academicCalendar"

type Page = "dashboard" | "course-finder" | "degree-planner" | "chatbot" | "profile"

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    authService.getStoredUser(),
  )
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const hasToken = Boolean(authService.getStoredToken())
    const hasUser = Boolean(authService.getStoredUser())
    return hasToken && hasUser
  })
  const [activePage, setActivePage] = useState<Page>("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [pendingCourses, setPendingCourses] = useState<Course[]>([])
  const [customPlan, setCustomPlan] =
    useState<Record<number, PlacedCourse[]> | null>(null)
  const [appliedPlanSummary, setAppliedPlanSummary] =
    useState<DegreePlanPayload["summary"] | null>(null)
  const [activeSchedule, setActiveSchedule] = useState<ScheduleItem[]>(SCHEDULE)
  const [plannerInitialTab, setPlannerInitialTab] =
    useState<"roadmap" | "timetable">("roadmap")
  const [finderInitialCourse, setFinderInitialCourse] = useState<Course | null>(
    null,
  )
  const academicPeriod = getCurrentAcademicPeriod()
  useEffect(() => {
    if (currentUser && currentUser.role !== "student") {
      if (activePage === "degree-planner" || activePage === "chatbot") {
        setActivePage("dashboard")
      }
    }
  }, [currentUser, activePage])

  const handleNavigate = (
    page: string,
    options?: {
      tab?: "roadmap" | "timetable"
      course?: Course
    },
  ) => {
    setPlannerInitialTab(options?.tab || "roadmap")
    setFinderInitialCourse(options?.course || null)
    setActivePage(page as Page)
  }
  const handleApplyPlanFromChatbot = (payload: DegreePlanPayload) => {
    const mappedPlan: Record<number, PlacedCourse[]> = {}
    for (const [semStr, list] of Object.entries(payload.plan)) {
      const sem = Number(semStr)
      mappedPlan[sem] = (list || []).map((c) => ({
        id: c.id || c.code || `${c.name}-${sem}`,
        code: c.code,
        name: c.name,
        credits: c.credits || 3,
        semester: c.semester || sem,
        type: c.type === "Pilihan" ? "Pilihan" : "Wajib",
        parity: c.parity === "even" ? "even" : "odd",
        desc: "",
        prerequisites: [],
        status: "planned",
      }))
    }
    setCustomPlan(mappedPlan)
    setAppliedPlanSummary(payload.summary)
    handleNavigate("degree-planner")
  }
  const handleResetPlan = () => {
    setCustomPlan(null)
    setAppliedPlanSummary(null)
  }

  const addCourseToPlanner = (course: Course) => {
    setPendingCourses((prev) =>
      prev.some((c) => c.id === course.id) ? prev : [...prev, course],
    )
  }

  const addedCourseIds = new Set(pendingCourses.map((c) => c.id))

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    authService.logout()
    setCurrentUser(null)
    setIsLoggedIn(false)
    setIsLogoutModalOpen(false)
    setActivePage("dashboard")
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />
  }

  const navItems = useMemo(() => {
    const role = currentUser?.role || "student"
    if (role === "lecturer") {
      return [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "course-finder", label: "Course Finder", icon: Search },
      ] as const
    }
    if (role === "admin") {
      return [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "course-finder", label: "Course Management", icon: BookOpen },
      ] as const
    }
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "course-finder", label: "Course Finder", icon: Search },
      { id: "degree-planner", label: "Degree Planner", icon: Map },
      { id: "chatbot", label: "Compass AI", icon: MessageSquare },
    ] as const
  }, [currentUser?.role])

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "bg-navy text-white flex flex-col flex-shrink-0 shadow-xl z-20 transition-all duration-300 ease-in-out absolute md:relative h-full overflow-hidden",
          isSidebarOpen
            ? "w-64 translate-x-0 opacity-100"
            : "w-0 -translate-x-full md:translate-x-0 opacity-0 pointer-events-none",
        )}
      >
        <div className="flex flex-col h-full w-64 min-w-[16rem]">
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Tutup menu"
            className="md:hidden absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logos Section */}
          <div className="p-5 pb-3">
            <BrandLogo variant="sidebar" />
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 border-t border-navy-light/50">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavigate(item.id)
                    if (window.innerWidth < 768) setIsSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-150 group text-left",
                    isActive
                      ? "bg-navy-light border-l-4 border-gold text-white"
                      : "text-muted hover:text-white hover:bg-navy-light/50 border-l-4 border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive
                        ? "text-gold"
                        : "text-teal-light group-hover:text-teal-light",
                    )}
                  />
                  <span className="font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="p-4 border-t border-navy-light/50">
            <div
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-xl transition-all",
                activePage === "profile"
                  ? "bg-navy-light border border-gold/40 text-white shadow-xs"
                  : "hover:bg-navy-light/50 text-teal-light hover:text-white border border-transparent",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  handleNavigate("profile")
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group p-1 rounded-lg"
                title="Buka Halaman Profil Pengguna"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-xs transition-transform group-hover:scale-105",
                    activePage === "profile"
                      ? "bg-gold text-navy"
                      : "bg-teal text-navy-dark",
                  )}
                >
                  {currentUser?.full_name ? (
                    currentUser.full_name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white group-hover:text-gold transition-colors">
                    {currentUser?.full_name || "Mahasiswa FTMM"}
                  </p>
                  <p className="text-xs text-muted font-mono truncate">
                    {currentUser?.student_profile?.student_number ||
                      currentUser?.email ||
                      currentUser?.role}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                title="Keluar / Logout dari Sesi"
                aria-label="Logout"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-muted hover:text-orange hover:bg-orange/15 flex-shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-10 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 flex-shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <AnimatedMenuToggle
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-navy capitalize truncate">
              {activePage === "chatbot"
                ? "Compass AI"
                : activePage === "profile"
                  ? "Profil Pengguna"
                  : activePage === "course-finder" &&
                      currentUser?.role === "admin"
                    ? "Course Management"
                    : activePage.replace("-", " ")}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationDropdown currentUser={currentUser} />
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-navy">
                {academicPeriod.termDisplay}
              </p>
              <p className="text-xs text-muted font-mono">
                {academicPeriod.weekDisplay}
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div
          className={cn(
            "flex-1 overflow-auto relative",
            activePage === "degree-planner"
              ? "p-4 md:px-6 md:py-4"
              : "p-4 md:p-8",
          )}
        >
          <div
            className={cn(
              "mx-auto h-full",
              activePage === "degree-planner"
                ? "w-full max-w-none"
                : "max-w-7xl",
            )}
          >
            <ErrorBoundary key={activePage}>
              {activePage === "dashboard" && (
                <Dashboard
                  onNavigate={handleNavigate}
                  schedule={activeSchedule}
                  currentUser={currentUser}
                />
              )}
              {activePage === "course-finder" && (
                <CourseFinder
                  onAddToPlanner={addCourseToPlanner}
                  addedCourseIds={addedCourseIds}
                  initialCourse={finderInitialCourse}
                  onClearInitialCourse={() => setFinderInitialCourse(null)}
                  currentUser={currentUser}
                />
              )}
              {activePage === "degree-planner" && (
                <DegreePlanner
                  pendingCourses={pendingCourses}
                  setPendingCourses={setPendingCourses}
                  customPlan={customPlan}
                  appliedSummary={appliedPlanSummary}
                  onResetPlan={handleResetPlan}
                  onNavigate={handleNavigate}
                  initialTab={plannerInitialTab}
                  onUpdateSchedule={setActiveSchedule}
                  currentUser={currentUser}
                />
              )}
              {activePage === "chatbot" && (
                <Chatbot onApplyPlan={handleApplyPlanFromChatbot} />
              )}
              {activePage === "profile" && (
                <Profile
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  onRequestLogout={() => setIsLogoutModalOpen(true)}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-border shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-orange/10 text-orange flex items-center justify-center mx-auto border border-orange/20">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3
                id="logout-dialog-title"
                className="font-heading font-bold text-lg text-navy"
              >
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi akademik di FTMM
                Compass? Anda dapat masuk kembali kapan saja dengan akun
                Cybercampus UNAIR.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-surface text-foreground font-medium text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-orange hover:bg-orange/90 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
