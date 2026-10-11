/* ——————————————————————————————————————————————————
 * CommitCheck — Notifications Service
 *
 * ⚠️ LOCAL-ONLY: the backend has no Notifications module
 * yet. Until it ships, notifications run on an in-memory
 * store seeded below (mark-read state resets on refresh).
 * —————————————————————————————————————————————————— */

import type { Notification } from '@/types'

let notificationsStore: Notification[] = [
  {
    id: 'notif-1',
    type: 'high_risk',
    title: 'HIGH RISK Scope Creep Flagged',
    message: 'Google Login was promised to Acme Corp by Friday, but is not in approved SOW scope.',
    relatedId: 'comm-google-login',
    relatedType: 'commitment',
    read: false,
    timestamp: '2025-03-12T10:34:00Z',
  },
  {
    id: 'notif-2',
    type: 'unauthorized',
    title: 'Unauthorized Commitment Detected',
    message: 'EUR & GBP dynamic currency conversion was promised without recorded change order approval.',
    relatedId: 'comm-multi-currency',
    relatedType: 'commitment',
    read: false,
    timestamp: '2025-03-12T10:34:30Z',
  },
  {
    id: 'notif-3',
    type: 'approval_needed',
    title: 'Change Request CR-3B7F21 Awaiting Approval',
    message: 'CR-3B7F21 for Google OAuth Single Sign-On ($2,250 / 18h) submitted for client review.',
    relatedId: 'cr-google-login',
    relatedType: 'change_request',
    read: false,
    timestamp: '2025-03-12T10:36:00Z',
  },
  {
    id: 'notif-4',
    type: 'approved',
    title: 'Change Request CR-3B7F21 Approved',
    message: 'Marcus Vance (Client VP) signed and authorized Google OAuth integration into project baseline.',
    relatedId: 'cr-google-login',
    relatedType: 'change_request',
    read: true,
    timestamp: '2025-03-12T10:41:00Z',
  },
  {
    id: 'notif-5',
    type: 'rejected',
    title: 'Change Request Deflected (Rejected)',
    message: 'Multi-currency checkout request was rejected: Scope postponed to Phase 2 roadmap.',
    relatedId: 'proj-abc-ecommerce',
    relatedType: 'project',
    read: true,
    timestamp: '2025-03-10T14:15:00Z',
  },
  {
    id: 'notif-6',
    type: 'info',
    title: 'Meeting Analysis Complete',
    message: 'Sprint 3 Check-in Meeting analyzed: 2 commitments detected (1 High Risk, 1 Needs Review).',
    relatedId: 'meet-sync-march12',
    relatedType: 'project',
    read: true,
    timestamp: '2025-03-12T10:33:00Z',
  },
]

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    return [...notificationsStore]
  },

  async markRead(id: string): Promise<void> {
    const index = notificationsStore.findIndex((n) => n.id === id)
    if (index !== -1) {
      notificationsStore[index] = { ...notificationsStore[index], read: true }
    }
  },

  async markAllRead(): Promise<void> {
    notificationsStore = notificationsStore.map((n) => ({ ...n, read: true }))
  },
}
