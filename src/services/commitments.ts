/* ——————————————————————————————————————————————————
 * CommitCheck — Commitments Service
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST/PATCH/DELETE /projects/:projectId/commitments).
 * The backend has no flat commitments surface, so calls
 * without a projectId fan out across the user's projects.
 * List/detail payloads carry no evidence rows, so the
 * first verbatim evidence quote is fetched per commitment
 * from the evidence endpoints.
 * —————————————————————————————————————————————————— */

import type { Commitment, CommitmentStatus } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { evidenceService } from '@/services/evidence'
import { projectService } from '@/services/projects'
import {
  unwrap,
  unwrapList,
  mapCommitment,
  mapCommitmentDetail,
  mapCommitmentStatusToBackend,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendCommitment,
} from '@/services/api/adapters'

/** Fill in the first verbatim evidence quote for each commitment. */
async function withEvidenceQuotes(commitments: Commitment[]): Promise<Commitment[]> {
  return Promise.all(
    commitments.map(async (comm) => {
      try {
        const evidence = await evidenceService.getAll(comm.projectId, comm.id)
        return { ...comm, evidence: evidence[0]?.quote ?? '' }
      } catch {
        // Evidence display is cosmetic; never fail the list over it
        return comm
      }
    }),
  )
}

async function fetchProjectPage(projectId: string): Promise<Commitment[]> {
  const envelope = await apiClient.get<
    BackendEnvelope<BackendPaginated<BackendCommitment>>
  >(endpoints.commitments.list(projectId), { params: { limit: 100 } })
  return unwrapList(envelope).map(mapCommitment)
}

export const commitmentService = {
  /** Commitments for one project (evidence-enriched), or across all
   *  projects when no projectId is given (dashboard aggregates). */
  async getAll(projectId?: string): Promise<Commitment[]> {
    if (projectId) {
      return withEvidenceQuotes(await fetchProjectPage(projectId))
    }

    const projects = await projectService.getAll()
    const pages = await Promise.all(projects.map((p) => fetchProjectPage(p.id)))
    return pages.flat()
  },

  /** The backend only exposes commitments nested under their project, but
   *  the detail page routes by commitment id alone — resolve the project
   *  by probing each project's commitments. */
  async getById(id: string): Promise<Commitment | null> {
    const projects = await projectService.getAll()

    const probes = await Promise.allSettled(
      projects.map(async (p) => {
        const envelope = await apiClient.get<BackendEnvelope<BackendCommitment>>(
          endpoints.commitments.detail(p.id, id),
        )
        return unwrap(envelope)
      }),
    )
    const hit = probes.find(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<BackendCommitment> | undefined
    if (!hit) return null

    const detail = hit.value
    const evidence = await evidenceService.getAll(detail.projectId, detail.id).catch(() => [])
    return mapCommitmentDetail(detail, evidence)
  },

  async updateStatus(
    projectId: string,
    id: string,
    status: CommitmentStatus,
  ): Promise<Commitment> {
    const envelope = await apiClient.patch<BackendEnvelope<BackendCommitment>>(
      endpoints.commitments.update(projectId, id),
      { authorizationStatus: mapCommitmentStatusToBackend(status) },
    )
    return mapCommitment(unwrap(envelope))
  },
}
