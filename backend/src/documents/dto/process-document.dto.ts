import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST …/documents/:id/process (Phase 13).
 *
 * This deployment extracts text from text-bearing content only: the client
 * supplies the document's authorized text content directly (the repository
 * has no storage I/O — binaries are never fetched, and PDF/OCR parsing is
 * explicitly NOT implemented). Omitting `textContent` reprocesses the
 * document's previously stored text, which makes repeated processing
 * deterministic and idempotent.
 */
export class ProcessDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000, { message: 'textContent must not exceed 2,000,000 characters' })
  textContent?: string;
}
