/**
 * Phase 14 — embedding-provider abstraction.
 *
 * Decouples chunk indexing and query embedding from any specific vendor.
 * A provider is only created when real credentials are configured; there
 * is deliberately NO deterministic "fake embedding" mode — without a
 * provider the system runs with embeddings disabled and retrieval falls
 * back to deterministic lexical ranking (clearly labeled as such).
 *
 * SECURITY: implementations must never log or embed the API key in error
 * messages; provider failures surface sanitized messages only.
 */

export interface EmbeddingProvider {
  /** Short vendor identifier, e.g. 'openai'. */
  readonly name: string;
  /** Model identifier, e.g. 'text-embedding-3-small'. */
  readonly model: string;
  /** Embedding dimensions, if known up front (null until first response). */
  readonly dimensions: number | null;
  /**
   * Embeds a batch of texts. Returns one vector per input, in order.
   * Implementations must validate the response shape and throw
   * EmbeddingProviderError (sanitized) on any failure.
   */
  embed(texts: string[]): Promise<number[][]>;
}

/** Configuration is missing/invalid — a clean, expected state, not a crash. */
export class EmbeddingConfigError extends Error {}

/** A runtime provider failure (HTTP error, timeout, malformed response).
 *  Messages are sanitized: never the API key, headers, or raw body. */
export class EmbeddingProviderError extends Error {}
