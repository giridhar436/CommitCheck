import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  FileCheck2,
  Loader2,
  Trash2,
  Clock,
  CircleCheck,
  CircleX,
  File,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ApiError } from '@/services/api/client'
import type {
  Project,
  ProjectDocument,
  DocumentType,
  DocumentProcessingStatus,
} from '@/types'

/* ——— Helpers ——— */

const documentTypeLabels: Record<DocumentType, string> = {
  SOW: 'Statement of Work',
  REQUIREMENTS: 'Requirements Spec',
  CONTRACT: 'Contract',
  PROPOSAL: 'Proposal',
  OTHER: 'Other',
}

const documentTypeIcons: Record<DocumentType, React.ElementType> = {
  SOW: FileCheck2,
  REQUIREMENTS: FileSpreadsheet,
  CONTRACT: FileText,
  PROPOSAL: File,
  OTHER: FileText,
}

const processingStatusConfig: Record<
  DocumentProcessingStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-slate-500/12 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  COMPLETED: {
    label: 'Processed',
    icon: CircleCheck,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  FAILED: {
    label: 'Failed',
    icon: CircleX,
    className: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20',
  },
}

/** Content the deterministic processor can actually extract. */
const TEXT_EXTENSIONS = /\.(txt|md|csv)$/i
/** Stay safely under the backend's 100KB JSON body limit. */
const MAX_TEXT_CHARS = 64_000

function isTextExtractable(fileName: string): boolean {
  return TEXT_EXTENSIONS.test(fileName)
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
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
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [uploadType, setUploadType] = useState<DocumentType>('SOW')
  const [dragOver, setDragOver] = useState(false)
  // Detail dialog (extracted text + linked requirements)
  const [viewDoc, setViewDoc] = useState<ProjectDocument | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewText, setViewText] = useState<string | null>(null)
  const [viewCharCount, setViewCharCount] = useState(0)

  const loadDocuments = (projectId: string) =>
    documentService.getAll(projectId).then(setDocuments)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([projectService.getById(id), loadDocuments(id)])
      .then(([proj]) => {
        setProject(proj)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  /* ——— Upload ——— */

  const processUpload = async (file: File) => {
    if (!id) return

    // 10MB registration cap (metadata only — the binary never leaves the browser)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum file size is 10MB.')
      return
    }

    setUploading(true)
    try {
      // Registration is metadata-only: the backend records title/type/size
      // and a storage key; binaries live out of band in Supabase Storage.
      let doc = await documentService.create(id, {
        title: file.name,
        type: uploadType,
        storagePath: `projects/${id}/docs/${Date.now()}-${file.name}`,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      })

      if (isTextExtractable(file.name)) {
        const text = await file.text()
        if (text.length > MAX_TEXT_CHARS) {
          toast.warning(
                            `"${file.name}" registered. Text exceeds the ${Math.round(MAX_TEXT_CHARS / 1000)}KB processing limit — no extraction was attempted.`,
          )
        } else {
          // Text files process end-to-end for real
          doc = await documentService.process(id, doc.id, text)
          toast.success(
            doc.processingStatus === 'COMPLETED'
              ? `"${file.name}" uploaded and text extracted (${doc.processedAt ? 'done' : 'pending'}).`
              : `"${file.name}" uploaded — text extraction failed (see the document row).`,
          )
        }
      } else {
        toast.info(
          `"${file.name}" registered as metadata. PDF/DOC text extraction is not implemented — text files (.txt, .md, .csv) process end-to-end.`,
        )
      }

      setDocuments((prev) => [doc, ...prev])
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to register document.'))
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

  /* ——— Row actions ——— */

  const handleProcess = async (doc: ProjectDocument) => {
    if (!id) return
    setProcessingId(doc.id)
    try {
      // No body → reprocess the stored text (idempotent). Binary-only
      // documents get an honest backend error, surfaced verbatim.
      const updated = await documentService.process(id, doc.id)
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      toast.success(
        updated.processingStatus === 'COMPLETED'
          ? `"${doc.title}" processed — text extracted.`
          : `"${doc.title}" processed with no extractable text — marked failed.`,
      )
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Processing failed.'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleView = async (doc: ProjectDocument) => {
    if (!id) return
    setViewDoc(doc)
    setViewLoading(true)
    setViewText(null)
    try {
      const detail = await documentService.getDetail(id, doc.id)
      setViewText(detail.extractedText?.content ?? null)
      setViewCharCount(detail.extractedText?.charCount ?? 0)
    } catch {
      toast.error('Failed to load document details.')
      setViewDoc(null)
    } finally {
      setViewLoading(false)
    }
  }

  const handleDelete = async (doc: ProjectDocument) => {
    if (!id) return
    try {
      await documentService.remove(id, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success(`"${doc.title}" removed.`)
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

  const processedCount = documents.filter((d) => d.processingStatus === 'COMPLETED').length

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
            Register SOW contracts, requirement specs, proposals, and scope documents. Text
            documents process end-to-end; the extracted text is stored per project.
          </p>
        </div>
      </div>

      {/* Sub-Navigation */}
      <ProjectNavTabs projectId={project.id} />

      {/* Upload Area */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" strokeWidth={1.8} />
            Register Scope Document
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
                <SelectItem value="SOW" className="text-xs">Statement of Work (SOW)</SelectItem>
                <SelectItem value="REQUIREMENTS" className="text-xs">Requirements Spec</SelectItem>
                <SelectItem value="CONTRACT" className="text-xs">Contract</SelectItem>
                <SelectItem value="PROPOSAL" className="text-xs">Proposal</SelectItem>
                <SelectItem value="OTHER" className="text-xs">Other</SelectItem>
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
              accept=".pdf,.doc,.docx,.txt,.csv,.md"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              {uploading ? (
                <>
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Registering document…</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Text files are extracted immediately
                  </p>
                </>
              ) : (
                <>
                  <div className={cn(
                    'rounded-full p-3 mb-3 transition-colors',
                    dragOver ? 'bg-primary/20' : 'bg-muted/50 group-hover:bg-primary/10',
                  )}>
                    <Upload
                      className={cn(
                        'h-6 w-6 transition-colors',
                        dragOver ? 'text-primary' : 'text-muted-foreground group-hover:text-primary',
                      )}
                      strokeWidth={1.8}
                    />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {dragOver ? 'Drop file here' : 'Drop a file here or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    TXT, MD, CSV process end-to-end — PDF, DOC, DOCX register as metadata
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
                title="No Documents Registered"
                description="Register SOW contracts, requirement specs, or scope documents. Text documents are processed deterministically and their content is stored per project."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {documents.map((doc) => {
                const TypeIcon = documentTypeIcons[doc.type]
                const processing = processingStatusConfig[doc.processingStatus]
                const ProcessingIcon = processing.icon
                const isProcessingThis = processingId === doc.id

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
                          {doc.title}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 bg-muted/30">
                          {documentTypeLabels[doc.type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.uploadedAt)}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                      </div>
                      {doc.processingStatus === 'FAILED' && doc.processingError && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 leading-relaxed">
                          {doc.processingError}
                        </p>
                      )}
                    </div>

                    {/* Processing Status */}
                    <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 gap-1 border shrink-0', processing.className)}>
                      <ProcessingIcon className={cn('h-3 w-3', isProcessingThis && 'animate-spin')} strokeWidth={1.8} />
                      {isProcessingThis ? 'Processing' : processing.label}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              onClick={() => handleView(doc)}
                              disabled={doc.processingStatus !== 'COMPLETED' || isProcessingThis}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">View extracted text</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              onClick={() => handleProcess(doc)}
                              disabled={isProcessingThis}
                            >
                              <RefreshCw className={cn('h-3.5 w-3.5', isProcessingThis && 'animate-spin')} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Process / reprocess text</TooltipContent>
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

      {/* Honest capability note — replaces the old fabricated "backend
          extracts requirements automatically" copy */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2 shrink-0">
          <Info className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Current processing capabilities
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Registration is metadata-only — binaries stay in storage and are never uploaded
            through this app. Text documents (.txt, .md, .csv, up to {Math.round(MAX_TEXT_CHARS / 1000)}KB)
            are processed deterministically: normalized text is stored with the document and
            survives reprocessing unchanged. PDF, DOC/DOCX, and image (OCR) text extraction is
            <span className="font-semibold text-foreground"> not implemented</span>; requirement
            auto-population from documents is also not implemented — link documents to scope
            requirements manually.
          </p>
        </div>
      </div>

      {/* Extracted-text detail dialog */}
      <Dialog open={viewDoc !== null} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {viewDoc?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewText !== null
                ? `Extracted text — ${viewCharCount.toLocaleString()} characters (normalized deterministically)`
                : 'Loading extracted text…'}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <pre className="flex-1 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-foreground">
              {viewText}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
