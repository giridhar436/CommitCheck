/* ——————————————————————————————————————————————————
 * CommitCheck — Documents Service (Phase 13/14)
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/documents,
 *  GET/PATCH/DELETE /projects/:projectId/documents/:id,
 *  POST /projects/:projectId/documents/:id/process).
 *
 * Registration is metadata-only; processing accepts either
 * `textContent` (text documents) or `binaryContent` — the
 * base64 of a real PDF/DOCX/text file (≤10MB decoded),
 * parsed server-side with pdf-parse/mammoth. Images/OCR
 * are not implemented and fail with an honest error.
 * —————————————————————————————————————————————————— */

import type { ProjectDocument } from '@/types'
import { apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'
import {
  mapDocument,
  mapDocumentDetail,
  unwrap,
  unwrapList,
  type BackendDocument,
  type BackendDocumentDetail,
  type BackendEnvelope,
  type BackendPaginated,
} from '@/services/api/adapters'

export interface DocumentCreateInput {
  title: string
  type: ProjectDocument['type']
  storagePath: string
  fileSize?: number
  uploadedAt?: string
}

export type DocumentUpdateInput = Partial<DocumentCreateInput>

export const documentService = {
  /** Full document list for a project (flat limit-100 convention). */
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    const envelope = await apiClient.get<
      BackendEnvelope<BackendPaginated<BackendDocument>>
    >(endpoints.documents.list(projectId), { params: { limit: 100 } })
    return unwrapList(envelope).map(mapDocument)
  },

  /** Detail incl. extracted text + linked scope requirements. */
  async getDetail(projectId: string, id: string): Promise<ProjectDocument & {
    extractedText: ReturnType<typeof mapDocumentDetail>['extractedText']
    sourceRequirements: ReturnType<typeof mapDocumentDetail>['sourceRequirements']
  }> {
    const envelope = await apiClient.get<BackendEnvelope<BackendDocumentDetail>>(
      endpoints.documents.detail(projectId, id),
    )
    return mapDocumentDetail(unwrap(envelope))
  },

  /** Registers document metadata (no binary upload — storage is out of band). */
  async create(projectId: string, data: DocumentCreateInput): Promise<ProjectDocument> {
    const envelope = await apiClient.post<BackendEnvelope<BackendDocument>>(
      endpoints.documents.create(projectId),
      data,
    )
    return mapDocument(unwrap(envelope))
  },

  async update(
    projectId: string,
    id: string,
    data: DocumentUpdateInput,
  ): Promise<ProjectDocument> {
    const envelope = await apiClient.patch<BackendEnvelope<BackendDocument>>(
      endpoints.documents.update(projectId, id),
      data,
    )
    return mapDocument(unwrap(envelope))
  },

  async remove(projectId: string, id: string): Promise<void> {
    await apiClient.delete<BackendEnvelope<null>>(
      endpoints.documents.delete(projectId, id),
    )
  },

  /** Deterministic processing. Provide `textContent` (text documents) or
   *  `binaryContent` (base64 of a PDF/DOCX/text file); omit both to reprocess
   *  the stored text (idempotent). The backend rejects unsupported binaries
   *  with an honest error instead of a fake extract. */
  async process(
    projectId: string,
    id: string,
    content?: { textContent?: string; binaryContent?: string },
  ): Promise<ProjectDocument> {
    const envelope = await apiClient.post<BackendEnvelope<BackendDocument>>(
      endpoints.documents.process(projectId, id),
      content ?? {},
    )
    return mapDocument(unwrap(envelope))
  },
}
