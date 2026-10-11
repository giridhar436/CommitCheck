/* ——————————————————————————————————————————————————
 * CommitCheck — Core Type Definitions
 * —————————————————————————————————————————————————— */

// ——— Auth ———
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  organization?: string
  role: 'owner' | 'admin' | 'member'
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// ——— Projects ———
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  client: string
  description: string
  status: ProjectStatus
  startDate: string
  endDate?: string
  budget?: string
  approvedRequirements: number
  detectedCommitments: number
  unauthorizedCommitments: number
  pendingChangeRequests: number
  riskLevel: RiskLevel
  createdAt: string
  updatedAt: string
}

// ——— Scope / Requirements ———
export type RequirementStatus = 'approved' | 'pending' | 'rejected' | 'not_in_scope'
export type RequirementPriority = 'high' | 'medium' | 'low'

export interface Requirement {
  id: string
  projectId: string
  name: string
  description: string
  category: string
  priority: RequirementPriority
  status: RequirementStatus
  source: string
  createdAt: string
  updatedAt: string
}

// ——— Documents ———
export type DocumentType = 'sow' | 'requirements' | 'contract' | 'proposal' | 'scope'
export type DocumentProcessingStatus = 'uploading' | 'processing' | 'processed' | 'failed'

export interface ProjectDocument {
  id: string
  projectId: string
  name: string
  type: DocumentType
  processingStatus: DocumentProcessingStatus
  uploadDate: string
  source: string
  size: number
}

// ——— Meetings ———
export type MeetingAnalysisStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Meeting {
  id: string
  projectId: string
  title: string
  date: string
  participants: string[]
  summary: string
  transcript?: string
  commitmentsDetected: number
  analysisStatus: MeetingAnalysisStatus
  analyzedAt?: string
  createdAt: string
}

export interface MeetingAnalysisState {
  status: 'idle' | 'extracting' | 'checking_scope' | 'checking_auth' | 'assessing_risk' | 'complete' | 'error'
  progress: number
  commitments: Commitment[]
  error?: string
}

// ——— Commitments ———
export type RiskLevel = 'high' | 'medium' | 'low' | 'none'
export type AuthorizationStatus = 'authorized' | 'unauthorized' | 'pending' | 'not_found'
export type ScopeMatch = 'matched' | 'partial' | 'not_found'
export type CommitmentStatus = 'needs_review' | 'authorized' | 'unauthorized' | 'dismissed' | 'change_request_created'

export interface Commitment {
  id: string
  commitmentId: string // e.g., "CC-8F42A1"
  projectId: string
  meetingId: string
  commitment: string
  committedBy: string
  deadline?: string
  evidence: string
  scopeMatch: ScopeMatch
  matchedRequirement?: string
  authorization: AuthorizationStatus
  riskLevel: RiskLevel
  status: CommitmentStatus
  changeRequestId?: string
  aiExplanation: string
  latestActivity?: { action: string; description: string; createdAt: string } | null
  createdAt: string
  updatedAt: string
}

// ——— Scope Verification (Phase 10) ———
// Deterministic backend verdict for a commitment. scopeMatch is true
// (covered by approved scope), false (no meaningful overlap) or null
// (ambiguous — needs human review). Authorization always comes from
// database state (approved scope / approved change request) — never
// from AI output.
export interface VerificationResult {
  commitmentId: string
  scopeMatch: boolean | null
  matchedRequirement: { id: string; title: string; category: string; approvalStatus: string } | null
  authorizationFound: boolean
  authorizationSource: 'APPROVED_SCOPE' | 'CHANGE_REQUEST' | null
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  authorizationStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  explanation: string
  evidence: string[]
  verifiedAt: string
}

// ——— Change Requests ———
export type ChangeRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'implemented'

export interface ChangeRequest {
  id: string
  changeRequestId: string // e.g., "CR-3B7F21"
  projectId: string
  commitmentId: string
  title: string
  feature: string
  source: string
  committedBy: string
  promisedDeadline?: string
  originalScope: string
  estimatedEffort?: string
  impact: string
  status: ChangeRequestStatus
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

// ——— Activity / Audit ———
export type ActivityType =
  | 'meeting_analyzed'
  | 'commitment_detected'
  | 'commitment_flagged'
  | 'change_request_created'
  | 'change_request_approved'
  | 'change_request_rejected'
  | 'scope_updated'
  | 'document_uploaded'
  | 'project_created'

export interface ActivityItem {
  id: string
  projectId: string
  type: ActivityType
  title: string
  description: string
  relatedId?: string
  relatedType?: 'commitment' | 'change_request' | 'meeting' | 'document'
  timestamp: string
  actor?: string
}

// ——— Notifications ———
export type NotificationType = 'high_risk' | 'unauthorized' | 'approval_needed' | 'approved' | 'rejected' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  relatedType?: 'commitment' | 'change_request' | 'project'
  read: boolean
  timestamp: string
}

// ——— API ———
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
