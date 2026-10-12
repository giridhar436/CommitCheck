import { createHash } from 'node:crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Phase 14 — real document text extraction.
 *
 * Supported binary formats (parsed with real libraries — never decoded as
 * raw UTF-8):
 *  - PDF  via pdf-parse (bundled pdf.js text extraction)
 *  - DOCX via mammoth (raw text extraction; validates the OOXML content)
 * Plain text is carried through as UTF-8. Everything else (images, legacy
 * .doc, spreadsheets) fails loudly — OCR is NOT implemented.
 *
 * All extraction is a pure function of the input bytes: identical input
 * yields identical text, so reprocessing is deterministic.
 */

export class UnsupportedDocumentFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedDocumentFormatError';
  }
}

/** Human-readable format names reported in processing errors/audit entries. */
export type ExtractedFormat = 'TEXT' | 'PDF' | 'DOCX';

/** Format sniffing by magic bytes — extensions are untrusted. */
export function detectBinaryFormat(bytes: Buffer): 'PDF' | 'DOCX' | 'UNKNOWN' {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'PDF';
  }
  // ZIP local-file-header magic (DOCX is a ZIP container; mammoth validates
  // the OOXML payload and throws on unrelated zips).
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  ) {
    return 'DOCX';
  }
  return 'UNKNOWN';
}

/** Extracts raw text from document bytes. Throws UnsupportedDocumentFormatError
 *  for formats we honestly cannot parse. */
export async function extractTextFromBinary(
  bytes: Buffer,
): Promise<{ text: string; format: ExtractedFormat }> {
  const format = detectBinaryFormat(bytes);

  if (format === 'PDF') {
    // pdf-parse's bundled pdf.js (v1.10.100) resolves xref offsets against
    // the underlying ArrayBuffer, not the view — Node's pooled Buffers
    // (byteOffset > 0) then shift every offset and parsing fails with
    // "bad XRef entry". Hand it a standalone Uint8Array copy.
    const result = await pdfParse(new Uint8Array(bytes) as unknown as Buffer);
    return { text: result.text, format: 'PDF' };
  }

  if (format === 'DOCX') {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return { text: result.value, format: 'DOCX' };
  }

  // Not a known container: allow UTF-8 text (e.g. a client that streams a
  // .txt through the binary path), reject anything binary.
  if (bytes.includes(0)) {
    throw new UnsupportedDocumentFormatError(
      'Unsupported document format — supported: PDF, DOCX, plain text. Image/OCR extraction is not implemented.',
    );
  }
  return { text: bytes.toString('utf8'), format: 'TEXT' };
}

/** Content identity used to reuse embeddings for unchanged chunks. */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
