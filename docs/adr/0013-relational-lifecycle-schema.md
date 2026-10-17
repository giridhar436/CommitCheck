# 0013: Relational Lifecycle Entity Schema

We decided on a relational data model in PostgreSQL (managed via Prisma ORM) comprising five primary entities: `User` (role, OAuth credentials), `Project` (GitHub repo and Linear bindings), `Meeting` (Recall.ai bot state, transcript), `LinearTaskDraft` (staged scope review items), and `AuditReport` (immutable audit snapshots with discrepancy JSON). This provides strict referential integrity across the entire project lifecycle.
