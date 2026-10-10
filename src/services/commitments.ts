/* ——————————————————————————————————————————————————
 * CommitCheck — Commitments Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { Commitment, CommitmentStatus } from '@/types'
import { mockCommitments } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let commitmentsStore = [...mockCommitments]

const mockCommitmentService = {
  async getAll(projectId?: string): Promise<Commitment[]> {
    await delay(200)
    if (!projectId) return [...commitmentsStore]
    return commitmentsStore.filter((c) => c.projectId === projectId)
  },

  async getById(id: string): Promise<Commitment | null> {
    await delay(150)
    return commitmentsStore.find((c) => c.id === id || c.commitmentId === id) ?? null
  },

  async updateStatus(id: string, status: CommitmentStatus): Promise<Commitment> {
    await delay(200)
    const index = commitmentsStore.findIndex((c) => c.id === id || c.commitmentId === id)
    if (index === -1) throw new Error('Commitment not found')
    commitmentsStore[index] = {
      ...commitmentsStore[index],
      status,
      authorization: status === 'authorized' ? 'authorized' : commitmentsStore[index].authorization,
      updatedAt: new Date().toISOString(),
    }
    return commitmentsStore[index]
  },

  async addCommitments(newCommitments: Commitment[]): Promise<void> {
    await delay(100)
    commitmentsStore = [...newCommitments, ...commitmentsStore]
  },

  async linkChangeRequest(id: string, changeRequestId: string): Promise<Commitment> {
    await delay(150)
    const index = commitmentsStore.findIndex((c) => c.id === id || c.commitmentId === id)
    if (index === -1) throw new Error('Commitment not found')
    commitmentsStore[index] = {
      ...commitmentsStore[index],
      status: 'change_request_created',
      changeRequestId,
      updatedAt: new Date().toISOString(),
    }
    return commitmentsStore[index]
  },

  reset(): void {
    commitmentsStore = [...mockCommitments]
  },
}

// ——— Remote Implementation ———

const remoteCommitmentService = {
  async getAll(projectId?: string): Promise<Commitment[]> {
    if (projectId) {
      return apiClient.get<Commitment[]>(endpoints.commitments.list(projectId))
    }
    return apiClient.get<Commitment[]>('/commitments')
  },

  async getById(id: string): Promise<Commitment | null> {
    try {
      return await apiClient.get<Commitment>(endpoints.commitments.detail(id))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async updateStatus(id: string, status: CommitmentStatus): Promise<Commitment> {
    return apiClient.patch<Commitment>(endpoints.commitments.update(id), {
      status,
      ...(status === 'authorized' ? { authorization: 'authorized' } : {}),
    })
  },

  async addCommitments(newCommitments: Commitment[]): Promise<void> {
    await apiClient.post<void>('/commitments/batch', { commitments: newCommitments })
  },

  async linkChangeRequest(id: string, changeRequestId: string): Promise<Commitment> {
    return apiClient.patch<Commitment>(endpoints.commitments.update(id), {
      status: 'change_request_created',
      changeRequestId,
    })
  },
}

// ——— Exported Service (mode aware) ———

export const commitmentService = {
  getAll: (projectId?: string) =>
    isMockMode() ? mockCommitmentService.getAll(projectId) : remoteCommitmentService.getAll(projectId),
  getById: (id: string) =>
    isMockMode() ? mockCommitmentService.getById(id) : remoteCommitmentService.getById(id),
  updateStatus: (id: string, status: CommitmentStatus) =>
    isMockMode() ? mockCommitmentService.updateStatus(id, status) : remoteCommitmentService.updateStatus(id, status),
  addCommitments: (newCommitments: Commitment[]) =>
    isMockMode() ? mockCommitmentService.addCommitments(newCommitments) : remoteCommitmentService.addCommitments(newCommitments),
  linkChangeRequest: (id: string, changeRequestId: string) =>
    isMockMode()
      ? mockCommitmentService.linkChangeRequest(id, changeRequestId)
      : remoteCommitmentService.linkChangeRequest(id, changeRequestId),
  reset: () => mockCommitmentService.reset(),
}
