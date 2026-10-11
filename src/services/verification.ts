/* ——————————————————————————————————————————————————
 * CommitCheck — Scope Verification Service (Phase 10)
 *
 * Talks to the live NestJS backend trigger
 * (POST /projects/:projectId/commitments/:commitmentId/verify).
 * The verdict is computed deterministically on the backend from
 * database state (approved scope + APPROVED change requests) —
 * the frontend only displays it.
 * —————————————————————————————————————————————————— */

import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import { unwrap, type BackendEnvelope } from '@/services/api/adapters'
import type { VerificationResult } from '@/types'

/** Raw verification payload as returned by the backend envelope. */
export type BackendVerification = VerificationResult

export const verificationService = {
  async verify(projectId: string, commitmentId: string): Promise<VerificationResult> {
    const envelope = await apiClient.post<BackendEnvelope<BackendVerification>>(
      endpoints.commitments.verify(projectId, commitmentId),
      {},
    )
    return unwrap(envelope)
  },
}
