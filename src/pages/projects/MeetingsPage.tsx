import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Video,
  Sparkles,
  Play,
  ClipboardCheck,
  Users,
  Upload,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  Eye,
  Trash2,
  Lock,
  RotateCcw,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { AnalysisProgressModal } from '@/components/meetings/analysis-progress-modal'
import { MeetingDetailDrawer } from '@/components/meetings/meeting-detail-drawer'
import { projectService } from '@/services/projects'
import { meetingService } from '@/services/meetings'
import { formatDate } from '@/lib/utils'
import type { Project, Meeting, MeetingAnalysisState } from '@/types'

// Demo Scenario pre-fill data
const DEMO_MEETING_DATA = {
  title: 'Sprint 3 Check-in & Checkout Flow Review',
  date: new Date().toISOString().split('T')[0],
  participants: ['Marcus Vance (Client VP)', 'Sarah Chen (Acme PM)', 'Rahul Mehta (Tech Lead)'],
  summary:
    'Walked through Stripe checkout integration and mobile cart responsiveness. Client requested adding Google OAuth login to decrease checkout friction before Friday launch demo. Tech lead tentatively agreed to wire it up by Friday.',
  transcript: `Marcus Vance (09:14): The checkout flow looks solid, but we're worried users will drop off if they have to create a brand new password during checkout. Can we also add Google Login?
Rahul Mehta (09:15): Sure, I'll add it by Friday. It shouldn't take more than a couple of days to wire up the OAuth callbacks.
Sarah Chen (09:16): That would be huge for conversion. Let's make sure it's on staging by Thursday evening if possible.
Rahul Mehta (09:17): Understood, I'll prioritize that right after the webhook testing.`,
}

export function MeetingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState<string[]>([
    'Sarah Chen (Acme PM)',
    'Rahul Mehta (Tech Lead)',
  ])
  const [summary, setSummary] = useState('')
  const [transcript, setTranscript] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary')
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null)
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null)

  // Analysis Progress Modal State
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysisState, setAnalysisState] = useState<MeetingAnalysisState>({
    status: 'idle',
    progress: 0,
    commitments: [],
  })

  // Drawer inspection state
  const [inspectingMeeting, setInspectingMeeting] = useState<Meeting | null>(null)

  // Fetch initial data
  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [proj, meets] = await Promise.all([
        projectService.getById(id),
        meetingService.getAll(id),
      ])
      if (!proj) {
        setError('Project not found')
        return
      }
      setProject(proj)
      setMeetings(meets)
    } catch {
      setError('Failed to load meeting analysis data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Pre-fill demo meeting
  const handleLoadDemoMeeting = () => {
    setTitle(DEMO_MEETING_DATA.title)
    setDate(DEMO_MEETING_DATA.date)
    setParticipants(DEMO_MEETING_DATA.participants)
    setSummary(DEMO_MEETING_DATA.summary)
    setTranscript(DEMO_MEETING_DATA.transcript)
    setUploadedDocName('Sprint_3_Meeting_Notes.docx')
    setUploadedImageName('Slack_Chat_Export_March12.png')
    toast.success('Loaded benchmark demo meeting with Google Login commitment')
  }

  // Clear form
  const handleClearForm = () => {
    setTitle('')
    setDate(new Date().toISOString().split('T')[0])
    setParticipants(['Sarah Chen (Acme PM)', 'Rahul Mehta (Tech Lead)'])
    setSummary('')
    setTranscript('')
    setUploadedDocName(null)
    setUploadedImageName(null)
  }

  // Participant tags
  const handleAddParticipant = () => {
    const trimmed = participantInput.trim()
    if (!trimmed) return
    if (!participants.includes(trimmed)) {
      setParticipants([...participants, trimmed])
      setParticipantInput('')
    }
  }

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  // File upload mocks
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedDocName(file.name)
      toast.success(`Attached document: ${file.name}`)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImageName(file.name)
      toast.success(`Attached screenshot: ${file.name}`)
    }
  }

  // Trigger AI Analysis
  const handleRunAnalysis = async () => {
    if (!id) return
    if (!title.trim()) {
      toast.error('Please enter a meeting title')
      return
    }
    if (!summary.trim() && !transcript.trim()) {
      toast.error('Please provide a meeting summary or transcript to analyze')
      return
    }

    setAnalysisOpen(true)
    setAnalysisState({ status: 'extracting', progress: 10, commitments: [] })

    try {
      const result = await meetingService.analyze(
        id,
        {
          title,
          date,
          participants,
          summary: summary || title,
          transcript: transcript || undefined,
        },
        (progressUpdate) => {
          setAnalysisState((prev) => ({ ...prev, ...progressUpdate }))
        },
      )

      setAnalysisState(result)
      // Refresh meetings list
      const updatedMeetings = await meetingService.getAll(id)
      setMeetings(updatedMeetings)
      toast.success(`Analysis complete: ${result.commitments.length} commitments detected!`)
    } catch {
      toast.error('Meeting analysis failed')
      setAnalysisState((prev) => ({ ...prev, status: 'error', error: 'Analysis failed' }))
    }
  }

  // Delete meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    const ok = await meetingService.delete(meetingId)
    if (ok) {
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
      if (inspectingMeeting?.id === meetingId) {
        setInspectingMeeting(null)
      }
      toast.success('Meeting record deleted')
    }
  }

  if (loading) return <LoadingState message="Loading meeting analysis..." />
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={fetchData} />
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/projects')}>
              Projects
            </span>
            <span>/</span>
            <span
              className="hover:text-foreground cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {project.name}
            </span>
            <span>/</span>
            <span className="text-foreground font-medium">Meeting Analysis</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Meeting Analysis
            </h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
              AI Verification Layer
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Extract commitments and promises made during client calls, then cross-reference them against approved SOW clauses to flag unauthorized scope creep.
          </p>
        </div>

        {/* Quick Demo Pre-fill CTA */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadDemoMeeting}
            className="gap-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-medium text-xs shadow-2xs"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Load Demo Sprint 3 Meeting</span>
          </Button>
        </div>
      </div>

      {/* Project Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* Privacy Guarantee Banner (PRD Requirement 18) */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
        <div className="mt-0.5 rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Zero Ambient Surveillance &bull; Explicit User Authorization Only
            </p>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
              Privacy First
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            CommitCheck <strong>never</strong> records live meetings, runs background microphones, or monitors continuous audio. Only meeting summaries, notes, transcripts, or screenshots you explicitly choose to provide are parsed.
          </p>
        </div>
      </div>

      {/* Main Grid: Form on Left/Center, Recent Meetings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Analyze Meeting Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} />
                    Analyze a Client Meeting
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Submit meeting notes or conversation logs to detect commitments and scope matches.
                  </CardDescription>
                </div>
                {(title || summary || transcript) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearForm}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Meeting Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Meeting Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Sprint 3 Check-in & Checkout Flow Review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Meeting Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Participants</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {participants.length} added
                  </span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add participant (e.g., Sarah Chen, Marcus Vance)..."
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddParticipant()
                      }
                    }}
                    className="text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddParticipant}
                    className="gap-1 text-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {participants.map((person, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-xs text-foreground font-medium"
                      >
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{person}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(idx)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Format Selector: Summary vs Transcript */}
              <div className="space-y-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'transcript')}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-foreground">
                      Meeting Content <span className="text-red-500">*</span>
                    </label>
                    <TabsList className="h-7 p-0.5 bg-muted/60">
                      <TabsTrigger value="summary" className="text-xs px-2.5 py-1 h-6">
                        Summary / Notes
                      </TabsTrigger>
                      <TabsTrigger value="transcript" className="text-xs px-2.5 py-1 h-6">
                        Full Transcript
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="summary" className="m-0 space-y-1.5">
                    <Textarea
                      placeholder="Paste meeting notes, bullet points, client decisions, or executive summaries here..."
                      rows={6}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      CommitCheck identifies action items, promise phrases ("we will deliver", "by Friday"), and feature additions.
                    </p>
                  </TabsContent>

                  <TabsContent value="transcript" className="m-0 space-y-1.5">
                    <Textarea
                      placeholder="Paste conversational audio transcript with speaker names (e.g. Marcus: Can we add Google Login? Rahul: Sure, I'll add it by Friday)..."
                      rows={8}
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="font-mono text-xs leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The AI matches dialogue timestamps and speaker roles to attribute exact promises.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Optional Attachments: Document & Screenshot Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Document Upload */}
                <div className="relative rounded-xl border border-dashed border-border/80 bg-muted/10 p-3 hover:bg-muted/20 transition-all text-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleDocUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {uploadedDocName ? uploadedDocName : 'Attach Document (Optional)'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {uploadedDocName ? 'Attached for analysis' : 'PDF, Word, or Markdown notes'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Screenshot Upload */}
                <div className="relative rounded-xl border border-dashed border-border/80 bg-muted/10 p-3 hover:bg-muted/20 transition-all text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {uploadedImageName ? uploadedImageName : 'Attach Screenshot (Optional)'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {uploadedImageName ? 'Attached for analysis' : 'Slack, Teams, or Zoom chat export'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Submit Action */}
              <div className="flex items-center justify-between pt-2 border-t border-border/70">
                <span className="text-[11px] text-muted-foreground">
                  Ready to verify commitments against {project.name} approved SOW.
                </span>
                <Button
                  onClick={handleRunAnalysis}
                  disabled={!title.trim() || (!summary.trim() && !transcript.trim())}
                  className="gap-2 shadow-sm font-semibold"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                  <span>Analyze Meeting</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Previously Analyzed Meetings */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" strokeWidth={1.8} />
              Analyzed Meetings ({meetings.length})
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              History
            </Badge>
          </div>

          {meetings.length === 0 ? (
            <EmptyState
              title="No meetings analyzed yet"
              description="Analyze a meeting using the form to extract commitments and verify scope."
            />
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="group relative border-border/70 hover:border-border transition-all duration-200 hover:shadow-xs"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(meeting.date)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {meeting.title}
                        </h4>
                      </div>

                      {/* Flag pill */}
                      {meeting.commitmentsDetected > 0 ? (
                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25 text-[10px] shrink-0 font-bold">
                          {meeting.commitmentsDetected} Flagged
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[10px] shrink-0">
                          Clean
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {meeting.summary}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.participants.length} participants
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setInspectingMeeting(meeting)}
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Direct link to Commitments Table */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
              <h4 className="text-xs font-bold text-foreground">Project Commitments Hub</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Track the full inventory of promises, authorization statuses, and change orders extracted across all meetings.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => navigate(`/projects/${project.id}/commitments`)}
            >
              <span>View All Detected Commitments</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis Radar Progress Modal */}
      <AnalysisProgressModal
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        state={analysisState}
        onDone={() => setAnalysisOpen(false)}
        onViewCommitments={() => {
          setAnalysisOpen(false)
          navigate(`/projects/${project.id}/commitments`)
        }}
      />

      {/* Meeting Inspection Drawer */}
      <MeetingDetailDrawer
        meeting={inspectingMeeting}
        onClose={() => setInspectingMeeting(null)}
        onDelete={(mid) => handleDeleteMeeting(mid)}
        onViewCommitments={() => {
          setInspectingMeeting(null)
          navigate(`/projects/${project.id}/commitments`)
        }}
      />
    </div>
  )
}
