const CACHE_VERSION = "lectrax-admin-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const STATIC_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

const CACHEABLE_EXTENSIONS = /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|svg|ico)$/i;

const NEVER_CACHE_PATTERNS = [
  /^\/$/,
  /^\/api\//,
  /supabase\.co/,
  /\/auth\//,
  /\/login/,
  /\/auth\/callback/,
];

function isProtectedRoute(pathname) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/");
}

function shouldNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname) || pattern.test(url.href));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/landing/") ||
    CACHEABLE_EXTENSIONS.test(url.pathname)
  );
}

function isImageRequest(request, url) {
  return (
    request.destination === "image" ||
    url.pathname.startsWith("/_next/image") ||
    /\.(?:png|jpe?g|gif|webp|svg|ico|avif)(?:$|\?)/i.test(url.pathname)
  );
}

/** Never serve the offline HTML page for non-document requests (breaks <img>). */
function offlineFallback(request) {
  if (request.mode === "navigate" || request.destination === "document") {
    return caches.match("/offline").then((page) => page ?? new Response("Offline", { status: 503 }));
  }
  return Promise.resolve(Response.error());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("lectrax-admin-") && key !== STATIC_CACHE && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Let the browser handle the image optimizer and never HTML-fallback it.
  if (url.pathname.startsWith("/_next/image")) return;

  if (shouldNeverCache(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    void networkPromise;
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return offlineFallback(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && isStaticAsset(new URL(request.url))) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isImageRequest(request, new URL(request.url))) {
      return Response.error();
    }
    throw new Error("Network unavailable");
  }
}

async function networkFirstNavigation(request) {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    try {
      return await fetch(request);
    } catch {
      const offlinePage = await caches.match("/offline");
      if (offlinePage) return offlinePage;
      throw new Error("Network unavailable");
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok && !isProtectedRoute(url.pathname)) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;

    return new Response(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — Lectrax Admin</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff;color:#0B3D91;text-align:center;padding:2rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#64748b;max-width:24rem;line-height:1.6}</style></head><body><div><h1>You're currently offline</h1><p>Reconnect to manage Lectrax from this device.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
