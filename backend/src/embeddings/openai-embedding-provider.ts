import {
  EmbeddingProvider,
  EmbeddingProviderError,
} from './embedding-provider';

export interface OpenAiEmbeddingOptions {
  /** Secret — stored on the instance, never logged, never in errors. */
  apiKey: string;
  model: string;
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1. */
  baseUrl: string;
  timeoutMs: number;
  /** Max texts per HTTP call (vendors cap request size). */
  maxBatchSize: number;
}

/**
 * OpenAI-compatible /embeddings client (Phase 14) — works with OpenAI and
 * any vendor exposing the same request/response shape via EMBEDDING_BASE_URL.
 * Batches inputs internally; validates the response shape strictly.
 */
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly model: string;
  dimensions: number | null = null;

  constructor(private readonly options: OpenAiEmbeddingOptions) {
    this.model = options.model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.options.maxBatchSize) {
      out.push(...(await this.embedBatch(texts.slice(i, i + this.options.maxBatchSize))));
    }
    return out;
  }

  private async embedBatch(batch: string[]): Promise<number[][]> {
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: this.options.model, input: batch }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      // Timeouts and network failures only — the Authorization header and
      // request body are deliberately absent from every message.
      const timedOut =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new EmbeddingProviderError(
        timedOut
          ? `Embedding provider timed out after ${this.options.timeoutMs}ms`
          : 'Embedding provider is unreachable (network error)',
      );
    }

    if (!response.ok) {
      // Status code only — response bodies can echo provider internals.
      throw new EmbeddingProviderError(
        `Embedding provider returned HTTP ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new EmbeddingProviderError('Embedding provider returned malformed JSON');
    }

    const data = (payload as { data?: unknown } | null)?.data;
    if (!Array.isArray(data) || data.length !== batch.length) {
      throw new EmbeddingProviderError(
        'Embedding provider response shape invalid (expected data[] matching input length)',
      );
    }

    const vectors: number[][] = [];
    for (const item of data) {
      const embedding = (item as { embedding?: unknown } | null)?.embedding;
      if (
        !Array.isArray(embedding) ||
        embedding.length === 0 ||
        embedding.some((v) => typeof v !== 'number' || !Number.isFinite(v))
      ) {
        throw new EmbeddingProviderError('Embedding provider response shape invalid (embedding[])');
      }
      if (this.dimensions === null) this.dimensions = embedding.length;
      if (embedding.length !== this.dimensions) {
        throw new EmbeddingProviderError('Embedding provider returned inconsistent dimensions');
      }
      vectors.push(embedding);
    }
    return vectors;
  }
}
