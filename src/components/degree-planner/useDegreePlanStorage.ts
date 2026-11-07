import { useState, useEffect, useRef, useCallback } from "react"
import { type PlacedCourse, INITIAL_PLAN } from "./types"

export const DEGREE_PLAN_STORAGE_KEY = "ftmm_compass_degree_drafts_v2"

export interface DegreePlanDraft {
  id: string
  name: string
  description: string
  plan: Record<number, PlacedCourse[]>
  /** Rencana awal draft ini; dipakai tombol reset. */
  initialPlan?: Record<number, PlacedCourse[]>
  updatedAt: string
  isDefault?: boolean
}

export interface DegreePlanStorageState {
  activeDraftId: string
  drafts: DegreePlanDraft[]
}

const DEFAULT_DRAFTS: DegreePlanDraft[] = [
  {
    id: "draft-1",
    name: "Draft 1",
    description: "",
    plan: INITIAL_PLAN,
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
]

function withInitialPlans(
  state: DegreePlanStorageState,
): DegreePlanStorageState {
  return {
    ...state,
    drafts: state.drafts.map((draft) => ({
      ...draft,
      initialPlan: draft.initialPlan ?? draft.plan,
    })),
  }
}

function loadInitialState(): DegreePlanStorageState {
  if (typeof window === "undefined") {
    return withInitialPlans({
      activeDraftId: "draft-1",
      drafts: DEFAULT_DRAFTS,
    })
  }

  try {
    const raw = window.localStorage.getItem(DEGREE_PLAN_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(
        DEGREE_PLAN_STORAGE_KEY,
        JSON.stringify({
          activeDraftId: "draft-1",
          drafts: DEFAULT_DRAFTS,
        }),
      )
      return {
        activeDraftId: "draft-1",
        drafts: DEFAULT_DRAFTS,
      }
    }

    const parsed = JSON.parse(raw) as Partial<DegreePlanStorageState>
    if (
      parsed &&
      Array.isArray(parsed.drafts) &&
      parsed.drafts.length > 0 &&
      typeof parsed.activeDraftId === "string"
    ) {
      // Validate activeDraftId exists in drafts
      const exists = parsed.drafts.some((d) => d.id === parsed.activeDraftId)
      const validActiveId = exists ? parsed.activeDraftId : parsed.drafts[0].id
      return withInitialPlans({
        activeDraftId: validActiveId,
        drafts: parsed.drafts as DegreePlanDraft[],
      })
    }
  } catch {
    // If corrupted, fallback to defaults
  }

  return {
    activeDraftId: "draft-1",
    drafts: DEFAULT_DRAFTS,
  }
}

function persistState(state: DegreePlanStorageState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DEGREE_PLAN_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage quota or private mode fallback
  }
}

export interface UseDegreePlanStorageReturn {
  drafts: DegreePlanDraft[]
  activeDraftId: string
  activeDraft: DegreePlanDraft
  plan: Record<number, PlacedCourse[]>
  setPlan: (
    updater: Record<number, PlacedCourse[]> | ((
      prev: Record<number, PlacedCourse[]>,
    ) => Record<number, PlacedCourse[]>),
  ) => void
  switchDraft: (draftId: string) => void
  createDraft: (
    name: string,
    description?: string,
    basePlan?: Record<number, PlacedCourse[]>,
  ) => DegreePlanDraft
  duplicateCurrentDraft: (customName?: string) => DegreePlanDraft
  renameDraft: (draftId: string, newName: string) => void
  deleteDraft: (draftId: string) => boolean
  resetCurrentDraft: () => void
  isSaving: boolean
  lastSaved: Date | null
}

export function useDegreePlanStorage(): UseDegreePlanStorageReturn {
  const [storageState, setStorageState] =
    useState<DegreePlanStorageState>(loadInitialState)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const activeDraft =
    storageState.drafts.find((d) => d.id === storageState.activeDraftId) ||
    storageState.drafts[0]

  const [currentPlan, setCurrentPlan] =
    useState<Record<number, PlacedCourse[]>>(activeDraft.plan)

  const saveTimerRef = useRef<number | NodeJS.Timeout | null>(null)
  const latestPlanRef = useRef<Record<number, PlacedCourse[]>>(currentPlan)
  latestPlanRef.current = currentPlan

  const flushSave = useCallback(
    (planToSave: Record<number, PlacedCourse[]>) => {
      setStorageState((prevState) => {
        const nowIso = new Date().toISOString()
        const updatedDrafts = prevState.drafts.map((draft) =>
          draft.id === prevState.activeDraftId
            ? { ...draft, plan: planToSave, updatedAt: nowIso }
            : draft,
        )
        return { ...prevState, drafts: updatedDrafts }
      })
      setIsSaving(false)
      setLastSaved(new Date())
    },
    [],
  )

  useEffect(() => {
    persistState(storageState)
  }, [storageState])

  // Debounced auto-save function (~500ms)
  const setPlanWithDebouncedSave = useCallback(
    (
      updater: Record<number, PlacedCourse[]> | ((
        prev: Record<number, PlacedCourse[]>,
      ) => Record<number, PlacedCourse[]>),
    ) => {
      setCurrentPlan((prev) => {
        const nextPlan = typeof updater === "function" ? updater(prev) : updater
        latestPlanRef.current = nextPlan

        setIsSaving(true)
        clearTimeout(saveTimerRef.current ?? undefined)

        saveTimerRef.current = setTimeout(() => {
          flushSave(nextPlan)
          saveTimerRef.current = null
        }, 500)

        return nextPlan
      })
    },
    [flushSave],
  )

  const switchDraft = useCallback(
    (draftId: string) => {
      clearTimeout(saveTimerRef.current ?? undefined)
      flushSave(latestPlanRef.current)

      setStorageState((prev) => {
        const target = prev.drafts.find((d) => d.id === draftId)
        if (!target) return prev

        const nextState = {
          ...prev,
          activeDraftId: draftId,
        }
        persistState(nextState)
        setCurrentPlan(target.plan)
        return nextState
      })
    },
    [flushSave],
  )

  const createDraft = useCallback(
    (
      name: string,
      description = "Skenario kustom rencana studi.",
      basePlan?: Record<number, PlacedCourse[]>,
    ) => {
      const newId = `draft-${Date.now()}`
      const newDraft: DegreePlanDraft = {
        id: newId,
        name,
        description,
        plan: basePlan || latestPlanRef.current,
        initialPlan: basePlan || latestPlanRef.current,
        updatedAt: new Date().toISOString(),
        isDefault: false,
      }

      setStorageState((prev) => {
        const nextState: DegreePlanStorageState = {
          activeDraftId: newId,
          drafts: [...prev.drafts, newDraft],
        }
        persistState(nextState)
        setCurrentPlan(newDraft.plan)
        return nextState
      })

      return newDraft
    },
    [],
  )

  const duplicateCurrentDraft = useCallback(
    (customName?: string) => {
      const name = customName || `${activeDraft.name} (Salinan)`
      return createDraft(name, activeDraft.description, latestPlanRef.current)
    },
    [activeDraft, createDraft],
  )

  const renameDraft = useCallback((draftId: string, newName: string) => {
    setStorageState((prev) => {
      const nextState: DegreePlanStorageState = {
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === draftId ? { ...d, name: newName } : d,
        ),
      }
      persistState(nextState)
      return nextState
    })
  }, [])

  const deleteDraft = useCallback(
    (draftId: string): boolean => {
      if (storageState.drafts.length <= 1) {
        return false
      }
      clearTimeout(saveTimerRef.current ?? undefined)
      saveTimerRef.current = null

      setStorageState((prev) => {
        const filtered = prev.drafts.filter((d) => d.id !== draftId)
        let nextActiveId = prev.activeDraftId
        if (prev.activeDraftId === draftId) {
          nextActiveId = filtered[0].id
          setCurrentPlan(filtered[0].plan)
        }
        const nextState: DegreePlanStorageState = {
          activeDraftId: nextActiveId,
          drafts: filtered,
        }
        persistState(nextState)
        return nextState
      })
      return true
    },
    [storageState.drafts.length],
  )

  const resetCurrentDraft = useCallback(() => {
    setPlanWithDebouncedSave(activeDraft.initialPlan ?? {})
  }, [activeDraft.initialPlan, setPlanWithDebouncedSave])

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current ?? undefined)
    }
  }, [])

  return {
    drafts: storageState.drafts,
    activeDraftId: storageState.activeDraftId,
    activeDraft,
    plan: currentPlan,
    setPlan: setPlanWithDebouncedSave,
    switchDraft,
    createDraft,
    duplicateCurrentDraft,
    renameDraft,
    deleteDraft,
    resetCurrentDraft,
    isSaving,
    lastSaved,
  }
}
