import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FilePenLine,
  Clock,
  FileText,
  TriangleAlert,
  CircleCheck,
  CircleX,
  CircleHelp,
  ExternalLink,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatusButton, type ButtonStatus } from '@/components/status-button'
import { RiskBadge } from '@/components/ui/risk-badge'
import { LifecycleStepper } from '@/components/change-requests/lifecycle-stepper'
import { RejectionModal } from '@/components/change-requests/rejection-modal'
import { ClarificationModal } from '@/components/change-requests/clarification-modal'
import { ApiError } from '@/services/api/client'
import { changeRequestService, isOpenChangeRequestStatus } from '@/services/changeRequests'
import { projectService } from '@/services/projects'
import { formatDate } from '@/lib/utils'
import type { ChangeRequest, Project } from '@/types'

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false)
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false)
  const [approvalButtonStatus, setApprovalButtonStatus] = useState<ButtonStatus>('idle')

  // Busy flags — action buttons disable while their request is in flight
  const [rejecting, setRejecting] = useState(false)
  const [clarifying, setClarifying] = useState(false)

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const cr = await changeRequestService.getById(id)
      if (!cr) {
        setError('Change request not found')
        return
      }
      setChangeRequest(cr)

      // The project context (breadcrumb, nav) — the commitment context
      // ships inside the change request detail payload itself.
      const proj = await projectService.getById(cr.projectId)
      setProject(proj)
    } catch {
      setError('Failed to load change request details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const speaker = changeRequest?.commitment?.speaker ?? 'Unidentified speaker'

  // Approve — the backend transactionally marks the change request APPROVED,
  // authorizes the linked commitment (AUTHORIZED + risk LOW) and audits it.
  const handleApprove = async () => {
    if (!changeRequest) return
    try {
      setApprovalButtonStatus('loading')
      const updated = await changeRequestService.approve(
        changeRequest.projectId,
        changeRequest.id,
      )
      setChangeRequest(updated)
      setApprovalConfirmOpen(false)
      setApprovalButtonStatus('success')
      toast.success(
        `Change Request ${updated.changeRequestId} approved — the linked commitment is now authorized.`,
      )
    } catch (err) {
      setApprovalButtonStatus('idle')
      setApprovalConfirmOpen(false)
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to approve change request',
      )
    }
  }

  // Reject — commitment stays unauthorized with its risk unchanged
  const handleRejectConfirm = async (reason: string) => {
    if (!changeRequest) return
    try {
      setRejecting(true)
      const updated = await changeRequestService.reject(
        changeRequest.projectId,
        changeRequest.id,
        reason,
      )
      setChangeRequest(updated)
      toast.info(`Change Request ${updated.changeRequestId} rejected — commitment remains unauthorized.`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reject change request',
      )
    } finally {
      setRejecting(false)
    }
  }

  // Clarification — comment is required and appended to the existing thread
  const handleClarificationConfirm = async (notes: string) => {
    if (!changeRequest) return
    if (!notes.trim()) {
      toast.error('Please describe what needs clarification before sending.')
      return
    }
    try {
      setClarifying(true)
      const updated = await changeRequestService.requestClarification(
        changeRequest.projectId,
        changeRequest.id,
        notes.trim(),
      )
      setChangeRequest(updated)
      toast.success('Clarification request sent — the comment was recorded on the change request.')
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to request clarification',
      )
    } finally {
      setClarifying(false)
    }
  }

  if (loading) return <LoadingState message="Loading change order lifecycle..." />
  if (error || !changeRequest) {
    return (
      <ErrorState
        title="Change Request Not Found"
        message={error || 'The requested change request ID could not be located.'}
        onRetry={fetchData}
      />
    )
  }

  const isOpen = isOpenChangeRequestStatus(changeRequest.status)
  const isApproved = changeRequest.status === 'approved'
  const isRejected = changeRequest.status === 'rejected'
  const isClarification = changeRequest.status === 'clarification_requested'
  const commitmentContext = changeRequest.commitment
  // Role-aware decision gating (UI convenience only — the backend enforces
  // ADMIN/OWNER for approve/reject/clarify and stays authoritative).
  const canDecide = project?.myRole === 'ADMIN' || project?.myRole === 'OWNER'

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(project ? `/projects/${project.id}/change-requests` : '/projects')}
            className="h-6 px-1.5 text-xs gap-1 -ml-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Change Requests</span>
          </Button>
          <span>/</span>
          {project && (
            <>
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                {project.name}
              </span>
              <span>/</span>
            </>
          )}
          <span className="font-mono font-medium text-foreground">{changeRequest.changeRequestId}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/80 flex items-center gap-1.5">
                {changeRequest.changeRequestId}
                <CopyButton text={changeRequest.changeRequestId} size="icon" className="h-5 w-5" />
              </span>
              <StatusBadge status={changeRequest.status} />
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-semibold">
                Scope Addendum
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mt-1">
              {changeRequest.title}
            </h1>
          </div>

          {/* Quick Header CTAs if Open (ADMIN/OWNER only) */}
          {isOpen && canDecide && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                disabled={clarifying || rejecting}
                onClick={() => setClarificationModalOpen(true)}
              >
                <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{clarifying ? 'Sending…' : 'Clarification'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                disabled={rejecting || clarifying}
                onClick={() => setRejectionModalOpen(true)}
              >
                <CircleX className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{rejecting ? 'Rejecting…' : 'Reject'}</span>
              </Button>
              <StatusButton
                status={approvalButtonStatus}
                onStatusChange={setApprovalButtonStatus}
                onClick={() => setApprovalConfirmOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CircleCheck className="h-4 w-4" strokeWidth={1.8} />
                <span>Approve Change Request</span>
              </StatusButton>
            </div>
          )}
        </div>
      </div>

      {/* The Core Verification Pipeline Stepper (PRD Section 22) */}
      <LifecycleStepper status={changeRequest.status} />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Specifications, Promise, Impact */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Requested Scope Addendum Specifications */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FilePenLine className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  Feature Specification & Scope
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {changeRequest.title}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Populated from the originating commitment — no field is client-authored.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2 text-xs shadow-2xs leading-relaxed text-foreground">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Requested Feature
                </h4>
                <p className="text-sm font-medium">
                  {changeRequest.title}
                </p>
                <p className="text-muted-foreground pt-1">
                  Source meeting: <span className="font-medium text-foreground">{changeRequest.meetingTitle ?? 'Unrecorded meeting'}</span>
                </p>
              </div>

              {/* What was promised & why it needs approval */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                    What Was Promised
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    {changeRequest.description ?? 'No description recorded.'}
                  </p>
                </div>

                <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Why It Requires Approval
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    The commitment falls outside the approved scope baseline and is
                    not yet authorized. Only approving this change request (or a
                    scope update by the client) authorizes the work.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Verification Context */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                Scope Verification Context
              </CardTitle>
              <CardDescription className="text-xs">
                Live verdict on the linked commitment from deterministic verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-foreground">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Commitment Risk
                  </span>
                  {commitmentContext ? (
                    <RiskBadge level={commitmentContext.riskLevel.toLowerCase() as 'low' | 'medium' | 'high'} />
                  ) : (
                    <span className="text-sm font-bold text-foreground">—</span>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Authorization
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {commitmentContext?.authorizationStatus === 'AUTHORIZED'
                      ? 'Authorized'
                      : commitmentContext?.authorizationStatus === 'PENDING'
                        ? 'Pending review'
                        : 'Unauthorized'}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Promised Delivery
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    Not specified
                  </span>
                </div>
              </div>

              {isClarification && changeRequest.clarificationComment && (
                <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Clarification Thread
                  </span>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                    {changeRequest.clarificationComment}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Originating Commitment */}
          {commitmentContext && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Originating Meeting Commitment
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary gap-1"
                    onClick={() => navigate(`/commitments/${commitmentContext.id}`)}
                  >
                    <span>View Commitment</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {commitmentContext.title}
                    </span>
                    <span className="text-muted-foreground">
                      Spoken by {commitmentContext.speaker ?? 'an unidentified speaker'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Detected during "{changeRequest.meetingTitle ?? 'an unrecorded meeting'}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (4 cols): Approval State, Actions, Metadata */}
        <div className="lg:col-span-4 space-y-6">
          {/* Approval Action Center */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CircleCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Client Approval Sign-Off
              </CardTitle>
              <CardDescription className="text-xs">
                Approving authorizes the linked commitment for implementation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isApproved ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
                    <span>Change Request Approved</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Approved on {formatDate(changeRequest.updatedAt)}.
                    {changeRequest.decisionReason ? ` Reason: "${changeRequest.decisionReason}"` : ''}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span>The linked commitment is authorized and its risk is now LOW. Team may proceed with implementation.</span>
                  </p>
                </div>
              ) : isRejected ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
                    <CircleX className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.8} />
                    <span>Change Request Rejected</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">Rejection reason:</p>
                  <p className="italic text-foreground bg-muted/40 p-2 rounded-lg border border-border/70">
                    "{changeRequest.decisionReason || 'No reason recorded'}"
                  </p>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium pt-1 flex items-center gap-1">
                    <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span>The commitment stays unauthorized with its original risk level. A new request may be generated after re-negotiation.</span>
                  </p>
                </div>
              ) : canDecide ? (
                /* Open state interactive actions (ADMIN/OWNER only) */
                <div className="space-y-3">
                  <div className={`rounded-xl border p-3 text-xs space-y-1 ${isClarification ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                    <p className="font-bold flex items-center gap-1.5">
                      {isClarification ? (
                        <>
                          <CircleHelp className="h-4 w-4" strokeWidth={1.8} /> Clarification Requested
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" strokeWidth={1.8} /> Awaiting Client Signature
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isClarification
                        ? 'You can still approve or reject while clarification is outstanding; the comment thread is preserved.'
                        : 'Approval authorizes the linked commitment; rejection keeps it unauthorized.'}
                    </p>
                  </div>

                  <StatusButton
                    status={approvalButtonStatus}
                    onStatusChange={setApprovalButtonStatus}
                    onClick={() => setApprovalConfirmOpen(true)}
                    className="w-full justify-center gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CircleCheck className="h-4 w-4" strokeWidth={1.8} />
                    <span>Sign & Approve Change Request</span>
                  </StatusButton>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 text-xs"
                    disabled={clarifying || rejecting}
                    onClick={() => setClarificationModalOpen(true)}
                  >
                    <CircleHelp className="h-4 w-4" strokeWidth={1.8} />
                    <span>{clarifying ? 'Sending…' : 'Request Client Clarification'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-center text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    disabled={rejecting || clarifying}
                    onClick={() => setRejectionModalOpen(true)}
                  >
                    {rejecting ? 'Rejecting…' : 'Reject Scope Change'}
                  </Button>
                </div>
              ) : (
                /* Non-decision roles (MEMBER/VIEWER) read the state instead */
                <div className={`rounded-xl border p-3 text-xs space-y-1 ${isClarification ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                  <p className="font-bold flex items-center gap-1.5">
                    {isClarification ? (
                      <>
                        <CircleHelp className="h-4 w-4" strokeWidth={1.8} /> Clarification Requested
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" strokeWidth={1.8} /> Awaiting Client Signature
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Approval, rejection, and clarification requests require an ADMIN or OWNER
                    project role. Your role for this project is {project?.myRole ?? 'restricted'}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Order Metadata */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Audit Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Committed By</span>
                <span className="font-medium text-foreground">{speaker}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source Meeting</span>
                <span className="font-medium text-foreground max-w-[55%] text-right truncate">
                  {changeRequest.meetingTitle ?? 'Unrecorded meeting'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Creation Date</span>
                <span className="font-medium text-foreground">{formatDate(changeRequest.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Audit Update</span>
                <span className="font-medium text-foreground">{formatDate(changeRequest.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Confirmation — explains the authorization side effect */}
      <Dialog open={approvalConfirmOpen} onOpenChange={setApprovalConfirmOpen}>
        <DialogContent className="max-w-md border-border/80 bg-background/98 p-6 shadow-2xl sm:rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">Approve this Change Request?</DialogTitle>
                <DialogDescription className="text-xs">
                  This action has a direct effect on the linked commitment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Approving <span className="font-semibold text-foreground">{changeRequest.changeRequestId}</span> will
              immediately <span className="font-semibold text-foreground">authorize the linked commitment</span>:
              its authorization status becomes AUTHORIZED and its risk level is set to LOW. This
              happens in a single backend transaction and is recorded in the audit trail.
            </p>
            <p>
              The linked commitment: <span className="font-medium text-foreground">{changeRequest.title}</span>
            </p>
          </div>
          <DialogFooter className="pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={approvalButtonStatus === 'loading'}
              onClick={() => setApprovalConfirmOpen(false)}
            >
              Cancel
            </Button>
            <StatusButton
              status={approvalButtonStatus}
              onStatusChange={setApprovalButtonStatus}
              onClick={handleApprove}
              className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CircleCheck className="h-4 w-4" strokeWidth={1.8} />
              <span>Approve & Authorize</span>
            </StatusButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <RejectionModal
        open={rejectionModalOpen}
        onOpenChange={setRejectionModalOpen}
        onConfirm={handleRejectConfirm}
      />

      {/* Clarification Modal */}
      <ClarificationModal
        open={clarificationModalOpen}
        onOpenChange={setClarificationModalOpen}
        onConfirm={handleClarificationConfirm}
      />
    </div>
  )
}
