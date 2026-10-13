import { Injectable, Logger } from '@nestjs/common';

/**
 * Phase 14 — internal storage-read abstraction for document bytes.
 *
 * Phase 13 documents are metadata-only: binaries are uploaded to Supabase
 * Storage out of band and this backend never saw them. Extraction (Phase 14)
 * needs bytes server-side, so this service downloads a document's OWN object
 * when — and only when — storage access is configured via environment:
 *
 *   SUPABASE_STORAGE_URL           e.g. https://<project>.supabase.co
 *   SUPABASE_STORAGE_BUCKET        bucket that holds projects/<...> keys
 *   SUPABASE_STORAGE_SERVICE_KEY   service-role key — SECRET, server-side only
 *
 * Without those variables the service is inactive (configured === false) and
 * the process pipeline falls back to client-supplied content / stored text.
 *
 * SECURITY invariants (enforced here, tested in the Phase 14 suite):
 *  - Only the storagePath recorded on a validated document row is ever
 *    requested — no client path input reaches this service.
 *  - Paths are re-validated (projects/ prefix, no '..' segments, safe
 *    charset) — arbitrary bucket/path traversal is impossible.
 *  - The service key is never logged, never returned in responses, and
 *    never included in error messages.
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly config: {
    url: string;
    bucket: string;
    serviceKey: string;
  } | null;

  constructor() {
    const url = process.env.SUPABASE_STORAGE_URL?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
    const serviceKey = process.env.SUPABASE_STORAGE_SERVICE_KEY?.trim();
    this.config = url && bucket && serviceKey ? { url, bucket, serviceKey } : null;
  }

  get configured(): boolean {
    return this.config !== null;
  }

  get status(): { configured: boolean; bucket: string | null; reason: string | null } {
    return this.config
      ? { configured: true, bucket: this.config.bucket, reason: null }
      : {
          configured: false,
          bucket: null,
          reason:
            'Server-side storage access is not configured (SUPABASE_STORAGE_URL / SUPABASE_STORAGE_BUCKET / SUPABASE_STORAGE_SERVICE_KEY).',
        };
  }

  /**
   * Downloads the bytes of the given document's own storage object.
   * Throws Error with a sanitized message on any failure.
   */
  async fetchDocumentBytes(document: { storagePath: string }): Promise<Buffer> {
    if (!this.config) {
      throw new Error('Storage access is not configured');
    }
    // Defense in depth — the path was already validated at write time.
    assertStoragePathSafe(document.storagePath);

    const { url, bucket, serviceKey } = this.config;
    // Object keys are path segments after the bucket; encode each segment to
    // keep the URL unambiguous (no traversal can change the host/bucket).
    const encoded = document.storagePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    let response: Response;
    try {
      response = await fetch(`${url}/storage/v1/object/${bucket}/${encoded}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new Error(
        timedOut ? 'Storage download timed out' : 'Storage download failed (network error)',
      );
    }

    if (!response.ok) {
      // Status only — never the Authorization header or response body.
      throw new Error(`Storage download failed (HTTP ${response.status})`);
    }

    // Phase 15 hardening: enforce the same 10 MB decoded ceiling the upload
    // path uses, both via Content-Length (reject before buffering) and on the
    // buffered size (in case the storage host lies about or omits the header).
    const contentLength = Number(response.headers.get('content-length') ?? '');
    if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(
        `Storage object exceeds the ${MAX_DOWNLOAD_BYTES / (1024 * 1024)} MB download limit`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_DOWNLOAD_BYTES) {
      throw new Error(
        `Storage object exceeds the ${MAX_DOWNLOAD_BYTES / (1024 * 1024)} MB download limit`,
      );
    }
    return bytes;
  }
}

/** Must match the document pipeline's MAX_BINARY_BYTES (10 MB decoded). */
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Storage-key validation shared by write paths (documents create/update) and
 * the storage reader: keys live under projects/, use a safe charset, and can
 * never traverse upward.
 */
export function assertStoragePathSafe(storagePath: string): void {
  if (!storagePath.startsWith('projects/')) {
    throw new Error('storagePath must begin with projects/');
  }
  if (storagePath.includes('..') || storagePath.includes('//')) {
    throw new Error('storagePath must not contain path-traversal segments');
  }
  if (!/^projects\/[A-Za-z0-9._\-/]+$/.test(storagePath)) {
    throw new Error('storagePath contains unsupported characters');
  }
}
