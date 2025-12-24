// public/sw.js

// Bump this to force an update when you deploy
const SW_VERSION = "lw-v1";

/** -------- PUSH NOTIFICATIONS (Option B) --------
 * Expected payload (JSON):
 * {
 *   "title": "Deposit received",
 *   "body": "₦2,000 from Aisha",
 *   "url": "/dash",              // where to open when clicked
 *   "meta": { ... }              // optional extras
 * }
 */
self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: event.data.text() };
    }
  }

  const title = data.title || "Little Wheel";
  const options = {
    body: data.body || "",
    // ✅ optional icons (change if you have different paths)
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-72x72.png",
    data: {
      url: data.url || "/dash",
      meta: data.meta || {},
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/dash";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // If an existing tab is open, focus + navigate
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          try {
            client.navigate(url);
          } catch {}
          return;
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(url);
    })
  );
});

/** -------- PWA LIFECYCLE -------- */
self.addEventListener("install", (event) => {
  // Precache core files if you want (kept empty for now)
  event.waitUntil(self.skipWaiting()); // activate immediately
});

self.addEventListener("activate", (event) => {
  // Clean up old caches if you add caching later
  event.waitUntil(self.clients.claim());
});

// Optional: a tiny "network-first for pages, cache-first for assets" strategy
// You can remove this block if you don't want caching yet.
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET
  if (req.method !== "GET") return;

  // Example: static assets cache-first
  if (/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/i.test(req.url)) {
    event.respondWith(
      caches.open("lw-static-" + SW_VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        // Only cache successful, basic/opaque responses
        if (res && (res.status === 200 || res.type === "opaque")) {
          cache.put(req, res.clone());
        }
        return res;
      })
    );
    return;
  }

  // Example: pages network-first with fallback to cache
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Optionally cache successful pages
          const cache = await caches.open("lw-pages-" + SW_VERSION);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open("lw-pages-" + SW_VERSION);
          const cached = await cache.match(req);
          return cached || Response.error();
        }
      })()
    );
  }
});
