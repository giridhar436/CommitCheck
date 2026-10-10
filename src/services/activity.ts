/* ——————————————————————————————————————————————————
 * CommitCheck — Activity Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { ActivityItem } from '@/types'
import { mockActivity } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let activityStore = [...mockActivity]

const mockActivityService = {
  async getAll(projectId?: string): Promise<ActivityItem[]> {
    await delay(150)
    if (!projectId) return [...activityStore]
    return activityStore.filter((a) => a.projectId === projectId)
  },

  async record(
    item: Omit<ActivityItem, 'id' | 'timestamp'>,
  ): Promise<ActivityItem> {
    const newItem: ActivityItem = {
      ...item,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }
    activityStore.unshift(newItem)
    return newItem
  },
}

// ——— Remote Implementation ———

const remoteActivityService = {
  async getAll(projectId?: string): Promise<ActivityItem[]> {
    if (projectId) {
      return apiClient.get<ActivityItem[]>(endpoints.activity.list(projectId))
    }
    return apiClient.get<ActivityItem[]>('/activity')
  },

  async record(
    item: Omit<ActivityItem, 'id' | 'timestamp'>,
  ): Promise<ActivityItem> {
    const projectId = item.projectId || 'general'
    return apiClient.post<ActivityItem>(
      endpoints.activity.record(projectId),
      item,
    )
  },
}

// ——— Exported Service (mode aware) ———

export const activityService = {
  getAll: (projectId?: string) =>
    isMockMode()
      ? mockActivityService.getAll(projectId)
      : remoteActivityService.getAll(projectId),
  record: (item: Omit<ActivityItem, 'id' | 'timestamp'>) =>
    isMockMode()
      ? mockActivityService.record(item)
      : remoteActivityService.record(item),
}
