import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST …/documents/:id/process (Phase 13/14).
 *
 * Content sources, tried in this order (exactly one of textContent /
 * binaryContent may be supplied):
 *  - `textContent`   — authorized text content for text documents.
 *  - `binaryContent` — base64 of the document's own bytes (PDF/DOCX/text);
 *    parsed with real extractors (pdf.js via pdf-parse, mammoth). Max 10 MB
 *    decoded.
 *  - omitted         — server-side resolution: configured Supabase Storage
 *    download (SUPABASE_STORAGE_URL / _BUCKET / _SERVICE_KEY) when present,
 *    otherwise the document's previously stored text (Phase 13 idempotent
 *    reprocessing).
 *
 * Image/OCR extraction is NOT implemented; unsupported binary formats fail
 * loudly (FAILED + processingError), never COMPLETED.
 */
export class ProcessDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000, { message: 'textContent must not exceed 2,000,000 characters' })
  textContent?: string;

  /** Base64-encoded document bytes (PDF/DOCX/text), max 10 MB decoded. */
  @IsOptional()
  @IsString()
  @MaxLength(14_000_000, { message: 'binaryContent must not exceed 14,000,000 base64 characters' })
  binaryContent?: string;
}
