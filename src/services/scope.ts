/* ——————————————————————————————————————————————————
 * CommitCheck — Scope / Requirements Service
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/scope,
 *  GET/PATCH/DELETE /projects/:projectId/scope/:id).
 * —————————————————————————————————————————————————— */

import type { Requirement } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  unwrap,
  unwrapList,
  mapRequirement,
  mapRequirementStatusToBackend,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendRequirement,
} from '@/services/api/adapters'

function toCreateUpdatePayload(data: Partial<Requirement>) {
  return {
    ...(data.name !== undefined ? { title: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.priority !== undefined
      ? { priority: data.priority.toUpperCase() }
      : {}),
    ...(data.status !== undefined
      ? { approvalStatus: mapRequirementStatusToBackend(data.status) }
      : {}),
    ...(data.source !== undefined ? { sourceClause: data.source } : {}),
  }
}

export const scopeService = {
  /** Full requirement list for a project. The UI computes its stats badges
   *  and multi-field search/sort client-side, so we fetch the entire set. */
  async getRequirements(projectId: string): Promise<Requirement[]> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendRequirement>>
    >(endpoints.scope.list(projectId), { params: { limit: 100 } })
    return unwrapList(envelope).map(mapRequirement)
  },

  async getRequirement(projectId: string, id: string): Promise<Requirement | null> {
    try {
      const envelope = await apiClient.get<BackendEnvelope<BackendRequirement>>(
        endpoints.scope.detail(projectId, id),
      )
      return mapRequirement(unwrap(envelope))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async addRequirement(
    projectId: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    const envelope = await apiClient.post<BackendEnvelope<BackendRequirement>>(
      endpoints.scope.create(projectId),
      toCreateUpdatePayload(data),
    )
    return mapRequirement(unwrap(envelope))
  },

  async updateRequirement(
    projectId: string,
    id: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    const envelope = await apiClient.patch<BackendEnvelope<BackendRequirement>>(
      endpoints.scope.update(projectId, id),
      toCreateUpdatePayload(data),
    )
    return mapRequirement(unwrap(envelope))
  },

  async deleteRequirement(projectId: string, id: string): Promise<void> {
    await apiClient.delete<BackendEnvelope<null>>(endpoints.scope.delete(projectId, id))
  },
}
