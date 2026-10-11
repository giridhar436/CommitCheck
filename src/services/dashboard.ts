/* ——————————————————————————————————————————————————
 * CommitCheck — Dashboard Service (Phase 12)
 *
 * Reads the read-only intelligence endpoints:
 *   GET /projects/:projectId/dashboard — aggregated counts
 *     (count/groupBy), attention items and recent activity
 *   GET /projects/:projectId/alerts    — deterministic,
 *     database-backed actionable alerts
 * No AI provider is involved in any of these numbers.
 * —————————————————————————————————————————————————— */

import type { AlertItem, DashboardData } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  mapAlertItem,
  mapDashboard,
  unwrap,
  type BackendAlertItem,
  type BackendDashboard,
  type BackendEnvelope,
} from '@/services/api/adapters'

export const dashboardService = {
  /** Aggregated project intelligence: summary counts, commitment/CR
   *  breakdowns, attention items and the recent audit trail. */
  async getOverview(projectId: string): Promise<DashboardData> {
    const envelope = await apiClient.get<BackendEnvelope<BackendDashboard>>(
      endpoints.dashboard.overview(projectId),
    )
    return mapDashboard(unwrap(envelope))
  },

  /** Actionable alerts (high-risk unauthorized commitments, open/clarified
   *  change requests, ambiguous verifications). Empty list = nothing to do. */
  async getAlerts(projectId: string): Promise<AlertItem[]> {
    const envelope = await apiClient.get<BackendEnvelope<BackendAlertItem[]>>(
      endpoints.dashboard.alerts(projectId),
    )
    return unwrap(envelope).map(mapAlertItem)
  },
}
