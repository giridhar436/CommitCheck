import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CircleCheck,
  CircleX,
  TriangleAlert,
  Clock,
  User,
  Video,
  FileText,
  FileCheck2,
  FilePenLine,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { CopyButton } from '@/components/copy-button'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { ScrollFadeEffect } from '@/components/scroll-fade-effect'
import { CreateChangeRequestDialog } from '@/components/commitments/create-change-request-dialog'
import { commitmentService } from '@/services/commitments'
import { projectService } from '@/services/projects'
import { meetingService } from '@/services/meetings'
import { changeRequestService, isOpenChangeRequestStatus } from '@/services/changeRequests'
import { verificationService } from '@/services/verification'
import { formatDate } from '@/lib/utils'
import type { Commitment, Project, Meeting, ChangeRequest, VerificationResult } from '@/types'

export function CommitmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [commitment, setCommitment] = useState<Commitment | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [crDialogOpen, setCrDialogOpen] = useState(false)

  // Phase 10 — scope verification state
  const [verification, setVerification] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const comm = await commitmentService.getById(id)
      if (!comm) {
        setError('Commitment not found')
        return
      }
      setCommitment(comm)

      // Fetch related project, meeting, and change request in parallel
      const [proj, meet, crs] = await Promise.all([
        projectService.getById(comm.projectId),
        meetingService.getById(comm.projectId, comm.meetingId),
        changeRequestService.getAll(comm.projectId),
      ])

      setProject(proj)
      setMeeting(meet)

      // Find linked CR if any
      const linked = crs.find(
        (c) => c.commitmentId === comm.id || (comm.changeRequestId && c.changeRequestId === comm.changeRequestId),
      )
      setChangeRequest(linked ?? null)
    } catch {
      setError('Failed to load commitment details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setVerification(null)
    fetchData()
  }, [id])

  // Phase 10 — deterministic scope verification against approved scope and
  // approved change requests. The backend computes the verdict; we refresh
  // the detail afterwards so risk/authorization badges reflect the outcome.
  const handleVerifyScope = async () => {
    if (!commitment) return
    try {
      setVerifying(true)
      const result = await verificationService.verify(commitment.projectId, commitment.id)
      setVerification(result)
      const refreshed = await commitmentService.getById(commitment.id)
      if (refreshed) setCommitment(refreshed)
      toast.success(
        result.risk === 'LOW'
          ? 'Commitment verified — within approved scope or authorized.'
          : result.risk === 'MEDIUM'
            ? 'Commitment verified — ambiguous scope match, needs review.'
            : 'Commitment verified — outside approved scope and unauthorized.',
      )
    } catch {
      toast.error('Scope verification failed')
    } finally {
      setVerifying(false)
    }
  }

  // Phase 11 security: clients can no longer mark a commitment authorized
  // directly — authorization is granted only by approving a Change Request
  // (or automatically by verification for in-scope commitments).

  if (loading) return <LoadingState message="Loading commitment evidence & scope comparison..." />
  if (error || !commitment) {
    return (
      <ErrorState
        title="Commitment Not Found"
        message={error || 'The requested commitment ID could not be located.'}
        onRetry={fetchData}
      />
    )
  }

  const isScopeFound = commitment.scopeMatch === 'matched'
  const isUnauthorized = commitment.authorization === 'unauthorized'
  const isHighRisk = commitment.riskLevel === 'high'

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(project ? `/projects/${project.id}/commitments` : '/projects')}
            className="h-6 px-1.5 text-xs gap-1 -ml-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Commitments</span>
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
          <span className="font-mono font-medium text-foreground">{commitment.commitmentId}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/80 flex items-center gap-1.5">
                {commitment.commitmentId}
                <CopyButton text={commitment.commitmentId} size="icon" className="h-5 w-5" />
              </span>
              <RiskBadge level={commitment.riskLevel} />
              <StatusBadge status={commitment.status} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mt-1">
              {commitment.commitment}
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {commitment.status !== 'change_request_created' && (
              <Button
                size="sm"
                className="gap-1.5 font-semibold shadow-xs"
                onClick={() => setCrDialogOpen(true)}
              >
                <FilePenLine className="h-4 w-4" strokeWidth={1.8} />
                <span>Create Change Request</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Verbatim Evidence, Scope Comparison Matrix, AI Explanation */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 0: Scope Verification (Phase 10 — deterministic backend verdict) */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Scope Verification
                </CardTitle>
                {verification && (
                  <RiskBadge level={verification.risk.toLowerCase() as Commitment['riskLevel']} />
                )}
              </div>
              <CardDescription className="text-xs">
                Deterministic check against approved scope requirements and approved change
                requests — authorization comes from database state, never from AI output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {verification ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Scope
                      </span>
                      <span
                        className={`font-bold mt-0.5 block ${
                          verification.scopeMatch === true
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : verification.scopeMatch === false
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {verification.scopeMatch === true
                          ? 'In approved scope'
                          : verification.scopeMatch === false
                            ? 'Out of scope'
                            : 'Ambiguous'}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Authorization
                      </span>
                      <span
                        className={`font-bold mt-0.5 block ${
                          verification.authorizationFound
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {verification.authorizationFound
                          ? verification.authorizationSource === 'APPROVED_SCOPE'
                            ? 'Approved scope requirement'
                            : 'Approved change request'
                          : 'Not authorized'}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Matched Requirement
                      </span>
                      <span className="font-bold mt-0.5 block text-foreground">
                        {verification.matchedRequirement
                          ? verification.matchedRequirement.title
                          : 'None'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3 text-xs leading-relaxed">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Explanation
                    </span>
                    <p className="mt-1">{verification.explanation}</p>
                    {verification.evidence.length > 0 && (
                      <p className="mt-2 text-muted-foreground">
                        References: {verification.evidence.join(' · ')}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Verified {formatDate(verification.verifiedAt)}
                    </p>
                  </div>
                </>
              ) : commitment.latestActivity?.action === 'COMMITMENT_VERIFIED' ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                  <p className="text-muted-foreground">
                    <span className="font-bold text-foreground">Last verified</span>{' '}
                    {formatDate(commitment.latestActivity.createdAt)} —{' '}
                    {commitment.latestActivity.description}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Run verification again to re-check against the current approved scope.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not verified yet — run verification to compare this commitment against the
                  approved scope baseline.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 1: Verbatim Evidence & Statement Context */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Verbatim Statement & Evidence
                </CardTitle>
                <CopyButton text={commitment.evidence} size="sm" className="h-7 text-xs px-2 gap-1">
                  Copy Evidence
                </CopyButton>
              </div>
              <CardDescription className="text-xs">
                Extracted statement with speaker attribution from client meeting dialogue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4">
                <ScrollFadeEffect className="max-h-36 overflow-y-auto">
                  <p className="font-serif italic text-base leading-relaxed text-foreground">
                    {commitment.evidence}
                  </p>
                </ScrollFadeEffect>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-primary/15 text-xs text-muted-foreground font-sans">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Spoken by: {commitment.committedBy}
                  </span>
                  {commitment.deadline && (
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Promised delivery: {commitment.deadline}
                    </span>
                  )}
                </div>
              </div>

              {/* Source Meeting Context Snippet */}
              {meeting && (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                    <span className="font-medium text-foreground">{meeting.title}</span>
                    <span className="text-muted-foreground">&bull; {formatDate(meeting.date)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                    onClick={() => navigate(`/projects/${commitment.projectId}/meetings`)}
                  >
                    <span>View Meeting</span>
                    <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: The Scope Comparison Matrix (PRD Core Section 21) */}
          <Card className={`border shadow-xs ${isHighRisk ? 'border-red-500/30' : 'border-border/80'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Scope Comparison Matrix
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    !isScopeFound
                      ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs py-0.5 px-2'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs py-0.5 px-2'
                  }
                >
                  {!isScopeFound ? 'Scope Mismatch' : 'Scope In-Line'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Direct cross-comparison between approved contract baseline and detected promise.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Comparison: Approved Scope Baseline */}
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Approved Scope Baseline
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                      Contract SOW
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {commitment.matchedRequirement
                      ? commitment.matchedRequirement
                      : 'Email & Password Authentication Only (SOW Section 3.1)'}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isScopeFound
                      ? 'This requirement is explicitly authorized and funded under the approved Statement of Work.'
                      : 'Signed SOW strictly limits authentication to standard email/password registration. No third-party OAuth providers (Google, Apple, GitHub) are funded or approved.'}
                  </p>
                </div>

                {/* Right Comparison: Detected Commitment */}
                <div className={`rounded-xl border p-4 space-y-2 ${
                  !isScopeFound
                    ? 'border-red-500/25 bg-red-500/5'
                    : 'border-blue-500/25 bg-blue-500/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      !isScopeFound ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Detected Commitment
                    </span>
                    <Badge className={
                      !isScopeFound
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-bold'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]'
                    }>
                      Meeting Promise
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    {commitment.commitment}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Promised by {commitment.committedBy} during client meeting without recorded change order authorization.
                  </p>
                </div>
              </div>

              {/* The Core Result Banner */}
              <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                !isScopeFound
                  ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                    !isScopeFound ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {!isScopeFound ? <CircleX className="h-5 w-5" strokeWidth={1.8} /> : <CircleCheck className="h-5 w-5" strokeWidth={1.8} />}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      Scope Baseline Verification Result
                    </p>
                    <p className="text-base font-black tracking-tight">
                      {!isScopeFound ? 'NOT FOUND IN APPROVED SCOPE' : 'APPROVED & COVERED IN SOW'}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    Authorization State
                  </p>
                  <p className="text-sm font-extrabold">
                    {isUnauthorized ? 'No approved change request found' : 'Authorized Baseline'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: AI Explanation & Risk Rationale */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} />
                Why CommitCheck Flagged This Commitment
              </CardTitle>
              <CardDescription className="text-xs">
                Automated risk reasoning, contractual exposure, and financial impact assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed text-foreground">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <p className="text-sm leading-relaxed">
                  {commitment.aiExplanation}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Estimated Unbilled Effort
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block">
                      ~16 - 20 Engineering Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Potential Revenue Loss
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400 mt-0.5 block">
                      $2,000 - $2,500 unrecovered
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Recommended Action
                    </span>
                    <span className="font-bold text-primary mt-0.5 block">
                      Create structured Change Request
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Actions, Change Request State, Metadata */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Center Card (PRD Core Section 21) */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">
                Action Center
              </CardTitle>
              <CardDescription className="text-xs">
                Prevent scope creep or resolve the flagged status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Primary Action: Verify Scope (Phase 10) */}
              <Button
                className="w-full justify-center gap-2 font-semibold shadow-xs"
                disabled={verifying}
                onClick={handleVerifyScope}
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                <span>{verifying ? 'Verifying…' : 'Verify Scope'}</span>
              </Button>

              {/* Primary Action: Create Change Request — hidden while an
                  open (pending/clarification) request already exists */}
              {changeRequest && isOpenChangeRequestStatus(changeRequest.status) ? (
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-3 text-xs text-violet-700 dark:text-violet-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CircleCheck className="h-4 w-4" strokeWidth={1.8} /> Change Request Open
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-violet-600 dark:text-violet-400 font-bold text-xs"
                    onClick={() => navigate(`/change-requests/${changeRequest.id}`)}
                  >
                    {changeRequest.changeRequestId}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full justify-center gap-2 font-semibold shadow-xs"
                  onClick={() => setCrDialogOpen(true)}
                >
                  <FilePenLine className="h-4 w-4" strokeWidth={1.8} />
                  <span>Create Change Request</span>
                </Button>
              )}

              {/* Authorization note — the backend does not accept direct
                  authorization writes; approving a CR is the only path */}
              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <span>
                  Commitments become authorized only by approving their change
                  request — there is no manual override. In-scope commitments are
                  authorized automatically by scope verification.
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Linked Change Request Card (if present) */}
          {changeRequest && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Linked Change Request</span>
                  <StatusBadge status={changeRequest.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="font-semibold text-foreground">
                  {changeRequest.title}
                </p>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>ID: {changeRequest.changeRequestId}</span>
                  <span className="max-w-[50%] truncate">{changeRequest.meetingTitle ?? ''}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs mt-2"
                  onClick={() => navigate(`/change-requests/${changeRequest.id}`)}
                >
                  <span>Inspect Change Request</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metadata Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Commitment Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="font-mono font-medium text-foreground">{commitment.id}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Committed By</span>
                <span className="font-medium text-foreground">{commitment.committedBy}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Promised Deadline</span>
                <span className="font-medium text-foreground">{commitment.deadline || 'None'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Detection Date</span>
                <span className="font-medium text-foreground">{formatDate(commitment.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Structured Change Request Modal */}
      <CreateChangeRequestDialog
        commitment={commitment}
        open={crDialogOpen}
        onOpenChange={setCrDialogOpen}
        onCreated={(newCr) => {
          fetchData()
          navigate(`/change-requests/${newCr.id}`)
        }}
      />
    </div>
  )
}
