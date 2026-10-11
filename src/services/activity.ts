/* ——————————————————————————————————————————————————
 * CommitCheck — Activity Service (Phase 12)
 *
 * Reads the backend's transactional audit trail:
 *   GET /projects/:projectId/activity
 *     ?page=&limit=&action=<ActivityAction>
 * (paginated with the established { items, page, limit,
 *  totalItems, totalPages } convention, newest-first).
 * The audit trail is written by the backend on every
 * mutation — nothing is recorded client-side.
 * —————————————————————————————————————————————————— */

import type { ActivityAction, ActivityItem } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  mapActivityItem,
  unwrap,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendActivityItem,
} from '@/services/api/adapters'

export interface ActivityQuery {
  page?: number
  limit?: number
  action?: ActivityAction
}

export const activityService = {
  /** One page of a project's audit trail, newest-first, with the
   *  optional server-side action filter. */
  async getPaginated(
    projectId: string,
    query: ActivityQuery = {},
  ): Promise<BackendPaginated<ActivityItem>> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendActivityItem>>
    >(endpoints.dashboard.activity(projectId), {
      params: {
        page: query.page,
        limit: query.limit,
        action: query.action,
      },
    })
    const page = unwrap(envelope)
    return { ...page, items: page.items.map(mapActivityItem) }
  },

  /** Convenience: the most recent entries (single request). */
  async getRecent(projectId: string, limit = 10): Promise<ActivityItem[]> {
    const page = await this.getPaginated(projectId, { page: 1, limit })
    return page.items
  },
}
