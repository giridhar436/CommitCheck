# CommitCheck — Frontend

React 19 + Vite + Tailwind CSS frontend for CommitCheck — the AI-powered
scope-creep detector for agencies and freelancers. Talks to the NestJS
backend in [`backend/`](./backend) (Phases 1–15; see the backend README for
API documentation).

## Getting started

```bash
npm install

# 1. Copy .env.example → .env and fill in values (see below)
# 2. Start the backend first (backend/README.md), then:
npm run dev
```

### Environment variables

| Variable | Used for |
| -------- | -------- |
| `VITE_API_URL` | Backend API base URL (default `http://localhost:3000/api`). |
| `VITE_SUPABASE_URL` | **Supabase Auth (required for sign-in).** Project URL (`https://<ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Supabase anon key** — safe for browsers by design. |
| `VITE_APP_NAME` | Page titles. |

**Never put secret keys in frontend env files.** Service-role keys
(`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_SERVICE_KEY`),
`SUPABASE_JWT_SECRET`, `FIREWORKS_API_KEY`, `EMBEDDING_API_KEY` and
`RESEND_API_KEY` are server-side only — anything prefixed `VITE_` ends up in
the shipped JavaScript bundle. The Supabase **anon** key is the one exception:
it is public by design and its permissions are governed by Supabase RLS; this
app uses it only to run Supabase Auth flows (sign-in/sign-up/password reset)
in the browser.

When the Supabase variables are unset, the UI shows an explicit
"authentication not configured" state and disables sign-in instead of failing
mysteriously.

## Authentication (Phase 15)

Supabase Auth is the identity source — there is no custom password system and
no mock auth:

- Sign-in/sign-up/password reset run against Supabase in the browser; the
  frontend sends the resulting HS256 access token to the backend on every
  request (`Authorization: Bearer`).
- Session restore re-validates the token against the backend
  (`GET /api/auth/me`) before the authenticated shell renders; the session is
  the single source of truth (no localStorage user persistence).
- A `401` from the backend (expired/revoked token) clears the session
  globally and routes the user back to sign-in. A `403` surfaces the
  backend's permission message.
- Role-aware UI: project payloads carry the caller's `myRole`
  (OWNER/ADMIN/MEMBER/VIEWER); change-request approve/reject/clarify and
  scope-approval controls are hidden for roles that the backend would reject.
  **Frontend hiding is convenience only — backend authorization is
  authoritative.**

## Known limitations (honest)

- **In-app notification feed is a local mock**
  (`src/services/notifications.ts`). The backend records notifications in its
  `notification_log` table and emails them via Resend, but exposes no
  notification read API yet. No notification code here can grant
  authorization or affect backend state.
- **Members management is API-only** — the members endpoints exist on the
  backend; there is no UI for them yet.
- Root-level routes (`/commitments`, `/change-requests`, …) redirect to the
  caller's first accessible project.
