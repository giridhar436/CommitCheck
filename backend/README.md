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
│   │   └── 20261011000000_init/     # Initial schema (tables, enums, FKs, indexes)
│   ├── schema.prisma                # 9 models · 10 enums · full relation graph
│   └── seed.ts                      # Interconnected demo data (2 projects)
├── src/
│   ├── prisma/
│   │   ├── prisma.module.ts         # @Global database module
│   │   └── prisma.service.ts        # PrismaClient + Nest lifecycle hooks
│   ├── app.module.ts                # Root module (database layer only for now)
│   └── main.ts                      # Bootstrap (global /api prefix, CORS)
├── scripts/
│   └── verify-db.mjs                # Ephemeral-Postgres migration+seed check
├── .env.example
└── package.json
```

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
