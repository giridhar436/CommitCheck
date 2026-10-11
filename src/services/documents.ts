/* ——————————————————————————————————————————————————
 * CommitCheck — Documents Service
 *
 * ⚠️ LOCAL-ONLY: the backend has no Documents module yet
 * (the Prisma model exists but no controller/service and
 * no storage uploads). Until that module ships, documents
 * run on an in-memory store seeded below.
 * —————————————————————————————————————————————————— */

import type { ProjectDocument } from '@/types'

let documentsStore: ProjectDocument[] = [
  {
    id: 'doc-sow-v1',
    projectId: 'proj-abc-ecommerce',
    name: 'ABC_Ecommerce_Statement_of_Work_Final_v1.2.pdf',
    type: 'sow',
    processingStatus: 'processed',
    uploadDate: '2025-02-01T10:00:00Z',
    source: 'Client SOW Signed Contract',
    size: 2450000,
  },
  {
    id: 'doc-tech-spec',
    projectId: 'proj-abc-ecommerce',
    name: 'Technical_Architecture_and_API_Spec_v1.0.pdf',
    type: 'requirements',
    processingStatus: 'processed',
    uploadDate: '2025-02-03T14:20:00Z',
    source: 'Internal Architecture Spec',
    size: 1820000,
  },
  {
    id: 'doc-scope-matrix',
    projectId: 'proj-abc-ecommerce',
    name: 'Scope_Traceability_Matrix_March2025.pdf',
    type: 'scope',
    processingStatus: 'processed',
    uploadDate: '2025-03-01T09:15:00Z',
    source: 'Sprint 2 Scope Addendum',
    size: 980000,
  },
]

export const documentService = {
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    return documentsStore.filter((d) => d.projectId === projectId)
  },

  async upload(
    projectId: string,
    file: File,
    type: ProjectDocument['type'],
  ): Promise<ProjectDocument> {
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
    documentsStore = documentsStore.filter((d) => d.id !== id)
  },
}
