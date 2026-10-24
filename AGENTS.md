# Agent Instructions

## Agent skills

### Issue tracker

Issues and specifications are tracked in Linear. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage label vocabulary mapping for issue classification. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`GLOSSARY.md` and `docs/adr/` at repository root). See `docs/agents/domain.md`.

## UI & Design Guidelines

The entire user interface of CommitCheck must strictly adhere to the Airbnb design specification in [`DESIGN.md`](file:///c:/CommitCheck/DESIGN.md).

Before writing, generating, or modifying any frontend components, layouts, or styles:
- **Canvas & Surfaces**: Pure white canvas (`#ffffff`), soft surface fill (`#f7f7f7`), hairline dividers (`#dddddd`), and dark near-black ink (`#222222`) for text.
- **Brand Accent**: Airbnb Rausch (`#ff385c`) carries all primary CTAs, active badges, and key accent moments.
- **Typography**: Modest weights (500–600 display, 400 body) with Inter/Circular font stack.
- **Radii**: Soft geometry—8px (`rounded-sm`) for buttons and text inputs, 14px (`rounded-md`) for project/audit cards, and full pill (`rounded-full`) for search bars and status badges.
- **Elevation**: Single unified shadow tier (`rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px, rgba(0,0,0,0.1) 0 4px 8px`) on hover/cards—no heavy layered drop shadows.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
