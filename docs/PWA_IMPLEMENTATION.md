# CommitCheck Progressive Web App (PWA) Implementation

This document describes the production Progressive Web App (PWA) architecture, caching policies, security boundaries, offline recovery, and install lifecycle for CommitCheck.

---

## 1. Architecture Overview

CommitCheck is built on **Next.js 16.4.2 (App Router)** and **React 19.3.0**. The PWA layer is designed as an un-intrusive, zero-external-dependency infrastructure layer that preserves the existing Next.js server runtime, PostgreSQL/Prisma persistence, and third-party integrations (Recall.ai, Gemini AI, Linear, GitHub, Resend).

### Core Components

```
                          ┌────────────────────────┐
                          │   RootLayout (App)     │
                          └───────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │ <OfflineIndicator/> │               │   <PwaLifecycle/>   │
        └─────────────────────┘               └──────────┬──────────┘
                                                         │
                                             Registers /sw.js
                                             Detects installability
                                             Manages beforeinstallprompt
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │    public/sw.js     │
                                              │   Service Worker    │
                                              └──────────┬──────────┘
                                                         │
                      ┌──────────────────────────────────┴──────────────────────────────────┐
                      ▼                                                                     ▼
           Static Assets & Shell                                                API Routes & Dashboards
      - /_next/static/*                                                    - /api/* (Network-Only)
      - /icons/*, favicon.ico                                              - /freelancer/* (Network-Only)
      - /manifest.json                                                     - /client/* (Network-Only)
      - /offline (Precached)                                               - OAuth flows (Network-Only)
      Strategy: Cache-First                                                Strategy: Network-Only with
                                                                           /offline Fallback on Disconnect
```

---

## 2. Web App Manifest Configuration

The manifest is defined using Next.js App Router metadata route in `src/app/manifest.ts` and mirrored statically in `public/manifest.json` for universal cross-browser compatibility.

### Manifest Properties

| Property | Value | Purpose |
|---|---|---|
| `name` | `CommitCheck` | Full platform name |
| `short_name` | `CommitCheck` | Home screen / app launcher title |
| `description` | `Meeting-to-Code Freelance Verification Platform` | Platform description |
| `start_url` | `/` | Safe landing route that does not presume authentication |
| `id` | `/` | Unique PWA application identity identifier |
| `scope` | `/` | Global navigation scope |
| `display` | `standalone` | Native window presentation without browser address bar |
| `orientation` | `portrait-primary` | Standard mobile orientation |
| `theme_color` | `#ffffff` | Light mode canvas matching Airbnb design system |
| `background_color` | `#ffffff` | Splash screen background matching pure white canvas |
| `categories` | `["productivity", "business", "developer"]` | App store / catalog classification |

### App Shortcuts

Quick actions configured in manifest:
1. **Freelancer Dashboard** (`/freelancer`): Direct link for freelancers to view projects.
2. **Client Portal** (`/client`): Direct link for clients to review deliverables.
3. **Documentation** (`/docs`): Platform architecture and domain documentation.

---

## 3. Application Icons

Icons adhere strictly to CommitCheck branding (the Airbnb Rausch `#ff385c` circle emblem with the crisp white `ShieldCheck` icon, styled in compliance with `DESIGN.md`).

Generated assets in `public/icons/`:
- `icon-192x192.png`: 192×192 standard icon for desktop and mobile task switchers.
- `icon-512x512.png`: 512×512 high-resolution icon for splash screens and store listings.
- `maskable-icon-192x192.png`: 192×192 maskable icon with emblem centered inside the 80% safe zone for Android adaptive icons.
- `maskable-icon-512x512.png`: 512×512 maskable icon with emblem centered inside the 80% safe zone.
- `apple-touch-icon.png`: 180×180 icon with full bleed for iOS Safari home screen.
- `icon.svg`: Master scalable vector icon.

---

## 4. Service Worker Strategy & Lifecycle

The service worker is implemented in `public/sw.js`.

### Lifecycle
1. **Install (`install`)**:
   - Opens `commitcheck-v1-static`.
   - Precaches essential assets: `/offline`, `/manifest.json`, `/favicon.ico`, and all PWA icon variants.
   - Executes `self.skipWaiting()` for immediate adoption.
2. **Activate (`activate`)**:
   - Queries `caches.keys()`.
   - Safely removes obsolete cache versions (any cache starting with `commitcheck-` not matching the current version).
   - Calls `self.clients.claim()` so the active service worker controls all open tabs without requiring a manual refresh.
3. **Message (`message`)**:
   - Responds to `SKIP_WAITING` messages to support smooth client updates.

---

## 5. Detailed Caching Strategy

Caching is strictly partitioned based on data sensitivity:

### 1. What IS Cached (Safe Static Assets)

| Category | Resources | Caching Strategy | Justification |
|---|---|---|---|
| Immutable Bundles | `/_next/static/*` | Cache-First | Built with unique content hashes, immutable per release |
| Application Shell Icons | `/icons/*`, `/favicon.ico`, `/icon.svg` | Cache-First | Static brand assets |
| Manifest | `/manifest.json`, `/manifest.webmanifest` | Cache-First with revalidation | Static configuration |
| Offline Fallback Page | `/offline` | Precached during install | Required when connection is severed |
| Public Static Pages | `/`, `/docs`, `/support`, `/privacy`, `/terms`, etc. | Network-First with Cache Fallback | Informational public content containing no sensitive user data |

### 2. What is Intentionally NOT Cached (Strict Network-Only)

| Route / Resource | Enforcement | Security & Business Rationale |
|---|---|---|
| All API Endpoints (`/api/*`) | Strict Network-Only | Contains live session tokens, meeting transcripts, Recall.ai bots, Gemini prompts, GitHub OAuth secrets, Linear OAuth tokens, and audit results. |
| Mutations (`POST`, `PUT`, `PATCH`, `DELETE`) | Strict Network-Only | Modifying project state, confirming scope, or publishing to Linear while pretending offline success causes data desynchronization. |
| Protected Dashboards (`/freelancer/*`, `/client/*`) | Strict Network-Only (Fallback to `/offline`) | **Zero cross-user data leakage:** If User A logs out and User B logs in, or an unauthenticated user visits, the browser will NEVER serve cached HTML of private projects or client data. |
| External OAuth Flows | Direct Network (Bypassed) | `github.com/login/oauth` and `accounts.google.com/o/oauth2` must execute directly over the network to complete authentication handshakes. |

---

## 6. Authentication & Session Safety

- **Middleware Enforcement**: Next.js middleware in `src/middleware.ts` gates `/freelancer/:path*` and `/client/:path*`. Because navigations to these routes are handled Network-Only by the Service Worker, the server always inspects the `cc_session` cookie before rendering any HTML.
- **Session Expiration**: If a session cookie expires or is cleared via `/api/auth/logout`, the server redirects immediately to `/login`. No stale authenticated page can be served from the service worker cache.
- **Role Isolation**: Freelancers cannot access `/client` and clients cannot access `/freelancer`. Network-only delivery ensures backend authorization rules are always executed.

---

## 7. Offline Experience & Network Recovery

### Dedicated Offline Page (`/offline`)
When an unauthenticated or authenticated user navigates while offline, or refreshes while disconnected:
- The service worker serves the precached `/offline` page.
- Designed in accordance with CommitCheck Airbnb design system:
  - Clean white canvas (`#ffffff`), soft cards (`#f7f7f7`), hairline borders (`#dddddd`), Airbnb Rausch accent (`#ff385c`).
  - Clear "Offline Mode" status pill with red status dot.
  - Transparent messaging that live Google Meet bots, Gemini AI, Linear, and GitHub verification require active connectivity.
  - Actionable **Retry Connection** button that checks connection and reloads.
  - Live listener that automatically reloads the page when the browser reconnects.

### In-App Offline Toast (`OfflineIndicator`)
- Rendered in `RootLayout`.
- Shows a non-intrusive floating status indicator at the bottom of the screen (`fixed bottom-4`).
- Utilizes `useSyncExternalStore` for SSR-safe online/offline state subscription.
- Includes a 4-second "Connection restored" confirmation notification when network connectivity is recovered.
- Uses `env(safe-area-inset-bottom)` to prevent obstruction on mobile home-bar devices.

---

## 8. Install Experience & Standalone Mode

The install experience is managed by `src/components/pwa/pwa-lifecycle.tsx`.

### Install Prompt Policy
- **Non-intrusive**: Does not display aggressive popups or block user workflow.
- **Capability-Gated**: Only displays when the browser fires `beforeinstallprompt`.
- **Standalone-Aware**: Automatically hides when already running in standalone mode (`(display-mode: standalone)`).
- **Dismissible**: Users can dismiss the prompt with the "X" button; dismissal is remembered in `localStorage` for 7 days (`commitcheck_pwa_install_dismissed_until`).
- **Installed Event Listener**: Hides the prompt immediately once the application is installed (`appinstalled` event).

### Standalone Mode Behavior
- **Deep Links**: Navigating to deep links (e.g., `/freelancer/projects/[id]`, `/client/projects/[id]/scope-confirmation`) functions normally; the app does not force redirection to `/`.
- **OAuth Callbacks**: External OAuth callbacks to `/api/auth/github` and `/api/auth/google` redirect back into the standalone PWA window seamlessly.
- **Viewport & Safe Areas**: Configured in `globals.css` with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to respect hardware notches and gesture indicators.

---

## 9. Verification & Test Suite

The PWA implementation is verified by an automated test suite in `src/lib/pwa.test.ts` integrated into `npm test`:

1. **Manifest Validation**:
   - Asserts valid name, short_name, standalone display, start_url, and color tokens.
   - Asserts all required icon sizes (192, 512, maskable) are declared.
   - Verifies `public/manifest.json` matches App Router manifest.
2. **Icon Integrity**:
   - Checks that all 6 icon files exist on disk with file sizes > 200 bytes.
   - Validates the 8-byte PNG file magic header signature (`89 50 4E 47 0D 0A 1A 0A`) for all PNG files.
3. **Service Worker Security Invariants**:
   - Verifies `/api/*` routes are strictly network-only.
   - Verifies protected dashboards (`/freelancer`, `/client`) are excluded from public caching.
   - Verifies non-GET requests bypass the cache.
   - Verifies cross-origin requests bypass the cache.
4. **Offline Route Access**:
   - Verifies `/offline` route access is public for unauthenticated, freelancer, and client visitors.

---

## 10. Browser Support & Known Limitations

- **Chromium (Chrome, Edge, Brave)**: Full support for installation, standalone launch, service worker caching, and `beforeinstallprompt`.
- **iOS Safari**: Supports installation via "Add to Home Screen" (`apple-touch-icon` and `apple-mobile-web-app-capable` are fully configured). Note: iOS Safari does not support the programmatic `beforeinstallprompt` API, so the custom install banner will not display on iOS Safari (users use Safari's native share menu).
- **Firefox Desktop**: Supports offline caching and service worker; desktop installation prompt support depends on Firefox configuration.
