/* ——————————————————————————————————————————————————
 * CommitCheck — Auth Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { User } from '@/types'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

const mockAuth = {
  async login(email: string, _password: string): Promise<{ user: User; token: string }> {
    await delay(800)
    const user: User = {
      id: 'usr_1',
      email,
      name: 'Rahul Mehta',
      organization: 'PixelForge Studios',
      role: 'owner',
      createdAt: '2025-01-15T10:00:00Z',
    }
    return { user, token: 'mock-jwt-token' }
  },

  async register(name: string, email: string, _password: string): Promise<{ user: User; token: string }> {
    await delay(800)
    const user: User = {
      id: 'usr_1',
      email,
      name,
      role: 'owner',
      createdAt: new Date().toISOString(),
    }
    return { user, token: 'mock-jwt-token' }
  },

  async forgotPassword(_email: string): Promise<void> {
    await delay(600)
  },

  async getProfile(): Promise<User> {
    await delay(300)
    return {
      id: 'usr_1',
      email: 'rahul@pixelforge.io',
      name: 'Rahul Mehta',
      organization: 'PixelForge Studios',
      role: 'owner',
      createdAt: '2025-01-15T10:00:00Z',
    }
  },

  async logout(): Promise<void> {
    await delay(200)
  },
}

// ——— Remote Implementation ———

const remoteAuth = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return apiClient.post<{ user: User; token: string }>(endpoints.auth.login, {
      email,
      password,
    })
  },

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    return apiClient.post<{ user: User; token: string }>(endpoints.auth.signup, {
      name,
      email,
      password,
    })
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(endpoints.auth.forgotPassword, { email })
  },

  async getProfile(): Promise<User> {
    return apiClient.get<User>(endpoints.auth.profile)
  },

  async logout(): Promise<void> {
    await apiClient.post(endpoints.auth.logout)
  },
}

// ——— Exported Service (auto-selects mode) ———

export const authService = isMockMode() ? mockAuth : remoteAuth
