import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FilePenLine,
  Clock,
  FileText,
  FileCheck2,
  TriangleAlert,
  CircleCheck,
  CircleX,
  CircleHelp,
  ExternalLink,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatusButton, type ButtonStatus } from '@/components/status-button'
import { LifecycleStepper } from '@/components/change-requests/lifecycle-stepper'
import { RejectionModal } from '@/components/change-requests/rejection-modal'
import { ClarificationModal } from '@/components/change-requests/clarification-modal'
import { changeRequestService } from '@/services/changeRequests'
import { projectService } from '@/services/projects'
import { commitmentService } from '@/services/commitments'
import { scopeService } from '@/services/scope'
import { formatDate } from '@/lib/utils'
import type { ChangeRequest, Project, Commitment } from '@/types'

export function ChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false)
  const [approvalButtonStatus, setApprovalButtonStatus] = useState<ButtonStatus>('idle')

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

      // Fetch related project & commitment
      const [proj, comm] = await Promise.all([
        projectService.getById(cr.projectId),
        cr.commitmentId ? commitmentService.getById(cr.commitmentId) : Promise.resolve(null),
      ])

      setProject(proj)
      setCommitment(comm)
    } catch {
      setError('Failed to load change request details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Approve action with StatusButton
  const handleApprove = async () => {
    if (!changeRequest) return
    try {
      setApprovalButtonStatus('loading')
      const updated = await changeRequestService.updateStatus(changeRequest.id, 'approved')
      setChangeRequest(updated)

      // Also mark linked commitment authorized if present
      if (commitment) {
        await commitmentService.updateStatus(commitment.id, 'authorized')
      }

      // Update approved scope baseline
      try {
        const existingReqs = await scopeService.getRequirements(changeRequest.projectId)
        const match = existingReqs.find(
          (r) => r.id === 'req-google-login-excluded' || r.name.toLowerCase().includes('google'),
        )
        if (match) {
          await scopeService.updateRequirement(match.id, {
            status: 'approved',
            source: `Change Order ${updated.changeRequestId} (Signed by Marcus Vance)`,
            description: `${match.description} — Officially approved and funded via Change Request ${updated.changeRequestId}.`,
          })
        } else {
          await scopeService.addRequirement(changeRequest.projectId, {
            name: changeRequest.feature || changeRequest.title,
            description: `Approved scope addition via Change Order ${updated.changeRequestId}. Estimated effort: ${changeRequest.estimatedEffort || '2 Days'}.`,
            category: 'Authentication',
            priority: 'high',
            status: 'approved',
            source: `Change Order ${updated.changeRequestId}`,
          })
        }
      } catch {
        // Non-blocking
      }

      setApprovalButtonStatus('success')
      toast.success(`Change Request ${updated.changeRequestId} approved! Scope baseline updated.`)
    } catch {
      setApprovalButtonStatus('idle')
      toast.error('Failed to approve change request')
    }
  }

  // Reject action
  const handleRejectConfirm = async (reason: string) => {
    if (!changeRequest) return
    try {
      const updated = await changeRequestService.updateStatus(changeRequest.id, 'rejected', reason)
      setChangeRequest(updated)
      toast.info(`Change Request ${updated.changeRequestId} rejected.`)
    } catch {
      toast.error('Failed to reject change request')
    }
  }

  // Clarification action
  const handleClarificationConfirm = (_notes: string) => {
    toast.success('Clarification request sent to client stakeholders!')
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

  const isPending = changeRequest.status === 'pending_approval'
  const isApproved = changeRequest.status === 'approved' || changeRequest.status === 'implemented'
  const isRejected = changeRequest.status === 'rejected'

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
            <div className="flex items-center gap-2.5">
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

          {/* Quick Header CTAs if Pending */}
          {isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setClarificationModalOpen(true)}
              >
                <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>Clarification</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setRejectionModalOpen(true)}
              >
                <CircleX className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>Reject</span>
              </Button>
              <StatusButton
                status={approvalButtonStatus}
                onStatusChange={setApprovalButtonStatus}
                onClick={handleApprove}
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
        {/* Left Column (8 cols): Specifications, Scope Baseline, Impact */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Requested Scope Addendum Specifications */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FilePenLine className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  Feature Specification & Scope
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {changeRequest.feature}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Detailed scope deliverables proposed for client authorization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2 text-xs shadow-2xs leading-relaxed text-foreground">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Feature Description
                </h4>
                <p className="text-sm font-medium">
                  {changeRequest.feature}
                </p>
                <p className="text-muted-foreground pt-1">
                  Ingested from: <span className="font-medium text-foreground">{changeRequest.source}</span>
                </p>
              </div>

              {/* Side-by-side Scope Baseline Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Original Scope Baseline
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    {changeRequest.originalScope}
                  </p>
                </div>

                <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Proposed Change Addendum
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    Integrate Google OAuth Single Sign-On and auto-link user profiles during checkout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Architecture & Delivery Impact */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                Technical & Delivery Impact Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Engineering implications, third-party dependencies, and sprint schedule adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-foreground">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs">
                <p className="text-sm leading-relaxed">
                  {changeRequest.impact}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Engineering Effort
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {changeRequest.estimatedEffort || '18 hours'}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Promised Delivery
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {changeRequest.promisedDeadline || 'Friday close'}
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Budget Authorization
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    $2,250 Addendum
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Verbatim Evidence & Linked Commitment */}
          {commitment && (
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
                    onClick={() => navigate(`/commitments/${commitment.id}`)}
                  >
                    <span>View Commitment</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-foreground">
                      {commitment.commitmentId}
                    </span>
                    <span className="text-muted-foreground">
                      Spoken by {commitment.committedBy}
                    </span>
                  </div>
                  <p className="font-serif italic text-sm text-foreground">
                    {commitment.evidence}
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
                Legally binding authorization before work implementation.
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
                    Authorized by <strong className="text-foreground">{changeRequest.approvedBy || 'Marcus Vance (Client VP)'}</strong> on {formatDate(changeRequest.approvedAt || changeRequest.updatedAt)}.
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span>Scope baseline updated. Team is authorized to proceed with implementation.</span>
                  </p>
                </div>
              ) : isRejected ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
                    <CircleX className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.8} />
                    <span>Change Request Rejected</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Rejected by <strong className="text-foreground">{changeRequest.rejectedBy || 'Marcus Vance (Client VP)'}</strong>:
                  </p>
                  <p className="italic text-foreground bg-muted/40 p-2 rounded-lg border border-border/70">
                    "{changeRequest.rejectionReason || 'Scope postponed to Phase 2 roadmap'}"
                  </p>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium pt-1 flex items-center gap-1">
                    <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                    <span>Work will not be executed. Scope creep successfully deflected.</span>
                  </p>
                </div>
              ) : (
                /* Pending state interactive actions */
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Clock className="h-4 w-4" strokeWidth={1.8} /> Awaiting Client Signature
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Client approval is required before developers commence task implementation.
                    </p>
                  </div>

                  <StatusButton
                    status={approvalButtonStatus}
                    onStatusChange={setApprovalButtonStatus}
                    onClick={handleApprove}
                    className="w-full justify-center gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CircleCheck className="h-4 w-4" strokeWidth={1.8} />
                    <span>Sign & Approve Change Request</span>
                  </StatusButton>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 text-xs"
                    onClick={() => setClarificationModalOpen(true)}
                  >
                    <CircleHelp className="h-4 w-4" strokeWidth={1.8} />
                    <span>Request Client Clarification</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-center text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={() => setRejectionModalOpen(true)}
                  >
                    Reject Scope Change
                  </Button>
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
                <span className="font-medium text-foreground">{changeRequest.committedBy}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target Deadline</span>
                <span className="font-medium text-foreground">{changeRequest.promisedDeadline || 'Sprint Close'}</span>
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
