// Offline support: pages are served from the network when possible and from the
// cache when the server or its database is unreachable.
const PAGES = "pages-v1";
const STATIC = "static-v1";
const SLOW_MS = 8000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(req));
  else if (req.mode === "navigate") event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  const cached = await cache.match(req.url);
  try {
    const controller = new AbortController();
    const timer = cached ? setTimeout(() => controller.abort(), SLOW_MS) : null;
    const res = await fetch(req, { signal: controller.signal });
    if (timer) clearTimeout(timer);
    // 5xx means the app or database is down: prefer the saved copy.
    if (res.status >= 500 && cached) return cached;
    // Redirects (e.g. to /login) are never stored, so one user's pages can't leak to another.
    if (res.ok && !res.redirected) cache.put(req.url, res.clone());
    return res;
  } catch {
    return cached || offlineResponse();
  }
}

function offlineResponse() {
  return new Response(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
      "<title>Offline</title><body style='font-family:system-ui;padding:2rem'>" +
      "<h1>Offline</h1><p>This page has not been saved yet. Reconnect and try again.</p>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function refreshPages() {
  const cache = await caches.open(PAGES);
  for (const req of await cache.keys()) {
    try {
      const res = await fetch(req.url, { credentials: "same-origin", headers: { Accept: "text/html" } });
      if (res.ok && !res.redirected) await cache.put(req.url, res);
      else if (res.redirected || res.status === 401 || res.status === 403) await cache.delete(req);
    } catch {
      return;
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "clear") event.waitUntil(caches.delete(PAGES));
  else if (event.data === "refresh") event.waitUntil(refreshPages());
});
