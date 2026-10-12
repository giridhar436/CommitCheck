/* ——————————————————————————————————————————————————
 * CommitCheck — Documents Service (Phase 13)
 *
 * Talks to the live NestJS backend nested routes
 * (GET/POST /projects/:projectId/documents,
 *  GET/PATCH/DELETE /projects/:projectId/documents/:id,
 *  POST /projects/:projectId/documents/:id/process).
 *
 * Registration is metadata-only: binaries live out of band
 * in Supabase Storage (same pattern as meeting attachments).
 * Processing is deterministic text normalization over
 * text-bearing content — PDF/OCR extraction is NOT
 * implemented on the backend yet.
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

  /** Deterministic processing. Omit textContent to reprocess stored text
   *  (idempotent); the backend rejects binary-only documents with an
   *  honest "not implemented" error. */
  async process(
    projectId: string,
    id: string,
    textContent?: string,
  ): Promise<ProjectDocument> {
    const envelope = await apiClient.post<BackendEnvelope<BackendDocument>>(
      endpoints.documents.process(projectId, id),
      textContent !== undefined ? { textContent } : {},
    )
    return mapDocument(unwrap(envelope))
  },
}
