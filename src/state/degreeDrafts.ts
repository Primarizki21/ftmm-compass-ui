import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError, apiErrorMessage } from "../api/client"
import type { Course } from "../data"
import { normalizeCourse } from "../domain/course"
import type { DegreePlanDraft, PlanCourse } from "../domain/plan"
import {
  degreePlanService,
  type DegreePlanDto,
  type DegreePlanItemDto,
  type DegreePlanItemInput,
  type PlannerCatalogItemDto,
} from "../services/degreePlanService"
import { useSession } from "./session"

const LEGACY_KEY = "ftmm_compass_degree_drafts_v2"
const DEFAULT_NAME = "Draft 1"
const SAVE_DELAY_MS = 500

interface LegacyCourse {
  code?: string
  semester?: number
}

interface LegacyDraft {
  name?: string
  plan?: Record<string, LegacyCourse[]>
}

interface LegacyState {
  activeDraftId?: string
  drafts?: LegacyDraft[]
}

function planFromDto(items: DegreePlanItemDto[]): Record<number, PlanCourse[]> {
  const plan: Record<number, PlanCourse[]> = {}
  for (const item of items) {
    const course: PlanCourse = {
      id: item.id,
      code: item.code,
      name: item.name,
      credits: item.credits,
      semester: item.semester,
      type: item.type,
      parity: item.parity,
      desc: item.desc,
      status: "planned",
    }
    plan[item.semester] = [...(plan[item.semester] ?? []), course]
  }
  return plan
}

function itemsFromPlan(
  plan: Record<number, PlanCourse[]>,
): DegreePlanItemInput[] {
  const items: DegreePlanItemInput[] = []
  for (const [semester, courses] of Object.entries(plan)) {
    for (const course of courses) {
      if (!course.code) continue
      items.push({
        course_code: course.code,
        planned_semester: Number(semester),
      })
    }
  }
  return items
}

function draftFromDto(dto: DegreePlanDto): DegreePlanDraft {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    plan: planFromDto(dto.items),
    updatedAt: dto.updated_at,
  }
}

export interface DegreeDraftsReturn {
  drafts: DegreePlanDraft[]
  courses: Course[]
  activeDraftId: string
  activeDraft: DegreePlanDraft | undefined
  plan: Record<number, PlanCourse[]>
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  saveError: string | null
  setPlan: (
    updater: Record<number, PlanCourse[]> | ((
      prev: Record<number, PlanCourse[]>,
    ) => Record<number, PlanCourse[]>),
  ) => void
  switchDraft: (draftId: string) => Promise<void>
  createDraft: (name: string) => Promise<void>
  duplicateCurrentDraft: () => Promise<void>
  resetCurrentDraft: () => Promise<void>
  deleteDraft: (draftId: string) => Promise<boolean>
  retrySave: () => Promise<void>
}

export function useDegreeDrafts(): DegreeDraftsReturn {
  const { isLoggedIn } = useSession()
  const [drafts, setDrafts] = useState<DegreePlanDraft[]>([])
  const [activeDraftId, setActiveDraftId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])

  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const activeIdRef = useRef(activeDraftId)
  activeIdRef.current = activeDraftId
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)
  const versionRef = useRef(0)
  const loadedRef = useRef(false)

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId)
  const plan = activeDraft?.plan ?? {}

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const persist = useCallback(
    async (planId: string, nextPlan: Record<number, PlanCourse[]>) => {
      if (!planId) return
      const version = versionRef.current
      setIsSaving(true)
      try {
        const dto = await degreePlanService.replaceItems(
          planId,
          itemsFromPlan(nextPlan),
        )
        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === dto.id && version === versionRef.current
              ? draftFromDto(dto)
              : draft.id === dto.id
                ? { ...draft, updatedAt: dto.updated_at }
                : draft,
          ),
        )
        setLastSaved(new Date())
        setSaveError(null)
      } catch (error) {
        setSaveError(
          apiErrorMessage(error, "Gagal menyimpan rencana studi ke server"),
        )
      } finally {
        setIsSaving(false)
      }
    },
    [],
  )

  const flush = useCallback(async () => {
    clearTimer()
    if (!pendingRef.current) return
    pendingRef.current = false
    const draft = draftsRef.current.find(
      (item) => item.id === activeIdRef.current,
    )
    if (!draft) return
    await persist(draft.id, draft.plan)
  }, [clearTimer, persist])

  const replaceDraft = useCallback((dto: DegreePlanDto) => {
    const next = draftFromDto(dto)
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === next.id ? next : draft)),
    )
  }, [])

  const activate = useCallback(async (draftId: string) => {
    setActiveDraftId(draftId)
    try {
      const dto = await degreePlanService.update(draftId, {
        status: "active",
      })
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === dto.id
            ? { ...draft, status: dto.status }
            : draft.status === "active"
              ? { ...draft, status: "draft" }
              : draft,
        ),
      )
      setSaveError(null)
    } catch (error) {
      setSaveError(
        apiErrorMessage(error, "Gagal mengaktifkan skenario rencana"),
      )
    }
  }, [])

  const createWithName = useCallback(
    async (name: string, items: DegreePlanItemInput[]) => {
      let attempt = 1
      let candidate = name
      while (true) {
        try {
          return await degreePlanService.create({
            name: candidate,
            items,
          })
        } catch (error) {
          const conflict = error instanceof ApiError && error.status === 409
          if (!conflict || attempt >= 4) throw error
          attempt += 1
          candidate = `${name} (${attempt})`
        }
      }
    },
    [],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      await migrateLegacy(createWithName)
      const [catalogItems, response] = await Promise.all([
        degreePlanService.catalog(),
        degreePlanService.list(),
      ])
      setCourses(catalogItems.map(toCourse))
      if (response.data.length === 0) {
        const created = await createWithName(DEFAULT_NAME, [])
        await degreePlanService.update(created.id, { status: "active" })
        response.data = (await degreePlanService.list()).data
      }
      const nextDrafts = response.data.map(draftFromDto)
      const active =
        nextDrafts.find((draft) => draft.status === "active") ?? nextDrafts[0]
      setDrafts(nextDrafts)
      setActiveDraftId(active.id)
      setLastSaved(new Date())
      setSaveError(null)
    } catch (error) {
      setSaveError(
        apiErrorMessage(error, "Gagal memuat rencana studi dari server"),
      )
    } finally {
      setIsLoading(false)
    }
  }, [createWithName])

  useEffect(() => {
    if (!isLoggedIn) {
      loadedRef.current = false
      clearTimer()
      setDrafts([])
      setCourses([])
      setActiveDraftId("")
      setIsLoading(false)
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true
    void load()
  }, [clearTimer, isLoggedIn, load])

  useEffect(() => clearTimer, [clearTimer])

  const setPlan = useCallback(
    (
      updater: Record<number, PlanCourse[]> | ((
        prev: Record<number, PlanCourse[]>,
      ) => Record<number, PlanCourse[]>),
    ) => {
      const draftId = activeIdRef.current
      if (!draftId) return
      versionRef.current += 1
      pendingRef.current = true
      setIsSaving(true)
      setDrafts((prev) =>
        prev.map((draft) => {
          if (draft.id !== draftId) return draft
          const nextPlan =
            typeof updater === "function" ? updater(draft.plan) : updater
          return { ...draft, plan: nextPlan }
        }),
      )
      clearTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void flush()
      }, SAVE_DELAY_MS)
    },
    [clearTimer, flush],
  )

  const switchDraft = useCallback(
    async (draftId: string) => {
      if (draftId === activeIdRef.current) return
      await flush()
      await activate(draftId)
    },
    [activate, flush],
  )

  const createDraft = useCallback(
    async (name: string) => {
      await flush()
      try {
        const created = await createWithName(name, [])
        setDrafts((prev) => [...prev, draftFromDto(created)])
        await activate(created.id)
      } catch (error) {
        setSaveError(
          apiErrorMessage(error, "Gagal membuat skenario rencana baru"),
        )
      }
    },
    [activate, createWithName, flush],
  )

  const duplicateCurrentDraft = useCallback(async () => {
    await flush()
    const source = draftsRef.current.find(
      (draft) => draft.id === activeIdRef.current,
    )
    if (!source) return
    try {
      const created = await createWithName(
        `${source.name} (Salinan)`,
        itemsFromPlan(source.plan),
      )
      setDrafts((prev) => [...prev, draftFromDto(created)])
      await activate(created.id)
    } catch (error) {
      setSaveError(apiErrorMessage(error, "Gagal menyalin skenario rencana"))
    }
  }, [activate, createWithName, flush])

  const resetCurrentDraft = useCallback(async () => {
    clearTimer()
    pendingRef.current = false
    const draftId = activeIdRef.current
    if (!draftId) return
    try {
      const dto = await degreePlanService.get(draftId)
      replaceDraft(dto)
      setSaveError(null)
    } catch (error) {
      setSaveError(
        apiErrorMessage(error, "Gagal memuat ulang skenario dari server"),
      )
    }
  }, [clearTimer, replaceDraft])

  const deleteDraft = useCallback(
    async (draftId: string): Promise<boolean> => {
      if (draftsRef.current.length <= 1) return false
      await flush()
      try {
        await degreePlanService.remove(draftId)
      } catch (error) {
        setSaveError(apiErrorMessage(error, "Gagal menghapus skenario rencana"))
        return false
      }
      const remaining = draftsRef.current.filter(
        (draft) => draft.id !== draftId,
      )
      setDrafts(remaining)
      if (draftId === activeIdRef.current) {
        await activate(remaining[0].id)
      }
      return true
    },
    [activate, flush],
  )

  const retrySave = useCallback(async () => {
    pendingRef.current = true
    await flush()
  }, [flush])

  return {
    drafts,
    courses,
    activeDraftId,
    activeDraft,
    plan,
    isLoading,
    isSaving,
    lastSaved,
    saveError,
    setPlan,
    switchDraft,
    createDraft,
    duplicateCurrentDraft,
    resetCurrentDraft,
    deleteDraft,
    retrySave,
  }
}

async function migrateLegacy(
  createWithName: (
    name: string,
    items: DegreePlanItemInput[],
  ) => Promise<DegreePlanDto>,
): Promise<void> {
  if (typeof window === "undefined") return
  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) return

  const existing = await degreePlanService.list()
  if (existing.meta.total > 0) {
    window.localStorage.removeItem(LEGACY_KEY)
    return
  }

  let parsed: LegacyState
  try {
    parsed = JSON.parse(raw)
  } catch {
    window.localStorage.removeItem(LEGACY_KEY)
    return
  }

  const legacyDrafts = parsed.drafts ?? []
  let activeDraftId = ""
  for (const [index, draft] of legacyDrafts.entries()) {
    const items: DegreePlanItemInput[] = []
    for (const [semester, courses] of Object.entries(draft.plan ?? {})) {
      for (const course of courses) {
        if (!course.code) continue
        items.push({
          course_code: course.code,
          planned_semester: Number(semester),
        })
      }
    }
    const created = await createWithName(
      draft.name || `Draft ${index + 1}`,
      items,
    )
    if (
      legacyDrafts[index] &&
      parsed.activeDraftId === legacyDrafts[index].name
    ) {
      activeDraftId = created.id
    }
    if (index === 0 && !activeDraftId) activeDraftId = created.id
  }

  const invalid = legacyDrafts.some((draft) =>
    Object.values(draft.plan ?? {})
      .flat()
      .some((course) => !course.code),
  )
  if (activeDraftId) {
    await degreePlanService.update(activeDraftId, { status: "active" })
  }
  if (!invalid) {
    window.localStorage.removeItem(LEGACY_KEY)
  }
}

function toCourse(item: PlannerCatalogItemDto, index: number): Course {
  return normalizeCourse({
    code: item.code ?? item.id,
    fallbackId: `mk-${index + 1}`,
    name: item.name,
    credits: item.credits,
    semester: item.semester,
    type: item.type,
    parity: item.parity,
    desc: item.desc,
    program: item.program ?? "",
  })
}
