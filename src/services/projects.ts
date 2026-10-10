/* ——————————————————————————————————————————————————
 * CommitCheck — Projects Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { Project } from '@/types'
import { mockProjects } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let projectsStore = [...mockProjects]

const mockProjectService = {
  async getAll(): Promise<Project[]> {
    await delay(200)
    return [...projectsStore]
  },

  async getById(id: string): Promise<Project | null> {
    await delay(150)
    return projectsStore.find((p) => p.id === id) ?? null
  },

  async create(data: Partial<Project>): Promise<Project> {
    await delay(300)
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: data.name ?? 'Untitled Project',
      client: data.client ?? 'Unknown Client',
      description: data.description ?? '',
      status: data.status ?? 'active',
      startDate: data.startDate ?? new Date().toISOString().split('T')[0],
      approvedRequirements: 0,
      detectedCommitments: 0,
      unauthorizedCommitments: 0,
      pendingChangeRequests: 0,
      riskLevel: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }
    projectsStore.unshift(newProject)
    return newProject
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    await delay(200)
    const index = projectsStore.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Project not found')
    projectsStore[index] = {
      ...projectsStore[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return projectsStore[index]
  },

  async delete(id: string): Promise<void> {
    await delay(200)
    projectsStore = projectsStore.filter((p) => p.id !== id)
  },
}

// ——— Remote Implementation ———

const remoteProjectService = {
  async getAll(): Promise<Project[]> {
    return apiClient.get<Project[]>(endpoints.projects.list)
  },

  async getById(id: string): Promise<Project | null> {
    try {
      return await apiClient.get<Project>(endpoints.projects.detail(id))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async create(data: Partial<Project>): Promise<Project> {
    return apiClient.post<Project>(endpoints.projects.create, data)
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return apiClient.patch<Project>(endpoints.projects.update(id), data)
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(endpoints.projects.delete(id))
  },
}

// ——— Exported Service (mode aware) ———

export const projectService = {
  getAll: () => (isMockMode() ? mockProjectService.getAll() : remoteProjectService.getAll()),
  getById: (id: string) => (isMockMode() ? mockProjectService.getById(id) : remoteProjectService.getById(id)),
  create: (data: Partial<Project>) => (isMockMode() ? mockProjectService.create(data) : remoteProjectService.create(data)),
  update: (id: string, data: Partial<Project>) => (isMockMode() ? mockProjectService.update(id, data) : remoteProjectService.update(id, data)),
  delete: (id: string) => (isMockMode() ? mockProjectService.delete(id) : remoteProjectService.delete(id)),
}
