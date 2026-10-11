/* ————————————————————————————————————————————————————————————————
 * ScopeVerification — deterministic scope matcher (Phase 10)
 *
 * Lexical, DB-backed matching between a commitment's text and the
 * project's ScopeRequirement records. Purely rule-based on purpose:
 * the same inputs must always produce the same outcome (no LLM, no
 * pgvector, no embeddings — see README "MVP matcher limitations").
 *
 * Matching model:
 *  - Both texts are normalized into lowercase word tokens
 *    (punctuation-split, stop-words removed, naive singularization).
 *  - For every requirement we compute two coverage views:
 *      titleScore = share of the requirement's TITLE tokens that also
 *                   appear in the commitment text
 *      fullScore  = share of the requirement's full-text tokens
 *                   (title + description) that appear in the commitment
 *    and take score = max(titleScore, fullScore).
 *  - MATCHED   — the commitment covers the requirement: either every
 *                meaningful title token is present (titleScore = 1) or
 *                the full-text coverage is high (>= FULL_MATCH_SCORE)
 *                with at least MIN_MATCH_SHARED_TOKENS shared tokens.
 *  - AMBIGUOUS — some meaningful overlap (score >= AMBIGUOUS_SCORE) but
 *                not enough to call it covered; needs human review.
 *  - NOT_MATCHED — no meaningful lexical overlap.
 * ———————————————————————————————————————————————————————————————— */

/** Pure function words that carry no scope meaning. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'so', 'such',
  'for', 'to', 'of', 'in', 'on', 'with', 'by', 'at', 'from', 'as', 'into',
  'onto', 'about', 'between', 'during', 'after', 'before', 'when', 'while',
  'is', 'are', 'be', 'been', 'was', 'were', 'am',
  'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  'do', 'does', 'did', 'done', 'doing', 'have', 'has', 'had', 'having',
  'we', 'our', 'us', 'you', 'your', 'they', 'their', 'them', 'it', 'its',
  'i', 'me', 'my', 'he', 'she', 'his', 'her', 'him',
  'this', 'that', 'these', 'those', 'there', 'here',
  'not', 'no', 'yes', 'nor',
  'all', 'any', 'some', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'only', 'own', 'same', 'too', 'very', 'just', 'also',
  'per', 'via', 'up', 'down', 'out', 'over', 'under', 'again',
  'including', 'include', 'includes', 'included',
]);

/** Minimum full-text coverage to call a requirement covered. */
export const FULL_MATCH_SCORE = 0.6;
/** Minimum score (either view) to treat a match as ambiguous rather than absent. */
export const AMBIGUOUS_SCORE = 0.3;
/** Minimum shared tokens for a MATCHED verdict (guards against one lucky word). */
export const MIN_MATCH_SHARED_TOKENS = 2;

export type ScopeMatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'NOT_MATCHED';

/** Minimal shape of a scope requirement the matcher needs. */
export interface ScopeCandidate {
  id: string;
  title: string;
  description?: string | null;
}

export interface ScopeMatchOutcome {
  status: ScopeMatchStatus;
  /** Best-scoring requirement, or null when nothing overlaps at all. */
  requirement: ScopeCandidate | null;
  /** max(titleScore, fullScore) of the chosen requirement, 0 when none. */
  score: number;
  /** Normalized tokens shared by the commitment and the chosen requirement. */
  sharedTokens: string[];
}

/** Lowercase, punctuation-split, stop-word-filtered, singularized tokens. */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    tokens.push(singularize(raw));
  }
  return tokens;
}

/**
 * Naive deterministic singularization — good enough for lexical scope
 * matching, never a real stemmer ("transfers"→"transfer",
 * "deliveries"→"delivery", "analytics"→"analytic", "status" unchanged).
 */
function singularize(token: string): string {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (
    token.endsWith('es') &&
    token.length > 3 &&
    /(ses|xes|zes|ches|shes)$/.test(token)
  ) {
    return token.slice(0, -2);
  }
  if (
    token.endsWith('s') &&
    token.length > 3 &&
    !token.endsWith('ss') &&
    !token.endsWith('us')
  ) {
    return token.slice(0, -1);
  }
  return token;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

/**
 * Compare a commitment's text against one requirement.
 * Internal helper — exported for tests.
 */
export function scoreRequirement(
  commitmentTokens: Set<string>,
  requirement: ScopeCandidate,
): { titleScore: number; fullScore: number; shared: string[] } {
  const titleTokens = new Set(tokenize(requirement.title));
  const fullTokens = new Set([
    ...tokenize(requirement.title),
    ...tokenize(requirement.description ?? ''),
  ]);

  const titleShared = intersectionSize(commitmentTokens, titleTokens);
  const fullShared = intersectionSize(commitmentTokens, fullTokens);
  const titleScore = titleTokens.size ? titleShared / titleTokens.size : 0;
  const fullScore = fullTokens.size ? fullShared / fullTokens.size : 0;

  const shared = [...commitmentTokens]
    .filter((t) => fullTokens.has(t))
    .sort();

  return { titleScore, fullScore, shared };
}

/**
 * Deterministically pick the best requirement for a commitment.
 * Candidates are ranked: MATCHED before AMBIGUOUS before NOT_MATCHED,
 * then by score, then by id — so equal inputs always yield the same pick.
 */
export function matchScope(
  commitmentText: string,
  requirements: ScopeCandidate[],
): ScopeMatchOutcome {
  const commitmentTokens = new Set(tokenize(commitmentText));

  let best: (ScopeMatchOutcome & { rank: number }) | null = null;

  for (const requirement of requirements) {
    const { titleScore, fullScore, shared } = scoreRequirement(
      commitmentTokens,
      requirement,
    );
    const score = Math.max(titleScore, fullScore);

    let status: ScopeMatchStatus;
    if (
      (titleScore === 1 || fullScore >= FULL_MATCH_SCORE) &&
      shared.length >= MIN_MATCH_SHARED_TOKENS
    ) {
      status = 'MATCHED';
    } else if (score >= AMBIGUOUS_SCORE && shared.length >= 1) {
      status = 'AMBIGUOUS';
    } else {
      status = 'NOT_MATCHED';
    }
    const rank = status === 'MATCHED' ? 0 : status === 'AMBIGUOUS' ? 1 : 2;

    if (
      !best ||
      rank < best.rank ||
      (rank === best.rank &&
        (score > best.score ||
          (score === best.score && requirement.id < best.requirement!.id)))
    ) {
      best = { status, requirement, score, sharedTokens: shared, rank };
    }
  }

  if (!best) {
    return { status: 'NOT_MATCHED', requirement: null, score: 0, sharedTokens: [] };
  }
  return {
    status: best.status,
    requirement: best.requirement,
    score: best.score,
    sharedTokens: best.sharedTokens,
  };
}
