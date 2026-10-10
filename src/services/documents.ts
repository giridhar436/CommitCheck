/* ——————————————————————————————————————————————————
 * CommitCheck — Documents Service
 *
 * Dual-mode service: mock store for demo, real
 * NestJS backend when VITE_API_MODE=remote.
 * Supports FormData multipart upload for PDFs & contracts.
 * —————————————————————————————————————————————————— */

import type { ProjectDocument } from '@/types'
import { mockDocuments } from '@/mocks/data'
import { isMockMode, apiClient } from '@/services/api/client'
import { endpoints } from '@/services/api/endpoints'

// ——— Helpers ———

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ——— Mock Implementation ———

let documentsStore = [...mockDocuments]

const mockDocumentService = {
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    await delay(200)
    return documentsStore.filter((d) => d.projectId === projectId)
  },

  async upload(
    projectId: string,
    file: File,
    type: ProjectDocument['type'],
  ): Promise<ProjectDocument> {
    await delay(800)
    const newDoc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      projectId,
      name: file.name,
      type,
      processingStatus: 'processed',
      uploadDate: new Date().toISOString(),
      source: 'Uploaded Document',
      size: file.size,
    }
    documentsStore.unshift(newDoc)
    return newDoc
  },

  async delete(id: string): Promise<void> {
    await delay(200)
    documentsStore = documentsStore.filter((d) => d.id !== id)
  },
}

// ——— Remote Implementation ———

const remoteDocumentService = {
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    return apiClient.get<ProjectDocument[]>(endpoints.documents.list(projectId))
  },

  async upload(
    projectId: string,
    file: File,
    type: ProjectDocument['type'],
  ): Promise<ProjectDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    return apiClient.post<ProjectDocument>(
      endpoints.documents.upload(projectId),
      formData,
    )
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(endpoints.documents.delete(id))
  },
}

// ——— Exported Service (mode aware) ———

export const documentService = {
  getAll: (projectId: string) =>
    isMockMode()
      ? mockDocumentService.getAll(projectId)
      : remoteDocumentService.getAll(projectId),
  upload: (projectId: string, file: File, type: ProjectDocument['type']) =>
    isMockMode()
      ? mockDocumentService.upload(projectId, file, type)
      : remoteDocumentService.upload(projectId, file, type),
  delete: (id: string) =>
    isMockMode() ? mockDocumentService.delete(id) : remoteDocumentService.delete(id),
}
