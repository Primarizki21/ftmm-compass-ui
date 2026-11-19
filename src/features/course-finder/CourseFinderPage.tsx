import { useEffect, useMemo, useState } from "react"
import { useSession } from "@/features/auth/session"
import { useCatalog } from "@/features/catalog/catalog"
import CourseDetailView from "@/features/course-finder/components/CourseDetailView"
import CourseFilterBar from "@/features/course-finder/components/CourseFilterBar"
import CourseFormModal from "@/features/course-finder/components/CourseFormModal"
import CourseQuickModal from "@/features/course-finder/components/CourseQuickModal"
import CourseResultsList from "@/features/course-finder/components/CourseResultsList"
import VotePriorityModal from "@/features/course-finder/components/VotePriorityModal"
import { useCourseFilters } from "@/features/course-finder/hooks/useCourseFilters"
import { usePolling } from "@/features/polling/polling"
import type { StudentVote } from "@/features/polling/pollingService"
import { apiErrorMessage } from "@/shared/api/client"
import type { Course } from "@/shared/domain/models"

export interface CourseFinderProps {
  onAddToPlanner: (course: Course) => void
  addedCourseIds: Set<string>
  initialCourse?: Course | null
  onClearInitialCourse?: () => void
}

export default function CourseFinder({
  onAddToPlanner,
  addedCourseIds,
  initialCourse,
  onClearInitialCourse,
}: CourseFinderProps) {
  const { user: currentUser } = useSession()
  const {
    courses: catalogCourses,
    programs,
    isLoading: catalogLoading,
    upsert,
  } = useCatalog()
  const {
    period: pollingPeriod,
    myVotes,
    demand,
    error: pollingError,
    loadDemand,
    submitVote,
    removeVote,
  } = usePolling()
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [priorityModalCourse, setPriorityModalCourse] = useState<Course | null>(
    null,
  )
  const [modalPriority, setModalPriority] = useState<1 | 2 | 3>(1)
  const [isSubmittingVote, setIsSubmittingVote] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  useEffect(() => {
    if (initialCourse) {
      setDetailCourse(initialCourse)
    }
  }, [initialCourse])

  useEffect(() => {
    if (!demand.all) void loadDemand("all")
  }, [demand.all, loadDemand])

  const demandStats = useMemo(() => {
    const stats: Record<string, number> = {}
    for (const item of demand.all?.items ?? []) {
      if (item.course_code) stats[item.course_code] = item.total_votes
    }
    return stats
  }, [demand])

  const filters = useCourseFilters({
    catalogCourses,
    programs,
    demandStats,
    pollingPeriod,
  })
  const { courses, availablePrograms, rankedCourseCodes } = filters

  const myVoteMap = useMemo(() => {
    const map: Record<string, StudentVote> = {}
    myVotes.forEach((vote) => {
      map[vote.course_id] = vote
      if (vote.course_code) map[vote.course_code] = vote
    })
    return map
  }, [myVotes])

  const voteKey = (course: Course) => course.code || course.id
  const votesFor = (course: Course) => demandStats[voteKey(course)] ?? 0
  const voteFor = (course: Course) => myVoteMap[voteKey(course)]

  const maxVotes = pollingPeriod?.max_votes_per_student || 3
  const remainingSlots = Math.max(0, maxVotes - myVotes.length)

  const handleOpenPriorityModal = (course: Course) => {
    const currentVote = voteFor(course)
    setVoteError(null)
    setModalPriority(currentVote?.priority || 1)
    setPriorityModalCourse(course)
  }

  const handleSaveVote = async () => {
    if (!priorityModalCourse) return
    setVoteError(null)
    setIsSubmittingVote(true)
    try {
      await submitVote(voteKey(priorityModalCourse), modalPriority)
      void loadDemand("all")
      setPriorityModalCourse(null)
    } catch (cause) {
      setVoteError(apiErrorMessage(cause, "Wishlist gagal disimpan."))
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const handleRemoveVote = async (courseId: string) => {
    setIsSubmittingVote(true)
    try {
      await removeVote(courseId)
      void loadDemand("all")
      setPriorityModalCourse(null)
    } finally {
      setIsSubmittingVote(false)
    }
  }

  const handleAddToPlanner = (course: Course) => {
    onAddToPlanner(course)
    setSelectedCourse(null)
  }

  if (detailCourse) {
    return (
      <CourseDetailView
        course={detailCourse}
        catalog={courses}
        onBack={() => {
          setDetailCourse(null)
          onClearInitialCourse?.()
        }}
        onAdd={handleAddToPlanner}
        addedCourseIds={addedCourseIds}
        currentUser={currentUser}
      />
    )
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {pollingError && (
        <div
          role="status"
          className="mb-3 px-4 py-2.5 rounded-xl border border-orange/30 bg-orange/10 text-xs text-navy"
        >
          {pollingError}
        </div>
      )}
      <CourseFilterBar
        filters={filters}
        currentUser={currentUser}
        onCreateCourse={() => {
          setEditingCourse(null)
          setIsCourseFormOpen(true)
        }}
      />
      <CourseResultsList
        filtered={filters.filtered}
        catalogLoading={catalogLoading}
        onSelectCourse={setSelectedCourse}
        currentUser={currentUser}
        onEditCourse={(course) => {
          setEditingCourse(course)
          setIsCourseFormOpen(true)
        }}
        votesFor={votesFor}
        pollingPeriod={pollingPeriod}
        rankedCourseCodes={rankedCourseCodes}
        voteFor={voteFor}
        onOpenPriorityModal={handleOpenPriorityModal}
        addedCourseIds={addedCourseIds}
      />
      <CourseQuickModal
        course={selectedCourse}
        catalog={courses}
        addedCourseIds={addedCourseIds}
        onClose={() => setSelectedCourse(null)}
        onAddToPlanner={handleAddToPlanner}
        onOpenDetail={(course) => {
          setDetailCourse(course)
          setSelectedCourse(null)
        }}
        currentUser={currentUser}
        demandStats={demandStats}
        minQuorum={pollingPeriod?.min_quorum ?? 0}
      />
      <VotePriorityModal
        course={priorityModalCourse}
        priority={modalPriority}
        onPriorityChange={setModalPriority}
        isVoted={Boolean(priorityModalCourse && voteFor(priorityModalCourse))}
        remainingSlots={remainingSlots}
        maxVotes={maxVotes}
        pollingPeriod={pollingPeriod}
        isSubmitting={isSubmittingVote}
        error={voteError}
        onSave={handleSaveVote}
        onRemove={handleRemoveVote}
        onClose={() => setPriorityModalCourse(null)}
      />
      <CourseFormModal
        isOpen={isCourseFormOpen}
        onClose={() => {
          setIsCourseFormOpen(false)
          setEditingCourse(null)
        }}
        initialCourse={editingCourse}
        availablePrograms={availablePrograms}
        onSuccess={upsert}
      />
    </div>
  )
}
