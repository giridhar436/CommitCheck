/* ——————————————————————————————————————————————————
 * CommitCheck — Meetings Service
 *
 * Dual-mode service: mock store + simulated AI
 * pipeline for demo, real NestJS + OpenAI/LangChain
 * backend when VITE_API_MODE=remote.
 * —————————————————————————————————————————————————— */

import type { Meeting, MeetingAnalysisState, Commitment } from '@/types'
import { mockMeetings } from '@/mocks/data'
import { generateId } from '@/lib/utils'
import { commitmentService } from '@/services/commitments'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let meetingsStore = [...mockMeetings]

const mockMeetingService = {
  async getAll(projectId: string): Promise<Meeting[]> {
    await delay(200)
    return meetingsStore.filter((m) => m.projectId === projectId)
  },

  async getById(id: string): Promise<Meeting | null> {
    await delay(150)
    return meetingsStore.find((m) => m.id === id) ?? null
  },

  async analyze(
    projectId: string,
    data: {
      title: string
      date: string
      participants: string[]
      summary: string
      transcript?: string
    },
    onProgress?: (state: Partial<MeetingAnalysisState>) => void,
  ): Promise<MeetingAnalysisState> {
    const notify = (partial: Partial<MeetingAnalysisState>) => {
      if (onProgress) onProgress(partial)
    }

    // Step 1: Extracting commitments
    notify({ status: 'extracting', progress: 25 })
    await delay(600)

    // Step 2: Checking approved scope
    notify({ status: 'checking_scope', progress: 50 })
    await delay(700)

    // Step 3: Checking authorization
    notify({ status: 'checking_auth', progress: 75 })
    await delay(600)

    // Step 4: Assessing risk
    notify({ status: 'assessing_risk', progress: 90 })
    await delay(500)

    // Result commitment detection based on text
    const textToAnalyze = `${data.summary} ${data.transcript ?? ''}`.toLowerCase()
    const detectedCommitments: Commitment[] = []
    const meetingId = `meet-${Date.now()}`

    if (
      textToAnalyze.includes('google') ||
      textToAnalyze.includes('login') ||
      textToAnalyze.includes('sprint 3')
    ) {
      // Benchmark Hackathon Case: 3 commitments (1 Unauthorized, 1 Authorized, 1 Needs Review)
      detectedCommitments.push(
        {
          id: `comm-${Date.now()}-1`,
          commitmentId: generateId('CC'),
          projectId,
          meetingId,
          commitment: 'Add Google OAuth Login by Friday',
          committedBy:
            data.participants.find(
              (p) => p.includes('Rahul') || p.includes('Tech'),
            ) ?? 'Rahul Mehta (Tech Lead)',
          deadline: 'Friday',
          evidence:
            '"Sure, I\'ll add it by Friday. It shouldn\'t take more than a couple of days to wire up the OAuth callbacks."',
          scopeMatch: 'not_found',
          matchedRequirement: undefined,
          authorization: 'unauthorized',
          riskLevel: 'high',
          status: 'needs_review',
          aiExplanation:
            'Google OAuth Login was promised during the checkout review, but the approved SOW Section 3.1 strictly authorizes Email & Password authentication. No signed change order or budget extension was located. HIGH RISK of unauthorized scope creep.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `comm-${Date.now()}-2`,
          commitmentId: generateId('CC'),
          projectId,
          meetingId,
          commitment:
            'Support Apple Pay & Google Pay via Stripe PaymentElement',
          committedBy: 'Rahul Mehta (Tech Lead)',
          deadline: 'Sprint 3 Close',
          evidence:
            '"Yes, that is already supported by the Stripe PaymentElement as part of the approved Payment Gateway requirement."',
          scopeMatch: 'matched',
          matchedRequirement: 'Payment Gateway Integration (Stripe)',
          authorization: 'authorized',
          riskLevel: 'low',
          status: 'authorized',
          aiExplanation:
            'Covered under approved SOW requirement "Payment Gateway (REQ-PAY-01)". Stripe PaymentElement automatically encapsulates digital wallet options at zero additional scope cost.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `comm-${Date.now()}-3`,
          commitmentId: generateId('CC'),
          projectId,
          meetingId,
          commitment:
            'Staging deployment with checkout preview by Thursday evening',
          committedBy: 'Sarah Chen (Acme PM)',
          deadline: 'Thursday 6:00 PM',
          evidence:
            '"Let\'s make sure it\'s on staging by Thursday evening if possible."',
          scopeMatch: 'partial',
          matchedRequirement: 'CI/CD Pipeline & Staging Environment',
          authorization: 'pending',
          riskLevel: 'medium',
          status: 'needs_review',
          aiExplanation:
            'Deployment timeline accelerated by 24 hours ahead of standard Friday sprint release cycle. Requires verification of QA regression test coverage before sign-off.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      )
    } else {
      // General input detection
      detectedCommitments.push({
        id: `comm-${Date.now()}-1`,
        commitmentId: generateId('CC'),
        projectId,
        meetingId,
        commitment: data.title
          ? `Deliver action items from ${data.title}`
          : 'Deliver agreed sprint deliverables',
        committedBy: data.participants[0] || 'Team Lead',
        deadline: 'Upcoming Milestone',
        evidence: `"${data.summary.slice(0, 120)}..."`,
        scopeMatch: 'not_found',
        authorization: 'unauthorized',
        riskLevel: 'high',
        status: 'needs_review',
        aiExplanation:
          'Commitment extracted from meeting summary requires confirmation against active SOW specifications to confirm authorization boundaries.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Persist meeting in memory store
    const newMeeting: Meeting = {
      id: meetingId,
      projectId,
      title: data.title,
      date: data.date,
      participants: data.participants,
      summary: data.summary,
      transcript: data.transcript,
      commitmentsDetected: detectedCommitments.length,
      analyzedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    meetingsStore.unshift(newMeeting)

    // Save detected commitments to commitmentService
    await commitmentService.addCommitments(detectedCommitments)

    const finalState: MeetingAnalysisState = {
      status: 'complete',
      progress: 100,
      commitments: detectedCommitments,
    }
    notify(finalState)
    return finalState
  },

  async delete(id: string): Promise<boolean> {
    await delay(150)
    const initialLength = meetingsStore.length
    meetingsStore = meetingsStore.filter((m) => m.id !== id)
    return meetingsStore.length < initialLength
  },
}

// ——— Remote Implementation ———

const remoteMeetingService = {
  async getAll(projectId: string): Promise<Meeting[]> {
    return apiClient.get<Meeting[]>(endpoints.meetings.list(projectId))
  },

  async getById(id: string): Promise<Meeting | null> {
    try {
      return await apiClient.get<Meeting>(endpoints.meetings.detail(id))
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 404
      ) {
        return null
      }
      throw err
    }
  },

  async analyze(
    projectId: string,
    data: {
      title: string
      date: string
      participants: string[]
      summary: string
      transcript?: string
    },
    onProgress?: (state: Partial<MeetingAnalysisState>) => void,
  ): Promise<MeetingAnalysisState> {
    const notify = (partial: Partial<MeetingAnalysisState>) => {
      if (onProgress) onProgress(partial)
    }

    notify({ status: 'extracting', progress: 25 })

    // Step 1: Create conversation resource on NestJS backend
    const meeting = await apiClient.post<Meeting>(
      endpoints.meetings.create(projectId),
      data,
    )

    notify({ status: 'checking_scope', progress: 50 })
    await delay(300)

    notify({ status: 'checking_auth', progress: 75 })
    await delay(300)

    notify({ status: 'assessing_risk', progress: 90 })

    // Step 2: Trigger AI analysis on the created conversation
    const result = await apiClient.post<MeetingAnalysisState>(
      endpoints.meetings.analyze(meeting.id),
    )

    const finalState: MeetingAnalysisState = {
      status: 'complete',
      progress: 100,
      commitments: result.commitments ?? [],
    }
    notify(finalState)
    return finalState
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete<void>(endpoints.meetings.delete(id))
    return true
  },
}

// ——— Exported Service (mode aware) ———

export const meetingService = {
  getAll: (projectId: string) =>
    isMockMode()
      ? mockMeetingService.getAll(projectId)
      : remoteMeetingService.getAll(projectId),
  getById: (id: string) =>
    isMockMode()
      ? mockMeetingService.getById(id)
      : remoteMeetingService.getById(id),
  analyze: (
    projectId: string,
    data: {
      title: string
      date: string
      participants: string[]
      summary: string
      transcript?: string
    },
    onProgress?: (state: Partial<MeetingAnalysisState>) => void,
  ) =>
    isMockMode()
      ? mockMeetingService.analyze(projectId, data, onProgress)
      : remoteMeetingService.analyze(projectId, data, onProgress),
  delete: (id: string) =>
    isMockMode() ? mockMeetingService.delete(id) : remoteMeetingService.delete(id),
}
