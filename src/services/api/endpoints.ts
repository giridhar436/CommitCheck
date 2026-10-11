/* ——————————————————————————————————————————————————
 * CommitCheck — API Endpoint Paths
 *
 * Mirrors the live NestJS backend route map exactly.
 * The backend exposes nested resource routes only
 * (e.g. commitments always live under a project), so
 * every path here carries its parent resource ids.
 * —————————————————————————————————————————————————— */

export const endpoints = {
  // ——— Projects ———
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    create: '/projects',
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
  },

  // ——— Scope / Requirements (nested under project) ———
  scope: {
    list: (projectId: string) => `/projects/${projectId}/scope`,
    detail: (projectId: string, id: string) => `/projects/${projectId}/scope/${id}`,
    create: (projectId: string) => `/projects/${projectId}/scope`,
    update: (projectId: string, id: string) => `/projects/${projectId}/scope/${id}`,
    delete: (projectId: string, id: string) => `/projects/${projectId}/scope/${id}`,
  },

  // ——— Meetings (nested under project) ———
  meetings: {
    list: (projectId: string) => `/projects/${projectId}/meetings`,
    detail: (projectId: string, id: string) => `/projects/${projectId}/meetings/${id}`,
    create: (projectId: string) => `/projects/${projectId}/meetings`,
    update: (projectId: string, id: string) => `/projects/${projectId}/meetings/${id}`,
    delete: (projectId: string, id: string) => `/projects/${projectId}/meetings/${id}`,
    // Phase 8 — manual AI-analysis trigger (runs synchronously)
    analyze: (projectId: string, meetingId: string) =>
      `/projects/${projectId}/meetings/${meetingId}/analyze`,
  },

  // ——— Meeting Attachments (nested under project + meeting) ———
  attachments: {
    list: (projectId: string, meetingId: string) =>
      `/projects/${projectId}/meetings/${meetingId}/attachments`,
    detail: (projectId: string, meetingId: string, id: string) =>
      `/projects/${projectId}/meetings/${meetingId}/attachments/${id}`,
    create: (projectId: string, meetingId: string) =>
      `/projects/${projectId}/meetings/${meetingId}/attachments`,
    update: (projectId: string, meetingId: string, id: string) =>
      `/projects/${projectId}/meetings/${meetingId}/attachments/${id}`,
    delete: (projectId: string, meetingId: string, id: string) =>
      `/projects/${projectId}/meetings/${meetingId}/attachments/${id}`,
  },

  // ——— Commitments (nested under project) ———
  commitments: {
    list: (projectId: string) => `/projects/${projectId}/commitments`,
    detail: (projectId: string, id: string) => `/projects/${projectId}/commitments/${id}`,
    create: (projectId: string) => `/projects/${projectId}/commitments`,
    update: (projectId: string, id: string) => `/projects/${projectId}/commitments/${id}`,
    delete: (projectId: string, id: string) => `/projects/${projectId}/commitments/${id}`,
    // Phase 10 — deterministic scope verification trigger
    verify: (projectId: string, id: string) =>
      `/projects/${projectId}/commitments/${id}/verify`,
    // Read-only meeting-scoped surface
    listByMeeting: (meetingId: string) => `/meetings/${meetingId}/commitments`,
  },

  // ——— Commitment Evidence (nested under project + commitment; immutable) ———
  evidence: {
    list: (projectId: string, commitmentId: string) =>
      `/projects/${projectId}/commitments/${commitmentId}/evidence`,
    detail: (projectId: string, commitmentId: string, id: string) =>
      `/projects/${projectId}/commitments/${commitmentId}/evidence/${id}`,
    create: (projectId: string, commitmentId: string) =>
      `/projects/${projectId}/commitments/${commitmentId}/evidence`,
    delete: (projectId: string, commitmentId: string, id: string) =>
      `/projects/${projectId}/commitments/${commitmentId}/evidence/${id}`,
  },
  // ——— Change Requests (nested under project; Phase 11) ———
  changeRequests: {
    list: (projectId: string) => `/projects/${projectId}/change-requests`,
    detail: (projectId: string, id: string) => `/projects/${projectId}/change-requests/${id}`,
    // Generation from a commitment — the endpoint takes no body at all
    generate: (projectId: string, commitmentId: string) =>
      `/projects/${projectId}/commitments/${commitmentId}/change-request`,
    approve: (projectId: string, id: string) => `/projects/${projectId}/change-requests/${id}/approve`,
    reject: (projectId: string, id: string) => `/projects/${projectId}/change-requests/${id}/reject`,
    clarification: (projectId: string, id: string) =>
      `/projects/${projectId}/change-requests/${id}/clarification`,
  },

  // ——— Dashboard / Activity / Alerts (nested under project; Phase 12,
  //     all read-only) ———
  dashboard: {
    overview: (projectId: string) => `/projects/${projectId}/dashboard`,
    activity: (projectId: string) => `/projects/${projectId}/activity`,
    alerts: (projectId: string) => `/projects/${projectId}/alerts`,
  },
} as const
