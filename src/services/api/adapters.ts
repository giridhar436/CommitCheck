/* ——————————————————————————————————————————————————
 * CommitCheck — Backend → Frontend Adapters
 *
 * The NestJS backend wraps every response in
 * `{ success, message, data }` and paginates lists as
 * `{ items, page, limit, totalItems, totalPages }`.
 * These helpers unwrap that envelope and map backend
 * DTOs onto the frontend domain types so pages and the
 * rest of the UI never see the transport shapes.
 * —————————————————————————————————————————————————— */

import type {
  ActivityAction,
  ActivityItem,
  AlertItem,
  ChangeRequest,
  Commitment,
  DashboardData,
  DocumentExtractedText,
  DocumentSourceRequirement,
  Meeting,
  Project,
  ProjectDocument,
  Requirement,
  RiskLevel,
} from '@/types'

// ——— Transport shapes (backend contracts) ———

export interface BackendEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export interface BackendPaginated<T> {
  items: T[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface BackendProject {
  id: string
  name: string
  clientName: string
  description: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
  budget: number | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  counts?: {
    scopeRequirements: number
    meetings: number
    commitments: number
    changeRequests: number
    documents: number
  }
  latestActivity?: unknown
}

export interface BackendRequirement {
  id: string
  projectId: string
  title: string
  description: string | null
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  approvalStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  sourceClause: string | null
  acceptanceCriteria: string | null
  sourceDocument: {
    id: string
    title: string
    type: 'SOW' | 'REQUIREMENTS' | 'CONTRACT' | 'PROPOSAL' | 'OTHER'
  } | null
  createdAt: string
  updatedAt: string
}

export interface BackendDocument {
  id: string
  projectId: string
  title: string
  type: 'SOW' | 'REQUIREMENTS' | 'CONTRACT' | 'PROPOSAL' | 'OTHER'
  storagePath: string
  fileSize: number | null
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  processedAt: string | null
  processingError: string | null
  uploadedAt: string
  createdAt: string
  updatedAt: string
  /** Phase 14: chunking + embedding index stats (never raw embeddings). */
  chunkCount: number
  indexedChunks: number
  latestActivity?: {
    id: string
    action: ActivityAction
    description: string
    createdAt: string
  } | null
}

export interface BackendDocumentDetail extends BackendDocument {
  extractedText: {
    content: string
    charCount: number
    processedAt: string
    updatedAt: string
  } | null
  sourceRequirements: Array<{
    id: string
    title: string
    category: string
    approvalStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
    createdAt: string
  }>
}

export interface BackendMeeting {
  id: string
  projectId: string
  title: string
  summary: string | null
  meetingDate: string
  analysisStatus: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  commitmentCount: number
  attachmentCount: number
  createdAt: string
  updatedAt: string
  attachments?: Array<{
    id: string
    fileName: string
    fileType: string | null
    storagePath: string
    fileSize: number | null
    uploadedAt: string
  }>
}

export interface BackendCommitment {
  id: string
  projectId: string
  meetingId: string
  meetingTitle: string
  title: string
  speaker: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  authorizationStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
  confidenceScore: number | null
  createdAt: string
  updatedAt: string
  // Detail-only fields
  description?: string
  evidenceReference?: string | null
  meetingSummary?: string | null
  projectName?: string
  evidenceCount?: number
  latestActivity?: {
    action: string
    description: string
    createdAt: string
  } | null
}

export interface BackendEvidence {
  id: string
  commitmentId: string
  quote: string
  timestamp: string | null
  source: 'TRANSCRIPT' | 'SUMMARY' | 'NOTES' | 'RECORDING' | 'DOCUMENT' | 'OTHER'
  createdAt: string
}

export interface BackendChangeRequest {
  id: string
  projectId: string
  commitmentId: string
  title: string
  description: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CLARIFICATION_REQUESTED'
  approvalReason: string | null
  clarificationComment: string | null
  createdAt: string
  updatedAt: string
  /** Detail-only: originating commitment + meeting context. */
  commitment?: {
    id: string
    title: string
    speaker: string | null
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    authorizationStatus: 'AUTHORIZED' | 'UNAUTHORIZED' | 'PENDING'
    meetingId: string
  } | null
  meetingTitle?: string | null
}

export interface BackendActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityTitle: string | null
  description: string
  projectId: string
  meetingId: string | null
  commitmentId: string | null
  changeRequestId: string | null
  createdAt: string
}

export interface BackendAlertItem {
  id: string
  type: 'UNAUTHORIZED_COMMITMENT' | 'AMBIGUOUS_VERIFICATION' | 'PENDING_CHANGE_REQUEST' | 'CLARIFICATION_REQUESTED'
  severity: 'HIGH' | 'MEDIUM'
  title: string
  description: string
  commitmentId: string | null
  changeRequestId: string | null
  meetingId: string | null
  createdAt: string
}

export interface BackendDashboard {
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
  recentActivity: BackendActivityItem[]
  attentionItems: BackendAlertItem[]
}

// ——— Envelope unwrapping ———

export function unwrap<T>(envelope: BackendEnvelope<T>): T {
  return envelope.data
}

export function unwrapList<T>(envelope: BackendEnvelope<BackendPaginated<T>>): T[] {
  return envelope.data.items
}

export async function unwrapPage<T>(
  envelope: BackendEnvelope<BackendPaginated<T>>,
): Promise<BackendPaginated<T>> {
  return envelope.data
}

// ——— Enum / value mappers ———

export function mapProjectStatus(status: BackendProject['status']): Project['status'] {
  switch (status) {
    case 'ACTIVE':
      return 'active'
    case 'ON_HOLD':
      return 'paused'
    case 'COMPLETED':
      return 'completed'
    case 'ARCHIVED':
      return 'archived'
  }
}

export function mapProjectStatusToBackend(status: Project['status']): BackendProject['status'] {
  switch (status) {
    case 'active':
      return 'ACTIVE'
    case 'paused':
      return 'ON_HOLD'
    case 'completed':
      return 'COMPLETED'
    case 'archived':
      return 'ARCHIVED'
  }
}

function mapRiskLevel(level: 'LOW' | 'MEDIUM' | 'HIGH'): RiskLevel {
  return level.toLowerCase() as RiskLevel
}

function mapApprovalStatusToRequirementStatus(
  status: BackendRequirement['approvalStatus'],
): Requirement['status'] {
  switch (status) {
    case 'AUTHORIZED':
      return 'approved'
    case 'PENDING':
      return 'pending'
    case 'UNAUTHORIZED':
      return 'not_in_scope'
  }
}

export function mapRequirementStatusToBackend(
  status: Requirement['status'],
): BackendRequirement['approvalStatus'] {
  switch (status) {
    case 'approved':
      return 'AUTHORIZED'
    case 'pending':
      return 'PENDING'
    // 'rejected' and 'not_in_scope' both mean "not part of the approved baseline"
    case 'rejected':
    case 'not_in_scope':
      return 'UNAUTHORIZED'
  }
}

function mapAuthorizationStatus(
  status: BackendCommitment['authorizationStatus'],
): Commitment['authorization'] {
  switch (status) {
    case 'AUTHORIZED':
      return 'authorized'
    case 'PENDING':
      return 'pending'
    case 'UNAUTHORIZED':
      return 'unauthorized'
  }
}

export function mapCommitmentStatusToBackend(
  status: Commitment['status'],
): BackendCommitment['authorizationStatus'] {
  switch (status) {
    case 'authorized':
      return 'AUTHORIZED'
    // 'dismissed' has no dedicated backend state; treated as not-authorized scope creep
    case 'unauthorized':
    case 'dismissed':
      return 'UNAUTHORIZED'
    case 'needs_review':
    case 'change_request_created':
      return 'PENDING'
  }
}

/** Stable, readable display code derived from the commitment UUID (e.g. CC-8F42A1). */
export function commitmentDisplayCode(id: string): string {
  return `CC-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

/** Deterministic project risk heuristic from its unauthorized/pending commitments. */
export function deriveProjectRiskLevel(
  unauthorizedCommitments: number,
  detectedCommitments: number,
): RiskLevel {
  if (unauthorizedCommitments > 0) return 'high'
  if (detectedCommitments > 0) return 'medium'
  return 'low'
}

// ——— Entity mappers ———

export function mapProject(dto: BackendProject): Project {
  const detected = dto.counts?.commitments ?? 0

  return {
    id: dto.id,
    name: dto.name,
    client: dto.clientName,
    description: dto.description ?? '',
    status: mapProjectStatus(dto.status),
    startDate: dto.startDate ?? dto.createdAt,
    endDate: dto.endDate ?? undefined,
    budget:
      dto.budget !== null && dto.budget !== undefined
        ? `₹${dto.budget.toLocaleString('en-IN')}`
        : undefined,
    approvedRequirements: dto.counts?.scopeRequirements ?? 0,
    detectedCommitments: detected,
    // Authorization breakdown is not part of the project payload; the
    // service layer fills it in from a filtered commitments count.
    unauthorizedCommitments: 0,
    pendingChangeRequests: dto.counts?.changeRequests ?? 0,
    riskLevel: deriveProjectRiskLevel(0, detected),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function mapRequirement(dto: BackendRequirement): Requirement {
  return {
    id: dto.id,
    projectId: dto.projectId,
    name: dto.title,
    description: dto.description ?? '',
    category: dto.category,
    // Backend also allows CRITICAL, which the UI folds into high
    priority: (dto.priority.toLowerCase() === 'critical'
      ? 'high'
      : dto.priority.toLowerCase()) as Requirement['priority'],
    status: mapApprovalStatusToRequirementStatus(dto.approvalStatus),
    source: dto.sourceClause ?? 'Manual Entry',
    sourceDocument: dto.sourceDocument,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

/** Phase 13 — documents keep the backend enum casing end-to-end. */
export function mapDocument(dto: BackendDocument): ProjectDocument {
  return {
    ...dto,
    latestActivity: dto.latestActivity ?? null,
  }
}

export function mapDocumentDetail(
  dto: BackendDocumentDetail,
): ProjectDocument & {
  extractedText: DocumentExtractedText | null
  sourceRequirements: DocumentSourceRequirement[]
} {
  return {
    ...mapDocument(dto),
    extractedText: dto.extractedText,
    sourceRequirements: dto.sourceRequirements,
  }
}

export function mapMeeting(dto: BackendMeeting): Meeting {
  return {
    id: dto.id,
    projectId: dto.projectId,
    title: dto.title,
    date: dto.meetingDate,
    // The backend Meeting model has no participant roster
    participants: [],
    summary: dto.summary ?? '',
    commitmentsDetected: dto.commitmentCount,
    analysisStatus: dto.analysisStatus,
    analyzedAt: dto.analysisStatus === 'COMPLETED' ? dto.updatedAt : undefined,
    createdAt: dto.createdAt,
  }
}

/** Map a list-item commitment (no evidence rows — quotes are filled separately). */
export function mapCommitment(dto: BackendCommitment): Commitment {
  const authorization = mapAuthorizationStatus(dto.authorizationStatus)
  return {
    id: dto.id,
    commitmentId: commitmentDisplayCode(dto.id),
    projectId: dto.projectId,
    meetingId: dto.meetingId,
    commitment: dto.title,
    committedBy: dto.speaker,
    evidence: '',
    // Reflects the Phase 10 verification semantics: AUTHORIZED = covered by
    // approved scope/approved change request, PENDING = ambiguous (needs
    // review), UNAUTHORIZED = outside scope with no authorization.
    scopeMatch:
      dto.authorizationStatus === 'AUTHORIZED'
        ? 'matched'
        : dto.authorizationStatus === 'PENDING'
          ? 'partial'
          : 'not_found',
    authorization,
    riskLevel: mapRiskLevel(dto.riskLevel),
    status:
      authorization === 'authorized'
        ? 'authorized'
        : authorization === 'pending'
          ? 'needs_review'
          : 'unauthorized',
    aiExplanation: dto.description ?? '',
    latestActivity: dto.latestActivity ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

/** Map a detail commitment, adding description-backed explanation + evidence quote. */
export function mapCommitmentDetail(
  dto: BackendCommitment,
  evidence: BackendEvidence[],
): Commitment {
  const base = mapCommitment(dto)
  return {
    ...base,
    evidence: evidence[0]?.quote ?? '',
    aiExplanation: dto.description ?? base.aiExplanation,
  }
}

/** Stable, readable display code derived from the CR UUID (e.g. CR-3B7F21). */
export function changeRequestDisplayCode(id: string): string {
  return `CR-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

function mapChangeRequestStatus(
  status: BackendChangeRequest['status'],
): ChangeRequest['status'] {
  switch (status) {
    case 'PENDING':
      return 'pending_approval'
    case 'CLARIFICATION_REQUESTED':
      return 'clarification_requested'
    case 'APPROVED':
      return 'approved'
    case 'REJECTED':
      return 'rejected'
    case 'CANCELLED':
      return 'cancelled'
  }
}

/** Map a backend change request onto the frontend domain type. */
export function mapChangeRequest(dto: BackendChangeRequest): ChangeRequest {
  return {
    id: dto.id,
    changeRequestId: changeRequestDisplayCode(dto.id),
    projectId: dto.projectId,
    commitmentId: dto.commitmentId,
    title: dto.title,
    description: dto.description,
    status: mapChangeRequestStatus(dto.status),
    decisionReason: dto.approvalReason,
    clarificationComment: dto.clarificationComment,
    commitment: dto.commitment ?? null,
    meetingTitle: dto.meetingTitle ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

// ——— Phase 12 (dashboard/activity/alerts) — the backend already emits
// the frontend's exact enum casing, so these mappers are structural
// checks more than transformations. ———

export function mapActivityItem(dto: BackendActivityItem): ActivityItem {
  return dto as ActivityItem
}

export function mapAlertItem(dto: BackendAlertItem): AlertItem {
  return dto as AlertItem
}

export function mapDashboard(dto: BackendDashboard): DashboardData {
  return {
    ...dto,
    recentActivity: dto.recentActivity.map(mapActivityItem),
    attentionItems: dto.attentionItems.map(mapAlertItem),
  }
}
