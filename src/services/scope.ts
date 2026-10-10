/* ——————————————————————————————————————————————————
 * CommitCheck — Scope / Requirements Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { Requirement } from '@/types'
import { mockRequirements } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let requirementsStore = [...mockRequirements]

const mockScopeService = {
  async getRequirements(projectId: string): Promise<Requirement[]> {
    await delay(200)
    return requirementsStore.filter((r) => r.projectId === projectId)
  },

  async addRequirement(
    projectId: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    await delay(300)
    const newReq: Requirement = {
      id: `req-${Date.now()}`,
      projectId,
      name: data.name ?? 'New Requirement',
      description: data.description ?? '',
      category: data.category ?? 'General',
      priority: data.priority ?? 'medium',
      status: data.status ?? 'approved',
      source: data.source ?? 'Manual Entry',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }
    requirementsStore.push(newReq)
    return newReq
  },

  async updateRequirement(
    id: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    await delay(200)
    const index = requirementsStore.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Requirement not found')
    requirementsStore[index] = {
      ...requirementsStore[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return requirementsStore[index]
  },

  async deleteRequirement(id: string): Promise<void> {
    await delay(200)
    requirementsStore = requirementsStore.filter((r) => r.id !== id)
  },

  reset(): void {
    requirementsStore = [...mockRequirements]
  },
}

// ——— Remote Implementation ———

const remoteScopeService = {
  async getRequirements(projectId: string): Promise<Requirement[]> {
    return apiClient.get<Requirement[]>(endpoints.scope.list(projectId))
  },

  async addRequirement(
    projectId: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    return apiClient.post<Requirement>(endpoints.scope.create(projectId), data)
  },

  async updateRequirement(
    id: string,
    data: Partial<Requirement>,
  ): Promise<Requirement> {
    return apiClient.patch<Requirement>(endpoints.scope.update(id), data)
  },

  async deleteRequirement(id: string): Promise<void> {
    return apiClient.delete<void>(endpoints.scope.delete(id))
  },
}

// ——— Exported Service (mode aware) ———

export const scopeService = {
  getRequirements: (projectId: string) =>
    isMockMode()
      ? mockScopeService.getRequirements(projectId)
      : remoteScopeService.getRequirements(projectId),
  addRequirement: (projectId: string, data: Partial<Requirement>) =>
    isMockMode()
      ? mockScopeService.addRequirement(projectId, data)
      : remoteScopeService.addRequirement(projectId, data),
  updateRequirement: (id: string, data: Partial<Requirement>) =>
    isMockMode()
      ? mockScopeService.updateRequirement(id, data)
      : remoteScopeService.updateRequirement(id, data),
  deleteRequirement: (id: string) =>
    isMockMode()
      ? mockScopeService.deleteRequirement(id)
      : remoteScopeService.deleteRequirement(id),
  reset: () => mockScopeService.reset(),
}
