/* ——————————————————————————————————————————————————
 * CommitCheck — Change Requests Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { ChangeRequest, ChangeRequestStatus } from '@/types'
import { mockChangeRequests } from '@/mocks/data'
import { generateId } from '@/lib/utils'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let changeRequestsStore = [...mockChangeRequests]

const mockChangeRequestService = {
  async getAll(projectId?: string): Promise<ChangeRequest[]> {
    await delay(200)
    if (!projectId) return [...changeRequestsStore]
    return changeRequestsStore.filter((cr) => cr.projectId === projectId)
  },

  async getById(id: string): Promise<ChangeRequest | null> {
    await delay(150)
    return (
      changeRequestsStore.find(
        (cr) => cr.id === id || cr.changeRequestId === id,
      ) ?? null
    )
  },

  async create(data: Partial<ChangeRequest>): Promise<ChangeRequest> {
    await delay(300)
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
    await delay(250)
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

  reset(): void {
    changeRequestsStore = [...mockChangeRequests]
  },
}

// ——— Remote Implementation ———

const remoteChangeRequestService = {
  async getAll(projectId?: string): Promise<ChangeRequest[]> {
    if (projectId) {
      return apiClient.get<ChangeRequest[]>(endpoints.changeRequests.list(projectId))
    }
    return apiClient.get<ChangeRequest[]>('/change-requests')
  },

  async getById(id: string): Promise<ChangeRequest | null> {
    try {
      return await apiClient.get<ChangeRequest>(endpoints.changeRequests.detail(id))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async create(data: Partial<ChangeRequest>): Promise<ChangeRequest> {
    if (data.commitmentId) {
      return apiClient.post<ChangeRequest>(endpoints.changeRequests.create(data.commitmentId), data)
    }
    if (data.projectId) {
      return apiClient.post<ChangeRequest>(endpoints.changeRequests.list(data.projectId), data)
    }
    return apiClient.post<ChangeRequest>('/change-requests', data)
  },

  async updateStatus(
    id: string,
    status: ChangeRequestStatus,
    reason?: string,
  ): Promise<ChangeRequest> {
    if (status === 'approved') {
      return apiClient.post<ChangeRequest>(endpoints.changeRequests.approve(id))
    }
    if (status === 'rejected') {
      return apiClient.post<ChangeRequest>(endpoints.changeRequests.reject(id), { reason })
    }
    return apiClient.patch<ChangeRequest>(endpoints.changeRequests.update(id), {
      status,
      reason,
    })
  },
}

// ——— Exported Service (mode aware) ———

export const changeRequestService = {
  getAll: (projectId?: string) =>
    isMockMode() ? mockChangeRequestService.getAll(projectId) : remoteChangeRequestService.getAll(projectId),
  getById: (id: string) =>
    isMockMode() ? mockChangeRequestService.getById(id) : remoteChangeRequestService.getById(id),
  create: (data: Partial<ChangeRequest>) =>
    isMockMode() ? mockChangeRequestService.create(data) : remoteChangeRequestService.create(data),
  updateStatus: (id: string, status: ChangeRequestStatus, reason?: string) =>
    isMockMode()
      ? mockChangeRequestService.updateStatus(id, status, reason)
      : remoteChangeRequestService.updateStatus(id, status, reason),
  reset: () => mockChangeRequestService.reset(),
}
