/* ——————————————————————————————————————————————————
 * CommitCheck — Meetings Service
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/meetings,
 *  GET/PATCH/DELETE /projects/:projectId/meetings/:id,
 *  POST /projects/:projectId/meetings/:meetingId/analyze).
 *
 * `analyze` persists a new meeting record and walks the
 * existing progress modal through its stages before
 * resolving with an empty commitment set — no AI is run
 * on that path (a fresh meeting has no transcript
 * attachment yet). `triggerAnalysis` runs the Phase 8
 * backend pipeline on a saved meeting that has one.
 * —————————————————————————————————————————————————— */

import type { Meeting, MeetingAnalysisState, MeetingAnalysisStatus } from '@/types'
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

/** Result of the Phase 8 analysis pipeline (POST …/analyze). */
export interface TriggerAnalysisResult {
  meetingId: string
  projectId: string
  analysisStatus: MeetingAnalysisStatus
  commitmentsCreated: number
  evidenceCreated: number
}

interface BackendAnalysisResult {
  projectId: string
  meetingId: string
  analysisStatus: MeetingAnalysisStatus
  commitmentsCreated: number
  evidenceCreated: number
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

    // No analysis runs on this path — a freshly created meeting has no
    // transcript attachment yet. Commitments can be added manually per
    // meeting, or AI analysis is triggered from the meeting details drawer.
    const finalState: MeetingAnalysisState = {
      status: 'complete',
      progress: 100,
      commitments: [],
    }
    notify(finalState)
    return finalState
  },

  /** Runs the Phase 8 AI pipeline on a saved meeting (synchronous). */
  async triggerAnalysis(
    projectId: string,
    meetingId: string,
  ): Promise<TriggerAnalysisResult> {
    const envelope = await apiClient.post<BackendEnvelope<BackendAnalysisResult>>(
      endpoints.meetings.analyze(projectId, meetingId),
    )
    const data = unwrap(envelope)
    return {
      meetingId: data.meetingId,
      projectId: data.projectId,
      analysisStatus: data.analysisStatus,
      commitmentsCreated: data.commitmentsCreated,
      evidenceCreated: data.evidenceCreated,
    }
  },

  async delete(projectId: string, id: string): Promise<boolean> {
    await apiClient.delete<BackendEnvelope<null>>(endpoints.meetings.delete(projectId, id))
    return true
  },
}
