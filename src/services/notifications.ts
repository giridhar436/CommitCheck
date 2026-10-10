/* ——————————————————————————————————————————————————
 * CommitCheck — Notifications Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { Notification } from '@/types'
import { mockNotifications } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let notificationsStore = [...mockNotifications]

const mockNotificationService = {
  async getAll(): Promise<Notification[]> {
    await delay(150)
    return [...notificationsStore]
  },

  async markRead(id: string): Promise<void> {
    await delay(100)
    const index = notificationsStore.findIndex((n) => n.id === id)
    if (index !== -1) {
      notificationsStore[index] = { ...notificationsStore[index], read: true }
    }
  },

  async markAllRead(): Promise<void> {
    await delay(150)
    notificationsStore = notificationsStore.map((n) => ({ ...n, read: true }))
  },
}

// ——— Remote Implementation ———

const remoteNotificationService = {
  async getAll(): Promise<Notification[]> {
    return apiClient.get<Notification[]>(endpoints.notifications.list)
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch<void>(endpoints.notifications.markRead(id))
  },

  async markAllRead(): Promise<void> {
    await apiClient.post<void>(endpoints.notifications.markAllRead)
  },
}

// ——— Exported Service (mode aware) ———

export const notificationService = {
  getAll: () =>
    isMockMode()
      ? mockNotificationService.getAll()
      : remoteNotificationService.getAll(),
  markRead: (id: string) =>
    isMockMode()
      ? mockNotificationService.markRead(id)
      : remoteNotificationService.markRead(id),
  markAllRead: () =>
    isMockMode()
      ? mockNotificationService.markAllRead()
      : remoteNotificationService.markAllRead(),
}
