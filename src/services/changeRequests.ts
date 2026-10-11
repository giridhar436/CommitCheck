/* ——————————————————————————————————————————————————
 * CommitCheck — Change Requests Service (Phase 11)
 *
 * Talks to the live NestJS workflow:
 *  - POST /projects/:projectId/commitments/:commitmentId/change-request
 *    (generation — takes no body: every field is authored by the
 *     backend from the commitment + its Phase 10 verification)
 *  - GET  /projects/:projectId/change-requests (paginated list)
 *  - GET  /projects/:projectId/change-requests/:id (detail with context)
 *  - POST .../approve | .../reject | .../clarification
 *    (approval transactionally authorizes the linked commitment)
 * The backend only exposes nested routes, so flat lookups probe
 * each project — same strategy as the commitments service.
 * —————————————————————————————————————————————————— */

import type { ChangeRequest, ChangeRequestStatus } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { projectService } from '@/services/projects'
import {
  unwrap,
  unwrapList,
  mapChangeRequest,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendChangeRequest,
} from '@/services/api/adapters'

async function fetchProjectPage(projectId: string): Promise<ChangeRequest[]> {
  const envelope = await apiClient.get<
    BackendEnvelope<BackendPaginated<BackendChangeRequest>>
  >(endpoints.changeRequests.list(projectId), { params: { limit: 100 } })
  return unwrapList(envelope).map(mapChangeRequest)
}

export const changeRequestService = {
  /** Change requests for one project, or across all projects when no
   *  projectId is given (dashboard aggregates). */
  async getAll(projectId?: string): Promise<ChangeRequest[]> {
    if (projectId) return fetchProjectPage(projectId)

    const projects = await projectService.getAll()
    const pages = await Promise.all(projects.map((p) => fetchProjectPage(p.id)))
    return pages.flat()
  },

  /** Detail payload with the originating commitment + meeting context.
   *  The route is nested under the project, but the detail page routes
   *  by change request id alone — resolve the project by probing. */
  async getById(id: string, projectId?: string): Promise<ChangeRequest | null> {
    const detail = async (pid: string) =>
      mapChangeRequest(
        unwrap(
          await apiClient.get<BackendEnvelope<BackendChangeRequest>>(
            endpoints.changeRequests.detail(pid, id),
          ),
        ),
      )

    if (projectId) {
      try {
        return await detail(projectId)
      } catch {
        return null
      }
    }

    const projects = await projectService.getAll()
    const probes = await Promise.allSettled(projects.map((p) => detail(p.id)))
    const hit = probes.find((r) => r.status === 'fulfilled') as
      | PromiseFulfilledResult<ChangeRequest>
      | undefined
    return hit?.value ?? null
  },

  /** Generate a change request from a HIGH-risk, out-of-scope commitment.
   *  Sends no body — the backend derives every field from database state.
   *  409 means generation is unnecessary/ambiguous/duplicate; the ApiError
   *  message explains which. */
  async generate(projectId: string, commitmentId: string): Promise<ChangeRequest> {
    const envelope = await apiClient.post<BackendEnvelope<BackendChangeRequest>>(
      endpoints.changeRequests.generate(projectId, commitmentId),
      undefined,
    )
    return mapChangeRequest(unwrap(envelope))
  },

  /** Approve — the backend transactionally authorizes the linked
   *  commitment (AUTHORIZED + risk LOW) and writes the audit entry. */
  async approve(projectId: string, id: string, reason?: string): Promise<ChangeRequest> {
    const envelope = await apiClient.post<BackendEnvelope<BackendChangeRequest>>(
      endpoints.changeRequests.approve(projectId, id),
      reason ? { reason } : {},
    )
    return mapChangeRequest(unwrap(envelope))
  },

  /** Reject — the commitment stays unauthorized with its risk unchanged. */
  async reject(projectId: string, id: string, reason?: string): Promise<ChangeRequest> {
    const envelope = await apiClient.post<BackendEnvelope<BackendChangeRequest>>(
      endpoints.changeRequests.reject(projectId, id),
      reason ? { reason } : {},
    )
    return mapChangeRequest(unwrap(envelope))
  },

  /** Request clarification — requires a non-empty comment, which is
   *  appended to the existing thread (previous comments are kept). */
  async requestClarification(
    projectId: string,
    id: string,
    comment: string,
  ): Promise<ChangeRequest> {
    const envelope = await apiClient.post<BackendEnvelope<BackendChangeRequest>>(
      endpoints.changeRequests.clarification(projectId, id),
      { comment },
    )
    return mapChangeRequest(unwrap(envelope))
  },
}

/** True for statuses that still accept approve/reject/clarification. */
export function isOpenChangeRequestStatus(status: ChangeRequestStatus): boolean {
  return status === 'pending_approval' || status === 'clarification_requested'
}
