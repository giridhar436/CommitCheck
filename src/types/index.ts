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
  /** Project document this requirement was sourced from, when linked (Phase 13). */
  sourceDocument: RequirementSourceDocument | null
  createdAt: string
  updatedAt: string
}

// ——— Documents (Phase 13 — backend-backed) ———
// Mirrors the backend DocumentType / DocumentProcessingStatus enums.
// Processing is deterministic text normalization over text-bearing
// content only — PDF/DOC/image (OCR) extraction is NOT implemented;
// binary files register as metadata with status PENDING.
export type DocumentType = 'SOW' | 'REQUIREMENTS' | 'CONTRACT' | 'PROPOSAL' | 'OTHER'
export type DocumentProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface RequirementSourceDocument {
  id: string
  title: string
  type: DocumentType
}

export interface DocumentExtractedText {
  content: string
  charCount: number
  processedAt: string
  updatedAt: string
}

export interface ProjectDocument {
  id: string
  projectId: string
  title: string
  type: DocumentType
  /** Storage key (metadata only — binaries live out of band in Supabase Storage). */
  storagePath: string
  fileSize: number | null
  processingStatus: DocumentProcessingStatus
  processedAt: string | null
  /** Failure reason when processingStatus === 'FAILED'. */
  processingError: string | null
  uploadedAt: string
  createdAt: string
  updatedAt: string
  latestActivity?: { id: string; action: ActivityAction; description: string; createdAt: string } | null
}

/** Detail-only: scope requirements linked to a document. */
export interface DocumentSourceRequirement {
  id: string
  title: string
  category: string
  approvalStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  createdAt: string
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
  matchedScopeRequirement: {
    id: string
    title: string
    category: string
    approvalStatus: string
    sourceDocument: { id: string; title: string } | null
  } | null
  authorizationFound: boolean
  authorizationSource: 'APPROVED_SCOPE' | 'CHANGE_REQUEST' | null
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  authorizationStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  explanation: string
  evidence: string[]
  verifiedAt: string
}

// ——— Change Requests (Phase 11) ———
// Lifecycle: pending_approval → approved | rejected | clarification_requested.
// Every field is authored by the backend from the originating commitment and
// its Phase 10 verification — the client never supplies facts.
export type ChangeRequestStatus =
  | 'pending_approval'
  | 'clarification_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export interface ChangeRequestCommitmentContext {
  id: string
  title: string
  speaker: string | null
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  authorizationStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  meetingId: string
}

export interface ChangeRequest {
  id: string
  /** Display code derived from the id (e.g. "CR-3B7F21"). */
  changeRequestId: string
  projectId: string
  commitmentId: string
  /** The feature being approved — always the originating commitment's title. */
  title: string
  /** What was promised and why it requires approval (backend-authored). */
  description: string | null
  status: ChangeRequestStatus
  /** Optional reason captured with the approve/reject decision. */
  decisionReason: string | null
  /** Accumulated clarification thread — previous requests are preserved. */
  clarificationComment: string | null
  /** Detail-only context; list items carry null. */
  commitment: ChangeRequestCommitmentContext | null
  /** Source meeting title (the "source" of the promise). */
  meetingTitle: string | null
  createdAt: string
  updatedAt: string
}

// ——— Activity / Audit (Phase 12 — backend-backed) ———
// Mirrors the backend ActivityAction enum — the audit trail is written
// transactionally by the backend on every mutation.
export type ActivityAction =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'SCOPE_UPDATED'
  | 'SCOPE_REQUIREMENT_CREATED'
  | 'SCOPE_REQUIREMENT_UPDATED'
  | 'SCOPE_REQUIREMENT_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_UPDATED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_PROCESSED'
  | 'DOCUMENT_PROCESSING_FAILED'
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_DELETED'
  | 'MEETING_ANALYZED'
  | 'MEETING_ATTACHMENT_CREATED'
  | 'MEETING_ATTACHMENT_UPDATED'
  | 'MEETING_ATTACHMENT_DELETED'
  | 'COMMITMENT_CREATED'
  | 'COMMITMENT_UPDATED'
  | 'COMMITMENT_DELETED'
  | 'COMMITMENT_VERIFIED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_DELETED'
  | 'COMMITMENT_DETECTED'
  | 'COMMITMENT_FLAGGED'
  | 'CHANGE_REQUEST_CREATED'
  | 'CHANGE_REQUEST_APPROVED'
  | 'CHANGE_REQUEST_REJECTED'
  | 'CHANGE_REQUEST_CANCELLED'
  | 'CHANGE_REQUEST_CLARIFICATION_REQUESTED'

export type ActivityEntityType =
  | 'PROJECT'
  | 'SCOPE_REQUIREMENT'
  | 'MEETING'
  | 'MEETING_ATTACHMENT'
  | 'COMMITMENT'
  | 'CHANGE_REQUEST'
  | 'DOCUMENT'

/** One enriched audit entry (backend resolves entity titles/context in batch). */
export interface ActivityItem {
  id: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string | null
  /** Title of the related entity (meeting title, commitment title, …). */
  entityTitle: string | null
  description: string
  projectId: string
  /** Navigation ids for the related entity, resolved by the backend. */
  meetingId: string | null
  commitmentId: string | null
  changeRequestId: string | null
  createdAt: string
}

// ——— Dashboard & Alerts (Phase 12) ———
export type AttentionItemType =
  | 'UNAUTHORIZED_COMMITMENT'
  | 'AMBIGUOUS_VERIFICATION'
  | 'PENDING_CHANGE_REQUEST'
  | 'CLARIFICATION_REQUESTED'

/** Deterministic, database-backed alert — dashboard attention items and
 *  the alerts endpoint share this shape (ids are navigation-ready). */
export interface AlertItem {
  id: string
  type: AttentionItemType
  severity: 'HIGH' | 'MEDIUM'
  title: string
  description: string
  commitmentId: string | null
  changeRequestId: string | null
  meetingId: string | null
  createdAt: string
}

export interface DashboardData {
  project: { id: string; name: string }
  summary: {
    scopeRequirements: number
    meetings: number
    commitments: number
    unauthorizedCommitments: number
    highRiskCommitments: number
    pendingChangeRequests: number
    approvedChangeRequests: number
    rejectedChangeRequests: number
  }
  commitments: {
    total: number
    authorized: number
    unauthorized: number
    pending: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
  changeRequests: {
    pending: number
    clarificationRequested: number
    approved: number
    rejected: number
  }
  recentActivity: ActivityItem[]
  attentionItems: AlertItem[]
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
