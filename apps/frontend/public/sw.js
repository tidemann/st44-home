/*
 * Diddit service worker (ST-623).
 *
 * Hand-written instead of @angular/service-worker: the proxy in front of the app
 * puts a fresh CSP nonce into every index.html, so the hash check in ngsw would
 * reject the app shell on every visit.
 *
 * - Pages: network first, the last app shell when offline.
 * - Hashed build files: cache first (their names change on every build).
 * - Other files under the scope (icons, manifest): network first, cache fallback.
 * - GET /api/ (not auth): network first; offline, the last answer is returned
 *   with an `X-Diddit-Offline: 1` header so the app can say it is old data.
 * - Push: shows the notification and opens the app on tap.
 */

const VERSION = 'v1';
const STATIC_CACHE = `diddit-static-${VERSION}`;
const API_CACHE = 'diddit-api';
const SHELL_URL = new URL('./', self.registration.scope).href;
const MAX_STATIC_ENTRIES = 80;
const HASHED_FILE = /-[A-Z0-9]{8}\.(js|css)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(SHELL_URL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('diddit-static-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/auth/')) return;
    event.respondWith(handleApi(request));
    return;
  }

  if (!request.url.startsWith(self.registration.scope)) return;

  if (HASHED_FILE.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

async function handleNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      // Every route serves the same app shell
      await cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL_URL);
    if (cached) return cached;
    throw error;
  }
}

async function handleApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (!cached) throw error;
    const headers = new Headers(cached.headers);
    headers.set('X-Diddit-Offline', '1');
    return new Response(await cached.blob(), {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trimCache(cache);
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

/** Old hashed files pile up after each deploy; keep the newest ones */
async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < excess; i++) {
    if (keys[i].url !== SHELL_URL) await cache.delete(keys[i]);
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Diddit';
  const options = {
    body: payload.body || '',
    icon: new URL('icons/icon-192.png', self.registration.scope).href,
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    lang: 'no',
    data: { url: payload.url || './' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client
            .focus()
            .then((focused) => (focused ? focused.navigate(target) : null))
            .catch(() => self.clients.openWindow(target));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
