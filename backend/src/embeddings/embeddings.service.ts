import { Injectable, Logger } from '@nestjs/common';
import {
  EmbeddingConfigError,
  EmbeddingProvider,
} from './embedding-provider';
import { OpenAiEmbeddingProvider } from './openai-embedding-provider';

/** Non-secret status snapshot, safe to expose to clients. */
export interface EmbeddingStatus {
  active: boolean;
  provider: string | null;
  model: string | null;
  /** Why indexing is inactive (null when active). Never contains secrets. */
  reason: string | null;
}

/**
 * Phase 14 — embedding indexing entry point.
 *
 * Configured via environment (documented in .env.example / README):
 *   EMBEDDING_PROVIDER   'openai' (OpenAI-compatible); unset = disabled.
 *   EMBEDDING_API_KEY    Secret. Never logged, never returned.
 *   EMBEDDING_MODEL      Default 'text-embedding-3-small' (1536 dims).
 *   EMBEDDING_BASE_URL   Default 'https://api.openai.com/v1'.
 *   EMBEDDING_TIMEOUT_MS Default 20000.
 *
 * A misconfigured provider is a clean disabled state (with a reason), not a
 * crash — retrieval then runs deterministic lexical ranking, labeled as such.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly provider: EmbeddingProvider | null = null;
  private readonly inactiveReason: string | null;

  constructor() {
    const requested = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() ?? '';
    if (!requested) {
      this.inactiveReason =
        'EMBEDDING_PROVIDER is not configured — semantic indexing disabled; retrieval uses deterministic lexical ranking.';
      return;
    }
    if (requested !== 'openai') {
      this.inactiveReason = `EMBEDDING_PROVIDER "${requested}" is not supported (supported: openai).`;
      return;
    }
    const apiKey = process.env.EMBEDDING_API_KEY ?? '';
    if (!apiKey) {
      this.inactiveReason =
        'EMBEDDING_PROVIDER=openai but EMBEDDING_API_KEY is not set — semantic indexing disabled.';
      return;
    }
    this.provider = new OpenAiEmbeddingProvider({
      apiKey,
      model: process.env.EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
      baseUrl: process.env.EMBEDDING_BASE_URL?.trim().replace(/\/+$/, '') || 'https://api.openai.com/v1',
      timeoutMs: Number(process.env.EMBEDDING_TIMEOUT_MS) || 20_000,
      maxBatchSize: 64,
    });
  }

  get status(): EmbeddingStatus {
    return {
      active: this.provider !== null,
      provider: this.provider?.name ?? null,
      model: this.provider?.model ?? null,
      reason: this.provider ? null : this.inactiveReason,
    };
  }

  get active(): boolean {
    return this.provider !== null;
  }

  get model(): string | null {
    return this.provider?.model ?? null;
  }

  /** Embeds texts through the configured provider (batched internally). */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.provider) {
      throw new EmbeddingConfigError(this.inactiveReason ?? 'Embedding provider not configured');
    }
    return this.provider.embed(texts);
  }

  /** Never throws — wraps indexChunkEmbeddings for fire-and-forget use. */
  async embedQuietly(texts: string[]): Promise<number[][] | null> {
    try {
      return await this.embed(texts);
    } catch (error) {
      // Sanitized by the provider abstraction; safe to log the message.
      this.logger.warn(
        `Embedding provider call failed (chunks left unindexed): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
