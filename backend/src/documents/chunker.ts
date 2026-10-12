import { sha256Hex } from './text-extraction';

/**
 * Phase 14 — deterministic document chunking.
 *
 * Strategy (documented, deliberately simple):
 *   1. Split the normalized text into paragraphs at blank-line runs (\n{2,}).
 *   2. Pack paragraphs sequentially into chunks of at most CHUNK_SIZE chars.
 *   3. A paragraph longer than CHUNK_SIZE is split at word/line boundaries
 *      (hard character cut only as a last resort).
 *
 * The output is a pure function of the input: identical text always yields
 * identical chunks with identical indices and char offsets. charStart is
 * inclusive, charEnd exclusive — offsets point into the document's
 * normalized DocumentText content. No tokenization, no overlap.
 */

export const CHUNK_SIZE = 1200;

export interface ChunkPlan {
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  contentHash: string;
}

interface Piece {
  start: number;
  end: number;
}

/** Splits [from, to) at the last whitespace before the size limit. */
function splitOversized(text: string, from: number, to: number): Piece[] {
  const pieces: Piece[] = [];
  let start = from;
  while (to - start > CHUNK_SIZE) {
    const limit = start + CHUNK_SIZE;
    const window = text.slice(start, limit);
    const cut = Math.max(window.lastIndexOf(' '), window.lastIndexOf('\n'));
    const end = cut > CHUNK_SIZE / 2 ? start + cut + 1 : limit;
    pieces.push({ start, end });
    start = end;
  }
  if (to > start) pieces.push({ start, end: to });
  return pieces;
}

/** Builds the deterministic chunk plan for normalized text. */
export function buildChunks(text: string): ChunkPlan[] {
  if (!text) return [];

  // Paragraph boundaries — pieces are exact [start, end) slices of `text`.
  const pieces: Piece[] = [];
  let pos = 0;
  for (const match of text.matchAll(/\n{2,}/g)) {
    const end = match.index;
    if (end > pos) {
      pieces.push(...(end - pos <= CHUNK_SIZE ? [{ start: pos, end }] : splitOversized(text, pos, end)));
    }
    pos = end + match[0].length;
  }
  if (text.length > pos) {
    pieces.push(
      ...(text.length - pos <= CHUNK_SIZE
        ? [{ start: pos, end: text.length }]
        : splitOversized(text, pos, text.length)),
    );
  }
  if (pieces.length === 0) return [];

  // Pack pieces left-to-right; a piece never crosses a chunk boundary.
  const ranges: Piece[] = [];
  let current: Piece | null = null;
  for (const piece of pieces) {
    if (current === null) {
      current = { ...piece };
    } else if (piece.end - current.start <= CHUNK_SIZE) {
      current.end = piece.end;
    } else {
      ranges.push(current);
      current = { ...piece };
    }
  }
  if (current) ranges.push(current);

  return ranges.map(({ start, end }, chunkIndex) => {
    const chunkText = text.slice(start, end);
    return {
      chunkIndex,
      text: chunkText,
      charStart: start,
      charEnd: end,
      contentHash: sha256Hex(chunkText),
    };
  });
}
