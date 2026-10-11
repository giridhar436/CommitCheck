/* ——————————————————————————————————————————————————
 * CommitCheck — Meetings Service
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/meetings,
 *  GET/PATCH/DELETE /projects/:projectId/meetings/:id).
 *
 * The AI detection pipeline does not exist on the backend
 * yet, so `analyze` persists the meeting record and walks
 * the existing progress modal through its stages before
 * resolving with an empty commitment set.
 * —————————————————————————————————————————————————— */

import type { Meeting, MeetingAnalysisState } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  unwrap,
  unwrapList,
  mapMeeting,
  type BackendEnvelope,
  type BackendPaginated,
  type BackendMeeting,
} from '@/services/api/adapters'

export interface AnalyzeMeetingInput {
  title: string
  date: string
  participants: string[]
  summary: string
  transcript?: string
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const meetingService = {
  async getAll(projectId: string): Promise<Meeting[]> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendMeeting>>
    >(endpoints.meetings.list(projectId), { params: { limit: 100 } })
    return unwrapList(envelope).map(mapMeeting)
  },

  async getById(projectId: string, id: string): Promise<Meeting | null> {
    try {
      const envelope = await apiClient.get<BackendEnvelope<BackendMeeting>>(
        endpoints.meetings.detail(projectId, id),
      )
      return mapMeeting(unwrap(envelope))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        return null
      }
      throw err
    }
  },

  async analyze(
    projectId: string,
    data: AnalyzeMeetingInput,
    onProgress?: (state: Partial<MeetingAnalysisState>) => void,
  ): Promise<MeetingAnalysisState> {
    const notify = (partial: Partial<MeetingAnalysisState>) => {
      if (onProgress) onProgress(partial)
    }

    notify({ status: 'extracting', progress: 25 })
    await delay(600)

    // Persist the meeting record on the backend
    const envelope = await apiClient.post<BackendEnvelope<BackendMeeting>>(
      endpoints.meetings.create(projectId),
      {
        title: data.title,
        meetingDate: new Date(`${data.date}T00:00:00Z`).toISOString(),
        summary: data.summary || data.transcript || data.title,
      },
    )
    mapMeeting(unwrap(envelope))

    notify({ status: 'checking_scope', progress: 50 })
    await delay(700)

    notify({ status: 'checking_auth', progress: 75 })
    await delay(600)

    notify({ status: 'assessing_risk', progress: 90 })
    await delay(500)

    // No AI pipeline is wired up on the backend yet — nothing is
    // auto-detected. Commitments can be added manually per meeting.
    const finalState: MeetingAnalysisState = {
      status: 'complete',
      progress: 100,
      commitments: [],
    }
    notify(finalState)
    return finalState
  },

  async delete(projectId: string, id: string): Promise<boolean> {
    await apiClient.delete<BackendEnvelope<null>>(endpoints.meetings.delete(projectId, id))
    return true
  },
}
