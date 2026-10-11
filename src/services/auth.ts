/* ——————————————————————————————————————————————————
 * CommitCheck — Auth Service
 *
 * ⚠️ LOCAL-ONLY: the backend has no Auth module yet (no
 * /auth endpoints, no JWT issuing). Until it ships, login/
 * register run on an in-memory demo user.
 * —————————————————————————————————————————————————— */

import type { User } from '@/types'

const demoUser: User = {
  id: 'usr_1',
  email: 'rahul@pixelforge.io',
  name: 'Rahul Mehta',
  organization: 'PixelForge Studios',
  role: 'owner',
  createdAt: '2025-01-15T10:00:00Z',
}

export const authService = {
  async login(email: string, _password: string): Promise<{ user: User; token: string }> {
    return { user: { ...demoUser, email }, token: 'local-demo-token' }
  },

  async register(name: string, email: string, _password: string): Promise<{ user: User; token: string }> {
    return {
      user: { ...demoUser, name, email, createdAt: new Date().toISOString() },
      token: 'local-demo-token',
    }
  },

  async forgotPassword(_email: string): Promise<void> {},

  async getProfile(): Promise<User> {
    return demoUser
  },

  async logout(): Promise<void> {},
}
