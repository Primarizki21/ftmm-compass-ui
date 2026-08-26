import {
  Bell,
  Compass,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react"
import React, { useState } from "react"
import { cn } from "./utils"
import { Course } from "./data"

// Pages
import Dashboard from "./pages/Dashboard"
import CourseFinder from "./pages/CourseFinder"
import DegreePlanner from "./pages/DegreePlanner"
import Chatbot from "./pages/Chatbot"
import Login from "./pages/Login"

import mainLogo from "./imports/image-6.png"

type Page = "dashboard" | "course-finder" | "degree-planner" | "chatbot"

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState<Page>("dashboard")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [pendingCourses, setPendingCourses] = useState<Course[]>([])

  const addCourseToPlanner = (course: Course) => {
    setPendingCourses((prev) =>
      prev.some((c) => c.id === course.id) ? prev : [...prev, course],
    )
  }

  const addedCourseIds = new Set(pendingCourses.map((c) => c.id))

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "course-finder", label: "Course Finder", icon: Search },
    { id: "degree-planner", label: "Degree Planner", icon: Map },
    { id: "chatbot", label: "Compass AI", icon: MessageSquare },
  ] as const

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-foreground">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "bg-navy text-white flex flex-col flex-shrink-0 shadow-xl z-20 transition-all duration-300 ease-in-out absolute md:relative h-full",
          isSidebarOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden opacity-0",
        )}
      >
        <div className="flex flex-col h-full min-w-[16rem]">
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logos Section */}
          <div className="p-6 pb-2">
            <div className="flex justify-center">
              <img
                src={mainLogo}
                alt="Main Logo"
                className="h-20 object-contain drop-shadow-md"
              />
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/30 relative overflow-hidden group flex-shrink-0">
              <Compass className="w-6 h-6 transition-transform duration-700 group-hover:rotate-180" />
              <div className="absolute w-[2px] h-4 bg-gold top-1 left-1/2 -translate-x-1/2 rounded-full" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg tracking-wide text-gold whitespace-nowrap">
                FTMM COMPASS
              </h1>
              <p className="text-[10px] text-teal-light uppercase tracking-wider font-mono whitespace-nowrap">
                Academic Advisor
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 border-t border-navy-light/50">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id)
                    if (window.innerWidth < 768) setIsSidebarOpen(false) // Close on mobile click
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-left",
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-navy-light/50 transition-colors cursor-pointer text-teal-light hover:text-white">
              <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-navy-dark" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  Airlangga Student
                </p>
                <p className="text-xs text-muted font-mono truncate">
                  1621123456
                </p>
              </div>
              <LogOut className="w-4 h-4 text-muted hover:text-danger flex-shrink-0" />
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
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-muted hover:text-navy hover:bg-background rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-navy capitalize truncate">
              {activePage.replace("-", " ")}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-muted hover:text-navy hover:bg-background rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-surface"></span>
            </button>
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-navy">Semester Ganjil 2024/2025</p>
              <p className="text-xs text-muted font-mono">Week 4</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {activePage === "dashboard" && (
              <Dashboard onNavigate={setActivePage} />
            )}
            {activePage === "course-finder" && (
              <CourseFinder
                onAddToPlanner={addCourseToPlanner}
                addedCourseIds={addedCourseIds}
              />
            )}
            {activePage === "degree-planner" && (
              <DegreePlanner
                pendingCourses={pendingCourses}
                setPendingCourses={setPendingCourses}
              />
            )}
            {activePage === "chatbot" && <Chatbot />}
          </div>
        </div>
      </main>
    </div>
  )
}
