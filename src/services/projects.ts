/* ——————————————————————————————————————————————————
 * CommitCheck — Projects Service
 *
 * Talks to the live NestJS backend
 * (GET/POST /projects, GET/PATCH/DELETE /projects/:id).
 * Responses are unwrapped from the backend envelope and
 * mapped onto frontend types via the adapter layer.
 * —————————————————————————————————————————————————— */

import type { Project } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  unwrap,
  unwrapList,
  mapProject,
  mapProjectStatusToBackend,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendProject,
} from '@/services/api/adapters'

/** The project payload does not break commitments down by authorization
 *  status, so the unauthorized count is read from a filtered commitments
 *  page (`totalItems`) — one cheap request per project. */
async function fetchUnauthorizedCount(projectId: string): Promise<number> {
  const envelope = await apiClient.get<BackendEnvelope<BackendPaginated<unknown>>>(
    endpoints.commitments.list(projectId),
    { params: { authorizationStatus: 'UNAUTHORIZED', limit: 1 } },
  )
  return envelope.data.totalItems
}

function toCreateUpdatePayload(data: Partial<Project>) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.client !== undefined ? { clientName: data.client } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.status !== undefined
      ? { status: mapProjectStatusToBackend(data.status) }
      : {}),
    ...(data.budget !== undefined
      ? { budget: Number(String(data.budget).replace(/[^\d.]/g, '')) || undefined }
      : {}),
    ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
    ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
  }
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendProject>>
    >(endpoints.projects.list, { params: { limit: 100 } })

    const projects = await Promise.all(
      unwrapList(envelope).map(async (dto) => {
        const project = mapProject(dto)
        project.unauthorizedCommitments = await fetchUnauthorizedCount(project.id)
        project.riskLevel = project.unauthorizedCommitments > 0
          ? 'high'
          : project.detectedCommitments > 0
            ? 'medium'
            : 'low'
        return project
      }),
    )
    return projects
  },

  async getById(id: string): Promise<Project | null> {
    try {
      const envelope = await apiClient.get<BackendEnvelope<BackendProject>>(
        endpoints.projects.detail(id),
      )
      const project = mapProject(unwrap(envelope))
      project.unauthorizedCommitments = await fetchUnauthorizedCount(project.id)
      project.riskLevel = project.unauthorizedCommitments > 0
        ? 'high'
        : project.detectedCommitments > 0
          ? 'medium'
          : 'low'
      return project
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async create(data: Partial<Project>): Promise<Project> {
    const envelope = await apiClient.post<BackendEnvelope<BackendProject>>(
      endpoints.projects.create,
      toCreateUpdatePayload(data),
    )
    const project = mapProject(unwrap(envelope))
    project.unauthorizedCommitments = 0
    project.riskLevel = 'low'
    return project
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const envelope = await apiClient.patch<BackendEnvelope<BackendProject>>(
      endpoints.projects.update(id),
      toCreateUpdatePayload(data),
    )
    return mapProject(unwrap(envelope))
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<BackendEnvelope<null>>(endpoints.projects.delete(id))
  },
}
