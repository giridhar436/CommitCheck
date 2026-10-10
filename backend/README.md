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
│   │   └── 20261011000001_add_project_activity_actions/
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
│   ├── app.module.ts                # Root module
│   └── main.ts                      # Bootstrap (ValidationPipe, filter, CORS)
├── scripts/
│   ├── verify-db.mjs                # Ephemeral-Postgres migration+seed check
│   ├── test-api.mjs                 # End-to-end Projects API tests (37 checks)
│   ├── test-scope-api.mjs           # End-to-end Scope Requirements tests (43 checks)
│   ├── test-meetings-api.mjs        # End-to-end Meetings API tests (49 checks)
│   └── test-attachments-api.mjs     # End-to-end Meeting Attachments tests (51 checks)
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

Business rules enforced: name/client required, budget ≥ 0, `startDate ≤ endDate`
(checked across create and patch merges), duplicate name per client → `409`.
Errors always return `{ success: false, message, error }` with proper status
codes (400 validation, 404 missing, 409 duplicate, 500 unexpected).

Run `node scripts/test-api.mjs` to execute the full 37-check suite against an
ephemeral PostgreSQL (requires `npm i --no-save embedded-postgres`).

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
