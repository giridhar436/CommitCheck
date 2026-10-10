import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  FileCheck2,
  FileWarning,
  Loader2,
  Trash2,
  Download,
  Clock,
  HardDriveUpload,
  CheckCircle2,
  XCircle,
  File,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { projectService } from '@/services/projects'
import { documentService } from '@/services/documents'
import type { Project, ProjectDocument, DocumentType, DocumentProcessingStatus } from '@/types'

/* ——— Helpers ——— */

const documentTypeLabels: Record<DocumentType, string> = {
  sow: 'Statement of Work',
  requirements: 'Requirements Spec',
  contract: 'Contract',
  proposal: 'Proposal',
  scope: 'Scope Document',
}

const documentTypeIcons: Record<DocumentType, React.ElementType> = {
  sow: FileCheck2,
  requirements: FileSpreadsheet,
  contract: FileText,
  proposal: File,
  scope: FileText,
}

const processingStatusConfig: Record<
  DocumentProcessingStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  uploading: {
    label: 'Uploading',
    icon: HardDriveUpload,
    className: 'bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  processed: {
    label: 'Processed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20',
  },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ——— Documents Page ——— */

export function DocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<DocumentType>('sow')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([projectService.getById(id), documentService.getAll(id)]).then(
      ([proj, docs]) => {
        setProject(proj)
        setDocuments(docs)
        setLoading(false)
      },
    )
  }, [id])

  /* ——— Upload Handlers ——— */

  const processUpload = async (file: File) => {
    if (!id) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ]
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) {
      toast.error('Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum file size is 10MB.')
      return
    }

    setUploading(true)
    try {
      const doc = await documentService.upload(id, file, uploadType)
      setDocuments((prev) => [doc, ...prev])
      toast.success(`"${file.name}" uploaded successfully! Backend processing will extract scope requirements.`)
    } catch {
      toast.error('Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processUpload(file)
  }

  const handleDelete = async (doc: ProjectDocument) => {
    try {
      await documentService.delete(doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success(`"${doc.name}" removed.`)
    } catch {
      toast.error('Failed to delete document.')
    }
  }

  /* ——— Loading / Error ——— */

  if (loading) return <LoadingState message="Loading project documents…" />

  if (!project) {
    return (
      <ErrorState
        title="Project Not Found"
        message="The requested client project could not be located."
        action={
          <Button onClick={() => navigate('/projects')} size="sm">
            Back to Projects
          </Button>
        }
      />
    )
  }

  const processedCount = documents.filter((d) => d.processingStatus === 'processed').length

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Upload SOW contracts, requirement specs, proposals, and scope documents. The backend
            will extract approved requirements automatically.
          </p>
        </div>
      </div>

      {/* Sub-Navigation */}
      <ProjectNavTabs projectId={project.id} />

      {/* Upload Area */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload Scope Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground">Document Type:</span>
            <Select value={uploadType} onValueChange={(val: DocumentType) => setUploadType(val)}>
              <SelectTrigger className="w-[200px] text-xs h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sow" className="text-xs">Statement of Work (SOW)</SelectItem>
                <SelectItem value="requirements" className="text-xs">Requirements Spec</SelectItem>
                <SelectItem value="contract" className="text-xs">Contract</SelectItem>
                <SelectItem value="proposal" className="text-xs">Proposal</SelectItem>
                <SelectItem value="scope" className="text-xs">Scope Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group',
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/60 hover:border-primary/50 hover:bg-muted/20',
              uploading && 'pointer-events-none opacity-60',
            )}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              {uploading ? (
                <>
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Uploading document…</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Processing will begin automatically
                  </p>
                </>
              ) : (
                <>
                  <div className={cn(
                    'rounded-full p-3 mb-3 transition-colors',
                    dragOver ? 'bg-primary/20' : 'bg-muted/50 group-hover:bg-primary/10',
                  )}>
                    <Upload className={cn(
                      'h-6 w-6 transition-colors',
                      dragOver ? 'text-primary' : 'text-muted-foreground group-hover:text-primary',
                    )} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {dragOver ? 'Drop file here' : 'Drop a file here or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, TXT — Maximum 10MB
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-2">
                    The backend will extract requirements and scope definitions from uploaded documents.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-0 px-0 pt-0">
          <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Project Documents ({documents.length})
            </span>
            <span className="text-[10px] text-muted-foreground">
              {processedCount} of {documents.length} processed
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Documents Uploaded"
                description="Upload SOW contracts, requirement specs, or scope documents. The system will extract approved requirements automatically."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {documents.map((doc) => {
                const TypeIcon = documentTypeIcons[doc.type]
                const processing = processingStatusConfig[doc.processingStatus]
                const ProcessingIcon = processing.icon

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
                  >
                    {/* File Icon */}
                    <div className="shrink-0 rounded-lg bg-muted/50 p-2.5 border border-border/40">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {doc.name}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 bg-muted/30">
                          {documentTypeLabels[doc.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.uploadDate)}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                        {doc.source && (
                          <>
                            <span>•</span>
                            <span className="truncate">{doc.source}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Processing Status */}
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 gap-1 border shrink-0', processing.className)}>
                      <ProcessingIcon className={cn('h-3 w-3', doc.processingStatus === 'processing' && 'animate-spin')} />
                      {processing.label}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => toast.info('Document preview — handled by backend.')}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Download</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backend Processing Note */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2 shrink-0">
          <FileWarning className="h-4 w-4 text-amber-500" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Backend Document Processing
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            PDF extraction, OCR, and requirement extraction are handled by the NestJS backend.
            Uploaded documents are queued for AI processing which automatically populates the
            project's approved scope requirements.
          </p>
        </div>
      </div>
    </div>
  )
}
