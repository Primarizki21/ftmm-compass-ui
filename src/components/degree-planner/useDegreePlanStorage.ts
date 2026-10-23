import { useState, useEffect, useRef, useCallback } from "react"
import { type PlacedCourse, INITIAL_PLAN } from "./types"

export const DEGREE_PLAN_STORAGE_KEY = "ftmm_compass_degree_drafts"

export interface DegreePlanDraft {
  id: string
  name: string
  description: string
  plan: Record<number, PlacedCourse[]>
  updatedAt: string
  isDefault?: boolean
}

export interface DegreePlanStorageState {
  activeDraftId: string
  drafts: DegreePlanDraft[]
}

const DEFAULT_DRAFTS: DegreePlanDraft[] = [
  {
    id: "draft-regular",
    name: "Draft 1: Reguler",
    description:
      "Jalur reguler standar 8 semester (144 SKS) dengan sebaran matkul wajib dan pilihan seimbang.",
    plan: INITIAL_PLAN,
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: "draft-acceleration",
    name: "Draft 2: Akselerasi",
    description:
      "Skenario percepatan lulus 7 semester dengan pemadatan beban SKS dan persiapan tugas akhir lebih awal.",
    plan: {
      ...INITIAL_PLAN,
      5: [
        ...(INITIAL_PLAN[5] || []),
        {
          id: "TSD3101",
          name: "Big Data Architecture",
          code: "TSD3101",
          credits: 3,
          semester: 5,
          type: "Pilihan",
          desc: "Hadoop, Spark, Kafka, streaming architecture.",
          parity: "odd",
          status: "planned",
        },
      ],
      6: [
        ...(INITIAL_PLAN[6] || []),
        {
          id: "TSD3201",
          name: "Natural Language Processing",
          code: "TSD3201",
          credits: 3,
          semester: 6,
          type: "Pilihan",
          desc: "Text embeddings, LLM, BERT, tokenization.",
          parity: "even",
          status: "planned",
        },
        {
          id: "TSD3203",
          name: "Metodologi Penelitian & Penulisan Ilmiah",
          code: "TSD3203",
          credits: 2,
          semester: 6,
          type: "Wajib",
          desc: "Penyusunan proposal skripsi dan studi literatur.",
          parity: "even",
          status: "planned",
        },
      ],
      7: [
        {
          id: "TSD4101",
          name: "Tugas Akhir / Skripsi",
          code: "TSD4101",
          credits: 6,
          semester: 7,
          type: "Wajib",
          desc: "Penelitian skripsi mandiri tingkat sarjana.",
          parity: "odd",
          status: "planned",
        },
      ],
    },
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: "draft-mbkm",
    name: "Draft 3: MBKM / Peminatan",
    description:
      "Skenario alokasi magang industri bersertifikat / studi independen MBKM pada semester 6-7.",
    plan: {
      ...INITIAL_PLAN,
      6: [
        {
          id: "MBKM601",
          name: "Magang Industri Bersertifikat MBKM",
          code: "MBKM601",
          credits: 20,
          semester: 6,
          type: "Pilihan",
          desc: "Konversi 20 SKS program magang mitra DUDI Kemendikbudristek.",
          parity: "even",
          status: "planned",
        },
      ],
      7: [
        {
          id: "MBKM701",
          name: "Studi Independen / Riset Terapan MBKM",
          code: "MBKM701",
          credits: 20,
          semester: 7,
          type: "Pilihan",
          desc: "Proyek inovasi teknologi multidisiplin dan riset industri.",
          parity: "odd",
          status: "planned",
        },
      ],
      8: [
        {
          id: "TSD4201",
          name: "Tugas Akhir & Ujian Komprehensif",
          code: "TSD4201",
          credits: 6,
          semester: 8,
          type: "Wajib",
          desc: "Penyusunan laporan komprehensif hasil hilirisasi MBKM.",
          parity: "even",
          status: "planned",
        },
      ],
    },
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
]

function loadInitialState(): DegreePlanStorageState {
  if (typeof window === "undefined") {
    return {
      activeDraftId: "draft-regular",
      drafts: DEFAULT_DRAFTS,
    }
  }

  try {
    const raw = window.localStorage.getItem(DEGREE_PLAN_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(
        DEGREE_PLAN_STORAGE_KEY,
        JSON.stringify({
          activeDraftId: "draft-regular",
          drafts: DEFAULT_DRAFTS,
        }),
      )
      return {
        activeDraftId: "draft-regular",
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
      return {
        activeDraftId: validActiveId,
        drafts: parsed.drafts as DegreePlanDraft[],
      }
    }
  } catch {
    // If corrupted, fallback to defaults
  }

  return {
    activeDraftId: "draft-regular",
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

export function useDegreePlanStorage(
  externalCustomPlan?: Record<number, PlacedCourse[]> | null,
): UseDegreePlanStorageReturn {
  const [storageState, setStorageState] =
    useState<DegreePlanStorageState>(loadInitialState)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const activeDraft =
    storageState.drafts.find((d) => d.id === storageState.activeDraftId) ||
    storageState.drafts[0]

  const [currentPlan, setCurrentPlan] =
    useState<Record<number, PlacedCourse[]>>(
      externalCustomPlan || activeDraft.plan,
    )

  const saveTimerRef = useRef<number | NodeJS.Timeout | null>(null)
  const latestPlanRef = useRef<Record<number, PlacedCourse[]>>(currentPlan)
  latestPlanRef.current = currentPlan

  // Keep currentPlan in sync when externalCustomPlan is provided (e.g. from Compass AI)
  useEffect(() => {
    if (externalCustomPlan) {
      setCurrentPlan(externalCustomPlan)
    }
  }, [externalCustomPlan])

  // Flush pending save to localStorage
  const flushSave = useCallback(
    (planToSave: Record<number, PlacedCourse[]>) => {
      setStorageState((prevState) => {
        const nowIso = new Date().toISOString()
        const updatedDrafts = prevState.drafts.map((draft) =>
          draft.id === prevState.activeDraftId
            ? { ...draft, plan: planToSave, updatedAt: nowIso }
            : draft,
        )
        const nextState = {
          ...prevState,
          drafts: updatedDrafts,
        }
        persistState(nextState)
        return nextState
      })
      setIsSaving(false)
      setLastSaved(new Date())
    },
    [],
  )

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

  // Switch to another draft
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

  // Create new draft
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

  // Duplicate current draft
  const duplicateCurrentDraft = useCallback(
    (customName?: string) => {
      const name = customName || `${activeDraft.name} (Salinan)`
      return createDraft(name, activeDraft.description, latestPlanRef.current)
    },
    [activeDraft, createDraft],
  )

  // Rename a draft
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

  // Delete a draft
  const deleteDraft = useCallback(
    (draftId: string): boolean => {
      if (storageState.drafts.length <= 1) {
        return false
      }

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

  // Reset active draft to default plan
  const resetCurrentDraft = useCallback(() => {
    const defaultDraft = DEFAULT_DRAFTS.find(
      (d) => d.id === storageState.activeDraftId,
    )
    const resetPlan = defaultDraft ? defaultDraft.plan : INITIAL_PLAN
    setPlanWithDebouncedSave(resetPlan)
  }, [storageState.activeDraftId, setPlanWithDebouncedSave])

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
