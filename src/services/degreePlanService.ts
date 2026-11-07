import { apiFetch } from "../api/client"

export interface DegreePlanItemDto {
  id: string
  course_id: string
  code: string
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  parity: "odd" | "even"
  desc: string
  planning_status: "planned" | "wishlist"
}

export interface DegreePlanDto {
  id: string
  name: string
  status: "draft" | "active" | "archived"
  updated_at: string
  items: DegreePlanItemDto[]
}

export interface DegreePlanItemInput {
  course_code: string
  planned_semester: number
  planning_status?: "planned" | "wishlist"
}

interface DegreePlanListMeta {
  total: number
  limit: number
}

interface DegreePlanListDto {
  data: DegreePlanDto[]
  meta: DegreePlanListMeta
}

export interface PlannerCatalogItemDto {
  id: string
  code?: string | null
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  parity: "odd" | "even"
  desc?: string
  program?: string | null
}

export interface DegreePlanPatch {
  name?: string
  status?: "draft" | "active"
}

const PATH = "/api/v1/degree-plans"

export const degreePlanService = {
  list(): Promise<DegreePlanListDto> {
    return apiFetch<DegreePlanListDto>(PATH, { auth: true })
  },

  create(input: {
    name: string
    items: DegreePlanItemInput[]
  }): Promise<DegreePlanDto> {
    return apiFetch<DegreePlanDto>(PATH, {
      method: "POST",
      body: input,
      auth: true,
    })
  },

  catalog(): Promise<PlannerCatalogItemDto[]> {
    return apiFetch<{ data: PlannerCatalogItemDto[] }>(`${PATH}/catalog`, {
      auth: true,
    }).then((response) => response.data)
  },

  get(planId: string): Promise<DegreePlanDto> {
    return apiFetch<DegreePlanDto>(`${PATH}/${planId}`, { auth: true })
  },

  replaceItems(
    planId: string,
    items: DegreePlanItemInput[],
  ): Promise<DegreePlanDto> {
    return apiFetch<DegreePlanDto>(`${PATH}/${planId}/items`, {
      method: "PUT",
      body: { items },
      auth: true,
    })
  },

  update(planId: string, patch: DegreePlanPatch): Promise<DegreePlanDto> {
    return apiFetch<DegreePlanDto>(`${PATH}/${planId}`, {
      method: "PATCH",
      body: patch,
      auth: true,
    })
  },

  remove(planId: string): Promise<void> {
    return apiFetch<void>(`${PATH}/${planId}`, {
      method: "DELETE",
      auth: true,
    })
  },
}
