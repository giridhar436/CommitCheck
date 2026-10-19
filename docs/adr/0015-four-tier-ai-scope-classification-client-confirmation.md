# 0015. Four-Tier AI Scope Classification and Client Confirmation Loop with Supabase PostgreSQL

## Context
CommitCheck previously extracted meeting tasks without classifying commitment firmness, treating all detected items identically in staging and risking scope bloat from casual brainstorms or AI hallucinations. Furthermore, local development relied on SQLite, which lacks production concurrency and native connection pooling for serverless deployments.

## Decision
1. **Database Migration**: Transition Prisma datasource from SQLite to **Supabase PostgreSQL**, using `DATABASE_URL` (PgBouncer port 6543) for pooled application traffic and `DIRECT_URL` (direct port 5432) for Prisma migrations.
2. **Single-Call Gemini 1.5 Pro Analysis**: Ingest meeting transcripts through a single, comprehensive Gemini prompt that classifies items into:
   - **Explicit Requirements**: Directly agreed deliverables (auto-approved for Linear staging).
   - **Confirmed Commitments**: Mutual promises and milestones with deadlines (auto-approved for Linear staging).
   - **AI-Inferred Requirements**: Suggested baseline technical tasks derived from product goals (held pending client confirmation).
   - **Tentative Requirements**: Casual, speculative, or uncommitted ideas (held pending client confirmation).
3. **Database Caching**: Persist the raw Gemini analysis in `Meeting.analysisJson` to eliminate repeated LLM API calls for the same transcript.
4. **Client Confirmation Loop**:
   - The Freelancer reviews staged items and clicks "Request Client Confirmation".
   - Resend delivers an email to the Client with a secure link to `/client/projects/[id]/scope-confirmation`.
   - The Client reviews itemized cards with supporting transcript evidence and approves or rejects items.
5. **Linear Synchronization Guardrail**:
   - Only Explicit Requirements and Confirmed Commitments are published initially to Linear.
   - Newly client-approved tentative or inferred requirements automatically append to the connected Linear project as an incremental Scope Addendum.
   - Rejected or unconfirmed items strictly remain outside approved scope.

## Consequences
- Prevents unapproved ideas or AI speculation from automatically entering project boards.
- Preserves a verifiable audit trail with transcript quotes and confidence scores for every scope decision.
- Requires Supabase connection credentials in production environments.
