/* ——————————————————————————————————————————————————
 * CommitCheck — API Endpoint Paths
 *
 * Type-safe endpoint constants matching PRD §36.
 * All service modules import paths from here
 * instead of duplicating string literals.
 * —————————————————————————————————————————————————— */

export const endpoints = {
  // ——— Auth ———
  auth: {
    signup: '/auth/signup',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    forgotPassword: '/auth/forgot-password',
  },

  // ——— Projects ———
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    create: '/projects',
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
  },

  // ——— Documents ———
  documents: {
    list: (projectId: string) => `/projects/${projectId}/documents`,
    upload: (projectId: string) => `/projects/${projectId}/documents`,
    delete: (id: string) => `/documents/${id}`,
  },

  // ——— Meetings / Conversations ———
  meetings: {
    list: (projectId: string) => `/projects/${projectId}/conversations`,
    detail: (id: string) => `/conversations/${id}`,
    create: (projectId: string) => `/projects/${projectId}/conversations`,
    analyze: (id: string) => `/conversations/${id}/analyze`,
    delete: (id: string) => `/conversations/${id}`,
  },

  // ——— Commitments ———
  commitments: {
    list: (projectId: string) => `/projects/${projectId}/commitments`,
    detail: (id: string) => `/commitments/${id}`,
    update: (id: string) => `/commitments/${id}`,
  },

  // ——— Change Requests ———
  changeRequests: {
    list: (projectId: string) => `/projects/${projectId}/change-requests`,
    detail: (id: string) => `/change-requests/${id}`,
    create: (commitmentId: string) => `/commitments/${commitmentId}/change-request`,
    update: (id: string) => `/change-requests/${id}`,
    approve: (id: string) => `/change-requests/${id}/approve`,
    reject: (id: string) => `/change-requests/${id}/reject`,
    clarification: (id: string) => `/change-requests/${id}/clarification`,
  },

  // ——— Scope / Requirements ———
  scope: {
    list: (projectId: string) => `/projects/${projectId}/requirements`,
    create: (projectId: string) => `/projects/${projectId}/requirements`,
    update: (id: string) => `/requirements/${id}`,
    delete: (id: string) => `/requirements/${id}`,
  },

  // ——— Notifications ———
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },

  // ——— Activity / Audit ———
  activity: {
    list: (projectId: string) => `/projects/${projectId}/activity`,
    record: (projectId: string) => `/projects/${projectId}/activity`,
  },
} as const
