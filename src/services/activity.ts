/* ——————————————————————————————————————————————————
 * CommitCheck — Activity Service
 *
 * ⚠️ LOCAL-ONLY: the backend writes an Activity audit trail
 * transactionally on every mutation but does not expose a
 * GET /activity endpoint yet. Until it does, the timeline
 * reads from an in-memory store seeded below.
 * —————————————————————————————————————————————————— */

import type { ActivityItem } from '@/types'

let activityStore: ActivityItem[] = [
  {
    id: 'act-1',
    projectId: 'proj-abc-ecommerce',
    type: 'meeting_analyzed',
    title: 'Sprint 3 Check-in Meeting analyzed',
    description: 'Meeting summary and transcript ingested. AI commitment extraction initiated.',
    relatedId: 'meet-sync-march12',
    relatedType: 'meeting',
    timestamp: '2025-03-12T10:32:00Z',
    actor: 'Rahul Mehta',
  },
  {
    id: 'act-2',
    projectId: 'proj-abc-ecommerce',
    type: 'commitment_detected',
    title: '2 commitments detected',
    description: 'Extracted Google OAuth login commitment and multi-currency pricing commitment from transcript.',
    relatedId: 'comm-google-login',
    relatedType: 'commitment',
    timestamp: '2025-03-12T10:33:00Z',
    actor: 'CommitCheck Engine',
  },
  {
    id: 'act-3',
    projectId: 'proj-abc-ecommerce',
    type: 'commitment_flagged',
    title: 'Google Login flagged as HIGH RISK scope creep',
    description: 'Commitment not found in approved SOW Section 3.1. Marked as unauthorized work.',
    relatedId: 'comm-google-login',
    relatedType: 'commitment',
    timestamp: '2025-03-12T10:33:30Z',
    actor: 'CommitCheck Engine',
  },
  {
    id: 'act-4',
    projectId: 'proj-abc-ecommerce',
    type: 'change_request_created',
    title: 'Change Request CR-3B7F21 created',
    description: 'Structured change request generated for Google OAuth integration ($2,250 / 18h).',
    relatedId: 'cr-google-login',
    relatedType: 'change_request',
    timestamp: '2025-03-12T10:35:00Z',
    actor: 'Rahul Mehta',
  },
  {
    id: 'act-5',
    projectId: 'proj-abc-ecommerce',
    type: 'change_request_approved',
    title: 'Change Request CR-3B7F21 approved',
    description: 'Marcus Vance (Client VP) authorized $2,250 budget addendum into approved baseline.',
    relatedId: 'cr-google-login',
    relatedType: 'change_request',
    timestamp: '2025-03-12T10:41:00Z',
    actor: 'Marcus Vance (Client VP)',
  },
]

export const activityService = {
  async getAll(projectId?: string): Promise<ActivityItem[]> {
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
