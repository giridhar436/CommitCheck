/* ——————————————————————————————————————————————————
 * CommitCheck — Change Requests Service
 *
 * ⚠️ LOCAL-ONLY: the backend has no Change Requests module
 * yet (the Prisma model exists but no controller/service).
 * Until that module ships, change requests run on an
 * in-memory store seeded below. Replace with real API
 * calls once /projects/:projectId/change-requests exists.
 * —————————————————————————————————————————————————— */

import type { ChangeRequest, ChangeRequestStatus } from '@/types'
import { generateId } from '@/lib/utils'

let changeRequestsStore: ChangeRequest[] = [
  {
    id: 'cr-google-login',
    changeRequestId: 'CR-3B7F21',
    projectId: 'proj-abc-ecommerce',
    commitmentId: 'comm-google-login',
    title: 'Google OAuth Single Sign-On Integration',
    feature: 'Google OAuth 2.0 Login & Account Linking',
    source: 'Sprint 3 Check-in Meeting (March 12, 2025)',
    committedBy: 'Rahul Mehta',
    promisedDeadline: 'Friday, March 14',
    originalScope:
      'SOW Section 3.1 covers Email and Password authentication only. Third-party federated identity providers were excluded from Phase 1.',
    estimatedEffort: '18 hours (2.5 engineering days)',
    impact:
      'Requires Google Cloud Console OAuth consent screen verification, Passport.js/OAuth strategy integration, database user schema migration to store federated sub IDs, and checkout login modal UI changes.',
    status: 'pending_approval',
    createdAt: '2025-03-12T10:35:00Z',
    updatedAt: '2025-03-12T10:35:00Z',
  },
]

export const changeRequestService = {
  async getAll(projectId?: string): Promise<ChangeRequest[]> {
    if (!projectId) return [...changeRequestsStore]
    return changeRequestsStore.filter((cr) => cr.projectId === projectId)
  },

  async getById(id: string): Promise<ChangeRequest | null> {
    return (
      changeRequestsStore.find(
        (cr) => cr.id === id || cr.changeRequestId === id,
      ) ?? null
    )
  },

  async create(data: Partial<ChangeRequest>): Promise<ChangeRequest> {
    const newCr: ChangeRequest = {
      id: `cr-${Date.now()}`,
      changeRequestId: generateId('CR'),
      projectId: data.projectId ?? '',
      commitmentId: data.commitmentId ?? '',
      title: data.title ?? 'Untitled Change Request',
      feature: data.feature ?? '',
      source: data.source ?? '',
      committedBy: data.committedBy ?? '',
      promisedDeadline: data.promisedDeadline,
      originalScope: data.originalScope ?? '',
      estimatedEffort: data.estimatedEffort,
      impact: data.impact ?? '',
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }
    changeRequestsStore.unshift(newCr)
    return newCr
  },

  async updateStatus(
    id: string,
    status: ChangeRequestStatus,
    reason?: string,
  ): Promise<ChangeRequest> {
    const index = changeRequestsStore.findIndex(
      (cr) => cr.id === id || cr.changeRequestId === id,
    )
    if (index === -1) throw new Error('Change request not found')

    const current = changeRequestsStore[index]
    const updated: ChangeRequest = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'approved'
        ? {
            approvedBy: 'Marcus Vance (Client VP)',
            approvedAt: new Date().toISOString(),
          }
        : {}),
      ...(status === 'rejected'
        ? {
            rejectedBy: 'Marcus Vance (Client VP)',
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason ?? 'Scope postponed to Phase 2',
          }
        : {}),
    }

    changeRequestsStore[index] = updated
    return updated
  },
}
