/* ——————————————————————————————————————————————————
 * CommitCheck — Commitment Evidence Service
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/commitments/:commitmentId/evidence,
 *  GET/DELETE .../evidence/:id). Evidence is immutable —
 * the backend intentionally exposes no PATCH.
 * —————————————————————————————————————————————————— */

import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  unwrap,
  unwrapList,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendEvidence,
} from '@/services/api/adapters'

export type EvidenceInput = {
  quote: string
  timestamp?: string
  source: 'transcript' | 'summary' | 'notes' | 'recording' | 'document' | 'other'
}

function toCreatePayload(data: EvidenceInput) {
  return {
    quote: data.quote,
    ...(data.timestamp !== undefined ? { timestamp: data.timestamp } : {}),
    ...(data.source !== undefined ? { source: data.source.toUpperCase() } : {}),
  }
}

export const evidenceService = {
  async getAll(projectId: string, commitmentId: string): Promise<BackendEvidence[]> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendEvidence>>
    >(endpoints.evidence.list(projectId, commitmentId), { params: { limit: 100 } })
    return unwrapList(envelope)
  },

  async getById(
    projectId: string,
    commitmentId: string,
    id: string,
  ): Promise<BackendEvidence | null> {
    try {
      const envelope = await apiClient.get<BackendEnvelope<BackendEvidence>>(
        endpoints.evidence.detail(projectId, commitmentId, id),
      )
      return unwrap(envelope)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async create(
    projectId: string,
    commitmentId: string,
    data: EvidenceInput,
  ): Promise<BackendEvidence> {
    const envelope = await apiClient.post<BackendEnvelope<BackendEvidence>>(
      endpoints.evidence.create(projectId, commitmentId),
      toCreatePayload(data),
    )
    return unwrap(envelope)
  },

  async delete(projectId: string, commitmentId: string, id: string): Promise<void> {
    await apiClient.delete<BackendEnvelope<null>>(
      endpoints.evidence.delete(projectId, commitmentId, id),
    )
  },
}
