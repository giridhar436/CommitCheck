/*
 * CommitCheck Production Progressive Web App Service Worker
 *
 * Security & Caching Rules:
 * - NEVER cache authenticated API responses (/api/*)
 * - NEVER cache OAuth flows or external requests
 * - NEVER cache session credentials or tokens
 * - NEVER serve cached private dashboard pages to prevent cross-user data leakage
 * - CACHE ONLY static assets (JS chunks, CSS, fonts, icons) and the dedicated offline page
 */

const CACHE_VERSION = "commitcheck-v1";
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_PUBLIC_PAGES = `${CACHE_VERSION}-public-pages`;

// Static shell assets precached on install
const PRECACHE_ASSETS = [
  "/offline",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-192x192.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

// Public pages that are safe for network-first offline reading (no user data)
const PUBLIC_PAGE_ALLOWLIST = [
  "/",
  "/docs",
  "/support",
  "/privacy",
  "/terms",
  "/cookies",
  "/security",
  "/acceptable-use",
  "/disclaimer",
  "/dpa",
  "/accessibility",
];

// Install: precache offline fallback and essential icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[CommitCheck SW] Precache failed:", err);
      })
  );
});

// Activate: clean up previous caches and take control immediately
self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([CACHE_STATIC, CACHE_PUBLIC_PAGES]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith("commitcheck-") && !allowedCaches.has(name)) {
              return caches.delete(name);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Listen for skip waiting messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch dispatcher
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests. Mutations (POST, PUT, DELETE, PATCH) ALWAYS hit network.
  if (request.method !== "GET") {
    return;
  }

  // 2. Ignore cross-origin requests (e.g. GitHub/Google OAuth, Recall.ai, external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. API ROUTES & AUTH ROUTES: STRICTLY NETWORK-ONLY
  // Never put authenticated API responses, transcripts, scopes, audits into shared caches!
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a standard 503 JSON response when offline so client code receives clean error
        return new Response(
          JSON.stringify({
            error: "You are currently offline. Please reconnect to perform this operation.",
            offline: true,
            status: 503,
          }),
          {
            status: 503,
            statusText: "Service Unavailable (Offline)",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      })
    );
    return;
  }

  // 4. STATIC ASSETS: Cache-First
  // Immutable Next.js static files (/_next/static/*), icons, and public static images
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_STATIC).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Return nothing / let caller handle
            return cached || new Response("", { status: 404 });
          });
      })
    );
    return;
  }

  // 5. NAVIGATION (HTML document requests)
  if (request.mode === "navigate") {
    // A. PROTECTED DASHBOARDS: STRICT NETWORK-ONLY WITH OFFLINE FALLBACK
    // /freelancer/* and /client/* must NEVER be served from shared cache to prevent
    // stale authenticated data or cross-user privacy leaks.
    const isProtectedDashboard =
      url.pathname.startsWith("/freelancer") ||
      url.pathname.startsWith("/client") ||
      url.pathname.startsWith("/login") ||
      url.pathname.startsWith("/onboarding");

    if (isProtectedDashboard) {
      event.respondWith(
        fetch(request).catch(async () => {
          // Device is offline: serve the dedicated offline page
          const offlinePage = await caches.match("/offline");
          if (offlinePage) {
            return offlinePage;
          }
          return new Response(
            "<!DOCTYPE html><html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
      );
      return;
    }

    // B. PUBLIC PAGES: Network-First with Cache Fallback & Offline Page
    const isPublicPage = PUBLIC_PAGE_ALLOWLIST.includes(url.pathname);

    if (isPublicPage) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_PUBLIC_PAGES).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            // Try matching cached version of this public page
            const cachedPage = await caches.match(request);
            if (cachedPage) {
              return cachedPage;
            }
            // Fall back to offline page
            const offlinePage = await caches.match("/offline");
            if (offlinePage) {
              return offlinePage;
            }
            return new Response("Offline", { status: 503 });
          })
      );
      return;
    }

    // C. Any other navigation: Network-first with offline fallback
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match("/offline");
        return offlinePage || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // 6. Default fallback for any remaining requests: Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
