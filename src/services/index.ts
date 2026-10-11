/* ——————————————————————————————————————————————————
 * CommitCheck — Services Barrel
 * —————————————————————————————————————————————————— */

export { apiClient, ApiError } from './api/client'
export type { RequestInterceptor, ResponseInterceptor } from './api/client'
export { endpoints } from './api/endpoints'
export { setupInterceptors } from './api/interceptors'
export { authService } from './auth'
export { projectService } from './projects'
export { commitmentService } from './commitments'
export { evidenceService } from './evidence'
export { meetingService } from './meetings'
export { changeRequestService } from './changeRequests'
export { scopeService } from './scope'
export { notificationService } from './notifications'
export { activityService } from './activity'
export { documentService } from './documents'
