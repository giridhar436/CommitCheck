/* ——————————————————————————————————————————————————
 * CommitCheck — Services Barrel
 * —————————————————————————————————————————————————— */

export { apiClient, ApiError, isMockMode } from './api/client'
export type { ApiMode, RequestInterceptor, ResponseInterceptor } from './api/client'
export { endpoints } from './api/endpoints'
export { setupInterceptors } from './api/interceptors'

export { authService } from './auth'
export { projectService } from './projects'
export { commitmentService } from './commitments'
export { meetingService } from './meetings'
export { changeRequestService } from './changeRequests'
export { scopeService } from './scope'
export { notificationService } from './notifications'
export { activityService } from './activity'
export { documentService } from './documents'
