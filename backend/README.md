# CommitCheck — Backend (Phase 1: Database Foundation)

NestJS + Prisma + Supabase PostgreSQL backend for CommitCheck — the AI-powered
scope-creep detector for agencies and freelancers.

**Phase 1 scope:** database schema, migrations, seed data, and the Prisma
database layer. No controllers, routes, auth, or AI yet.

## Stack

| Layer      | Technology                 |
| ---------- | -------------------------- |
| Framework  | NestJS 11 (Node 20+)       |
| ORM        | Prisma 6                   |
| Database   | Supabase PostgreSQL (pgvector-ready) |
| Storage    | Supabase Storage (later phase) |
| Auth       | Supabase Auth (last phase) |

## Getting started

```bash
npm install

# 1. Copy .env.example → .env and paste your Supabase connection strings
#    (Dashboard → Project Settings → Database → Connection string)

# 2. Apply migrations + seed demo data (against Supabase or any Postgres)
npm run db:setup

# 3. Start the API skeleton (Prisma layer only — no endpoints yet)
npm run start:dev
```

### Environment variables

| Variable      | Used for                                            |
| ------------- | --------------------------------------------------- |
| `DATABASE_URL`  | Runtime connections — use the **pooled** Supabase URL (port `6543`, `pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL`    | Prisma Migrate only — use the **direct** Supabase URL (port `5432`) |
| `PORT`          | HTTP port (default `3000`) |

The pooled/direct split is required: Prisma Migrate needs DDL and shadow-database
privileges that Supabase's pgbouncer transaction pool does not allow.

## Scripts

| Script                 | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run build`        | Production build (`nest build`)           |
| `npm run start:dev`    | Watch-mode dev server                     |
| `npm run db:migrate`   | Apply pending migrations (`migrate deploy`) |
| `npm run db:migrate:dev` | Create/apply a dev migration            |
| `npm run db:seed`      | Seed demo data (idempotent: clears first) |
| `npm run db:setup`     | Migrate + seed                            |
| `npm run db:reset`     | Drop + recreate + reseed the database     |
| `npm run prisma:studio`| Browse data in Prisma Studio              |

## Folder structure

```
backend/
├── prisma/
│   ├── migrations/
│   │   ├── 20261011000000_init/                 # Initial schema (tables, enums, FKs, indexes)
│   │   ├── …20261011000006_add_evidence_activity_actions/
│   │   ├── 20261011000007_add_commitment_verified_action/
│   │   └── 20261011000008_add_change_request_workflow_fields/  # CLARIFICATION_REQUESTED + audit action + clarification_comment
│   ├── schema.prisma                # 9 models · 10 enums · full relation graph
│   └── seed.ts                      # Interconnected demo data (2 projects)
├── src/
│   ├── common/
│   │   ├── api-response.ts          # Success/error envelope types
│   │   ├── dto/pagination.dto.ts    # Reusable page/limit/search/sort query
│   │   └── filters/http-exception.filter.ts  # Global { success:false } envelope
│   ├── prisma/
│   │   ├── prisma.module.ts         # @Global database module
│   │   └── prisma.service.ts        # PrismaClient + Nest lifecycle hooks
│   ├── projects/
│   │   ├── dto/                     # Create/Update/Response/Query DTOs
│   │   ├── projects.controller.ts   # /api/projects REST endpoints
│   │   ├── projects.mapper.ts       # Prisma row → JSON contract
│   │   ├── projects.module.ts
│   │   └── projects.service.ts      # CRUD + activity logging + business rules
│   ├── scope-requirements/
│   │   ├── dto/                     # Create/Update/Response/Query DTOs
│   │   ├── scope-requirements.controller.ts  # /api/projects/:projectId/scope
│   │   ├── scope-requirements.mapper.ts
│   │   ├── scope-requirements.module.ts
│   │   └── scope-requirements.service.ts     # Nested CRUD + filters + audit log
│   ├── meetings/
│   │   ├── dto/                     # Create/Update/Query/Response/Detail DTOs
│   │   ├── meetings.controller.ts   # /api/projects/:projectId/meetings
│   │   ├── meetings.mapper.ts
│   │   ├── meetings.module.ts
│   │   └── meetings.service.ts      # Nested CRUD + date/status filters + audit log
│   ├── meeting-attachments/
│   │   ├── dto/                     # Create/Update/Query/Response DTOs
│   │   ├── meeting-attachments.controller.ts  # /api/projects/:projectId/meetings/:meetingId/attachments
│   │   ├── meeting-attachments.mapper.ts
│   │   ├── meeting-attachments.module.ts
│   │   └── meeting-attachments.service.ts     # Metadata-only CRUD + audit log (no storage I/O)
│   ├── commitments/
│   │   ├── dto/                     # Create/Update/Query/Response/Detail DTOs
│   │   ├── commitments.controller.ts          # /api/projects/:projectId/commitments (CRUD)
│   │   ├── meeting-commitments.controller.ts  # /api/meetings/:meetingId/commitments (read-only)
│   │   ├── commitments.mapper.ts
│   │   ├── commitments.module.ts
│   │   └── commitments.service.ts   # CRUD + ownership rules + filters + audit log
│   ├── scope-verification/
│   │   ├── dto/verification-response.dto.ts   # Typed verification result
│   │   ├── scope-matcher.ts         # Deterministic lexical matcher (no AI, no pgvector)
│   │   ├── scope-verification.controller.ts   # /api/projects/:projectId/commitments/:id/verify
│   │   ├── scope-verification.module.ts
│   │   └── scope-verification.service.ts      # Scope match + authorization + risk rules
│   ├── change-requests/
│   │   ├── dto/                     # Action/Query/Response/Detail DTOs
│   │   ├── change-requests.controller.ts      # List/detail/approve/reject/clarification
│   │   ├── commitment-change-requests.controller.ts  # POST …/commitments/:id/change-request
│   │   ├── change-requests.module.ts
│   │   └── change-requests.service.ts         # Generation rules + transactional lifecycle
│   ├── app.module.ts                # Root module
│   └── main.ts                      # Bootstrap (ValidationPipe, filter, CORS)
├── scripts/
│   ├── verify-db.mjs                # Ephemeral-Postgres migration+seed check
│   ├── test-api.mjs                 # End-to-end Projects API tests (37 checks)
│   ├── test-scope-api.mjs           # End-to-end Scope Requirements tests (43 checks)
│   ├── test-meetings-api.mjs        # End-to-end Meetings API tests (49 checks)
│   ├── test-attachments-api.mjs     # End-to-end Meeting Attachments tests (51 checks)
│   ├── test-commitments-api.mjs     # End-to-end Commitments API tests (61 checks)
│   ├── test-evidence-api.mjs        # End-to-end Commitment Evidence tests (55 checks)
│   ├── test-analysis-api.mjs        # End-to-end Meeting Analysis tests (42 checks)
│   ├── test-fireworks-provider.mjs  # Fireworks provider tests, stubbed HTTP (46 checks)
│   ├── test-verification-api.mjs    # End-to-end Scope Verification tests (48 checks)
│   └── test-change-requests-api.mjs # End-to-end Change Request workflow tests (67 checks)
├── .env.example
└── package.json
```

## Projects API (Phase 2)

REST endpoints under `/api` (all responses use the `{ success, message, data }`
envelope):

| Method | Route              | Notes                                                              |
| ------ | ------------------ | ------------------------------------------------------------------ |
| GET    | `/api/projects`    | `page`, `limit` (≤100), `search` (name/client), `status`, `sortBy`, `sortOrder` |
| GET    | `/api/projects/:id` | Detail + relationship counts + latest activity                     |
| POST   | `/api/projects`    | Creates project + `PROJECT_CREATED` activity in one transaction    |
| PATCH  | `/api/projects/:id` | Partial update; logs a `PROJECT_UPDATED` activity                  |
| DELETE | `/api/projects/:id` | Cascades the whole graph (activity trail cannot outlive the row)   |

### Scope Requirements API (Phase 3)

All nested under their project; 404 when the project doesn't exist, 404 when
the requirement exists but belongs to a different project:

| Method | Route                              | Notes                                                            |
| ------ | ---------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/projects/:projectId/scope`   | `page`, `limit` (≤100), `search` (title/description), `category`, `priority`, `approvalStatus`, `sortBy` (title/priority/createdAt/updatedAt), `sortOrder` |
| GET    | `/api/projects/:projectId/scope/:id` | Full requirement                                               |
| POST   | `/api/projects/:projectId/scope`   | Creates + `SCOPE_REQUIREMENT_CREATED` activity (transactional)   |
| PATCH  | `/api/projects/:projectId/scope/:id` | Partial update + `SCOPE_REQUIREMENT_UPDATED` activity          |
| DELETE | `/api/projects/:projectId/scope/:id` | Delete + `SCOPE_REQUIREMENT_DELETED` activity (transactional)  |

Business rules: title and category required, enums validated, duplicate title
within a project (case-insensitive) → `409`, requirement-under-wrong-project
→ `404`. Default on create: `priority=MEDIUM`, `approvalStatus=PENDING`.

### Meetings API (Phase 4)

All nested under their project; 404 when the project doesn't exist, 404 when
the meeting exists but belongs to a different project:

| Method | Route                                | Notes |
| ------ | ------------------------------------ | ----- |
| GET    | `/api/projects/:projectId/meetings`  | `page`, `limit` (≤100), `search` (title/summary), `analysisStatus`, `meetingDateFrom`/`meetingDateTo` (inclusive), `sortBy` (meetingDate/title/createdAt), `sortOrder` |
| GET    | `/api/projects/:projectId/meetings/:id` | Detail + `attachments[]` + `commitmentCount` + `latestActivity` |
| POST   | `/api/projects/:projectId/meetings`  | Creates + `MEETING_CREATED` activity (transactional); `analysisStatus` defaults to `NOT_STARTED` |
| PATCH  | `/api/projects/:projectId/meetings/:id` | Partial update + `MEETING_UPDATED` activity |
| DELETE | `/api/projects/:projectId/meetings/:id` | Delete + `MEETING_DELETED` activity; cascade removes attachments/commitments/evidence |

Duplicate meeting titles are allowed (no uniqueness rule).

### Meeting Attachments API (Phase 5)

Metadata only — no file uploads, no storage access, no signed URLs.
Nested three levels deep; every endpoint verifies project → meeting →
attachment ownership (wrong combination → 404):

| Method | Route | Notes |
| ------ | ----- | ----- |
| GET    | `/api/projects/:projectId/meetings/:meetingId/attachments` | `page`, `limit` (≤100), `search` (fileName), `sortBy` (uploadedAt/fileName/createdAt), `sortOrder` |
| GET    | `…/attachments/:id` | Attachment metadata + latest activity |
| POST   | `…/attachments` | Creates metadata row + `MEETING_ATTACHMENT_CREATED` activity (transactional); `uploadedAt` defaults to `now()` |
| PATCH  | `…/attachments/:id` | Updates `fileName`/`fileType`/`storagePath`/`fileSize` only (`uploadedAt` is immutable) |
| DELETE | `…/attachments/:id` | Deletes metadata + `MEETING_ATTACHMENT_DELETED` activity; storage object untouched |

Validation: MIME `type/subtype` pattern, `storagePath` must begin with
`meetings/`, `fileSize` integer ≥ 0, `fileName` ≤ 255 chars. Duplicate
filenames are allowed.

### Commitments API (Phase 6)

CRUD under `/api/projects/:projectId/commitments` plus a read-only
`GET /api/meetings/:meetingId/commitments` for the Meeting Details page.

- Create takes `meetingId` in the body; the service verifies the meeting exists
  **and** belongs to the route's project (missing → 404, cross-project → 400).
  `projectId` is never accepted from the client.
- List/search across title, description and speaker; filters:
  `authorizationStatus`, `riskLevel`, `speaker` (exact, case-insensitive),
  `meetingId`; sorting limited to `createdAt`/`updatedAt`/`title`/
  `confidenceScore`/`riskLevel`.
- List items include `meetingTitle` + `latestActivity`; detail adds
  `meetingSummary`, `projectName`, `projectSummary`, `evidenceCount`
  (evidence rows are NOT included — see Phase 7).
- Defaults on create: `riskLevel=LOW`, `authorizationStatus=PENDING`.
  Duplicate titles allowed. `confidenceScore` must be within 0–1.
- All mutations log `COMMITMENT_CREATED`/`_UPDATED`/`_DELETED` transactionally;
  deleting a commitment cascades its evidence but the log survives.

Business rules enforced: name/client required, budget ≥ 0, `startDate ≤ endDate`
(checked across create and patch merges), duplicate name per client → `409`.
Errors always return `{ success: false, message, error }` with proper status
codes (400 validation, 404 missing, 409 duplicate, 500 unexpected).

Run `node scripts/test-api.mjs` to execute the full 37-check suite against an
ephemeral PostgreSQL (requires `npm i --no-save embedded-postgres`).

## Meeting Analysis API (Phase 8)

Manual AI-analysis trigger under `/api`:

| Method | Route                                            | Notes |
| ------ | ------------------------------------------------ | ----- |
| POST   | `/api/projects/:projectId/meetings/:meetingId/analyze` | Runs the analysis pipeline synchronously; returns `{ meetingId, analysisStatus, commitmentsCreated, evidenceCreated, commitments[] }` |

Status lifecycle (existing `MeetingAnalysisStatus`): `NOT_STARTED →
PROCESSING → COMPLETED`, or `PROCESSING → FAILED`. `PROCESSING` and
`COMPLETED` meetings return `409` (no concurrent runs, no re-analysis of
completed meetings — results cannot duplicate). `FAILED` meetings may be
re-analyzed. A meeting without a `text/*` attachment returns `422` and keeps
its status.

Business rules:

- Provider abstraction (`MeetingAnalysisProvider`) keeps AI behind a seam. The
  only bundled implementation is the deterministic **development** provider
  (rule-based extraction over the meeting's own summary/notes text — the only
  transcript content stored in the current data model; no transcript content
  is invented). It refuses to run under `NODE_ENV=production`; a production
  provider is registered via `MEETING_ANALYSIS_PROVIDER` once credentials exist.
- `projectId`/`meetingId` always come from the verified route context, never
  from the AI result. Defaults hold: `riskLevel=LOW`,
  `authorizationStatus=PENDING`, `confidenceScore` clamped to 0–1.
- Commitments + evidence + `COMMITMENT_CREATED` activity per commitment +
  `MEETING_ANALYZED` activity + the meeting's final status are written in ONE
  transaction; any failure rolls everything back and marks the meeting `FAILED`
  (502 envelope, no internals leaked). Existing commitments/evidence are
  never touched.

Run `node scripts/test-analysis-api.mjs` for the 42-check Phase 8 suite.

## AI Providers (Phase 9)

Selected server-side via `MEETING_ANALYSIS_PROVIDER` in `backend/.env`:

| Value           | Provider                                  | Use |
| --------------- | ----------------------------------------- | --- |
| `development`   | `DevelopmentMeetingAnalysisProvider` — deterministic rule-based extraction over the meeting's own notes text | Tests & demo (default; refuses to run under `NODE_ENV=production`) |
| `fireworks`     | `FireworksMeetingAnalysisProvider` — real Fireworks chat-completions call | Production AI |
| anything else   | —                                         | Boot fails fast with a configuration error |

### Enabling Fireworks locally

1. Get an API key at <https://fireworks.ai> (API keys).
2. In `backend/.env` (never committed):
   ```
   MEETING_ANALYSIS_PROVIDER=fireworks
   FIREWORKS_API_KEY=<your key>
   # optional, defaults to accounts/fireworks/models/kimi-k2-instruct
   FIREWORKS_MODEL=accounts/fireworks/models/<model-id>
   ```
3. Restart the API. The key is read server-side only — it never reaches the
   frontend, responses, logs, or error envelopes.

Behavior (identical API contract for both providers): the provider's output is
strictly validated before persistence — invalid JSON, missing/ill-typed
required fields (title, verbatim evidence quote), wrong enum values or a
non-numeric confidence fail the whole analysis (502, meeting marked FAILED, no
partial writes). Optional fields (speaker, deadline, confidence, risk) fall
back to null/defaults rather than guesses; deadlines are folded into the
commitment description (there is no dedicated schema field). Requests time out
conservatively after 30s; HTTP failures surface only the status code.

Provider tests run against stubbed HTTP — no key or network needed:
`node scripts/test-fireworks-provider.mjs` (46 checks).

## Scope Verification API (Phase 10)

```
POST /api/projects/:projectId/commitments/:commitmentId/verify
```

Deterministic, explainable scope verification for a single commitment.
Lives in its own `scope-verification` module (not inside meeting-analysis);
the analysis pipeline calls it after its transaction commits (a verification
failure is logged and skipped — analysis results are never rolled back).

The result is also persisted onto the commitment's existing
`riskLevel` / `authorizationStatus` fields and audited once with a
`COMMITMENT_VERIFIED` activity (additive enum migration). Repeating a
verification whose conclusion is unchanged is a no-op: same response,
no duplicate audit entries. A changed outcome (e.g. the underlying scope or
change request changed) produces a fresh audit entry.

### Risk rules (fixed business rules — never AI-decided)

| Risk   | When                                                                                         |
| ------ | -------------------------------------------------------------------------------------------- |
| LOW    | Covered by an **approved** scope requirement, **or** outside scope but covered by an **APPROVED** change request |
| MEDIUM | Ambiguous scope overlap (or a match only against a not-yet-approved requirement) and no approved authorization |
| HIGH   | Clearly outside scope with no approved authorization                                          |

### Authorization rules

Authorization is a database/business-rule decision — the AI provider is never
asked for and never trusted to grant it:

- **APPROVED scope requirement** (lexical match) → authorized via `APPROVED_SCOPE`.
- **`ChangeRequest` with status `APPROVED` linked to the commitment** (direct
  `commitmentId` FK) → authorized via `CHANGE_REQUEST`.
- `PENDING`, `REJECTED` or `CANCELLED` change requests authorize **nothing**.
- Resulting commitment state: authorized cases → `AUTHORIZED`; ambiguous →
  `PENDING` (needs human review); out-of-scope without authorization →
  `UNAUTHORIZED`.

### Scope matching (MVP, deliberately simple)

Purely lexical and deterministic — **no pgvector, no embeddings, no AI**:

- Both texts are tokenized (lowercase, punctuation-split, stop-words removed,
  naive singularization).
- Each requirement is scored by the share of its **title** tokens and of its
  **full-text** tokens that appear in the commitment; the better view wins.
- `MATCHED` — every meaningful title token is covered, or full-text coverage
  ≥ 0.6 with ≥ 2 shared tokens.
- `AMBIGUOUS` — meaningful overlap (score ≥ 0.3) that is not a full match.
- `NOT_MATCHED` — no meaningful overlap.

MVP limitations (documented on purpose): purely word-level (no synonyms,
semantics, or fuzzy matching — "login" does not match "authentication");
short/generic requirement titles weaken precision; multi-language text is out
of scope. pgvector remains the intended upgrade path (see Supabase notes) and
can be introduced without changing this API contract.

### Example response

```json
{
  "success": true,
  "message": "Commitment scope verified",
  "data": {
    "commitmentId": "9ba26b32-cd94-4698-8ba0-f8dc52da8fe5",
    "scopeMatch": false,
    "matchedScopeRequirement": null,
    "authorizationFound": true,
    "authorizationSource": "CHANGE_REQUEST",
    "risk": "LOW",
    "authorizationStatus": "AUTHORIZED",
    "explanation": "No approved scope requirement matches this commitment, but an approved change request (\"CR-900: Telegram deployment alerts\") authorizes it.",
    "evidence": ["sprint4-review-transcript.txt"],
    "verifiedAt": "2026-10-11T10:20:44.263Z"
  }
}
```

`scopeMatch` is `true` (in approved scope), `false` (out of scope) or `null`
(ambiguous). There is no GET endpoint: the latest outcome is already readable
via the commitment detail (`latestActivity`, `riskLevel`,
`authorizationStatus`).

Run `node scripts/test-verification-api.mjs` for the 48-check Phase 10 suite
(matcher unit checks + full API behavior; never calls the real Fireworks API).

## Change Request Generation & Approval Workflow (Phase 11)

Dedicated `change-requests` module on the **existing** `ChangeRequest` model
(no new table). A change request is generated from a flagged commitment,
reviewed by the client, and **approving it is the only client-facing action
that authorizes a commitment**.

```
POST   /api/projects/:projectId/commitments/:commitmentId/change-request   # generate (201)
GET    /api/projects/:projectId/change-requests                            # paginated list
GET    /api/projects/:projectId/change-requests/:changeRequestId           # detail + context
POST   /api/projects/:projectId/change-requests/:changeRequestId/approve   # 200
POST   /api/projects/:projectId/change-requests/:changeRequestId/reject    # 200
POST   /api/projects/:projectId/change-requests/:changeRequestId/clarification # 200
```

### Lifecycle (state machine)

`PENDING → APPROVED | REJECTED | CLARIFICATION_REQUESTED` — every transition
out of an open state is claimed with a conditional update, so concurrent
decisions produce exactly one winner (loser gets `409`). `PENDING` is the
existing "pending approval" state; `CLARIFICATION_REQUESTED` is still open and
accepts approve/reject/another clarification. `APPROVED`, `REJECTED` and
`CANCELLED` are terminal (`409` on any further transition). Invalid transitions
include APPROVED→REJECTED and REJECTED→APPROVED.

### Generation rules (no client-authored facts)

The generate endpoint takes **no body**. Every field is derived from database
state: `title`/feature = the commitment's title, `source` = the meeting,
`committedBy` = the speaker, `description` = what was promised and why it
requires approval (from the Phase 10 verification explanation). Missing values
are `null` — nothing is invented. A request is generated only when **all** hold:

- The commitment is **HIGH** risk, **out of scope** (`scopeMatch === false`)
  and **not already authorized** (live Phase 10 verification decides).
- No **open** (pending/clarification) change request already exists for it.

Otherwise `409` with the reason: in-scope or already-authorized → "unnecessary";
ambiguous (`scopeMatch === null`) → resolve the verification first; duplicate →
existing open request. A **REJECTED** request does not block a new one
(rejection is terminal; a re-negotiated promise becomes a fresh request).

### Approval authorizes (single transaction)

`POST .../approve` runs in one interactive transaction: claim the CR →
`APPROVED`, update the linked commitment → `authorizationStatus AUTHORIZED` +
`riskLevel LOW`, write the `CHANGE_REQUEST_APPROVED` audit entry. **If any step
fails, the whole transaction rolls back** — no partial state. The AI provider
is never called and Phase 9 output is never consulted: the database action is
the authority. Clients cannot authorize a commitment directly — the commitment
PATCH/POST DTOs no longer accept `authorizationStatus` (`400`), and the
analysis pipeline already hardcodes `PENDING`.

### Rejection & clarification

- **Reject** (optional reason ≤ 2000 chars): CR → `REJECTED`, commitment stays
  unauthorized with its risk unchanged, nothing is deleted, audit entry written
  with the reason.
- **Clarification** (comment **required**): CR → `CLARIFICATION_REQUESTED`;
  the comment is appended to `clarificationComment` (`---`-separated) so
  previous comments are never lost; commitment untouched, risk not downgraded;
  audited as `CHANGE_REQUEST_CLARIFICATION_REQUESTED` (the only new enum values
  in this phase's additive migration, alongside the new nullable column).

### Example responses

```json
// POST .../commitments/:id/change-request → 201
{
  "success": true,
  "message": "Change request generated",
  "data": {
    "id": "0f8b1c2e-…",
    "projectId": "…", "commitmentId": "…",
    "title": "Add Telegram bot alerts for deployments",
    "description": "Promised by Priya during \"Sprint 4 Review\": … falls outside the approved scope and has no approved authorization.",
    "status": "PENDING",
    "approvalReason": null,
    "clarificationComment": null,
    "createdAt": "2026-10-11T10:30:00.000Z",
    "updatedAt": "2026-10-11T10:30:00.000Z",
    "commitment": { "id": "…", "title": "…", "speaker": "Priya", "riskLevel": "HIGH", "authorizationStatus": "UNAUTHORIZED", "meetingId": "…" },
    "meetingTitle": "Sprint 4 Review — Client Sync"
  }
}
```

```json
// POST .../approve → 200 (commitment is now AUTHORIZED/LOW in the same tx)
{
  "success": true,
  "message": "Change request approved — commitment authorized",
  "data": { "…same shape…", "status": "APPROVED" }
}
```

Errors follow the global envelope: `404` for missing/cross-project entities,
`400` for validation, `409` with an explanatory message for unnecessary or
duplicate generation and for closed change requests.

Run `node scripts/test-change-requests-api.mjs` for the 67-check Phase 11
suite (generation rules, lifecycle, authorization side effects, injected
mid-transaction failure rollback, concurrent-approve race; never calls the
real Fireworks API).

## Data model (business flow)

```
Project ─┬─ ScopeRequirement          (approved scope)
         ├─ Meeting ─┬─ MeetingAttachment
         │           └─ Commitment ─┬─ CommitmentEvidence
         │                          └─ ChangeRequest
         ├─ ChangeRequest
         ├─ Document
         └─ Activity                 (audit trail)
```

- Deleting a **Project** cascades to its entire graph (scope, meetings,
  attachments, commitments, evidence, change requests, documents, activities).
- Deleting a **Meeting** cascades to its attachments and detected commitments.
- `Activity.entityId` is a polymorphic UUID reference (intentionally no FK) —
  the entity type is named by `Activity.entityType`.
- `snake_case` physical names via `@map` for clean Supabase SQL/RLS interop.
- pgvector can be added later via a SQL migration on `scope_requirements`
  or `commitments` (e.g. `embedding vector(1536)`) without touching these tables.

## Supabase notes (for later phases)

- **RLS:** Phase 1 tables live in `public`. Once Supabase Auth lands, enable RLS
  with ownership-scoped policies before any table is exposed via the Data API.
- **pgvector:** enable with `create extension vector;` in a future SQL migration.
- **Storage:** `storagePath` columns are Supabase Storage object paths.
