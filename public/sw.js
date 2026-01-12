// -------------------------
// Little Wheel PWA + FCM SW
// -------------------------

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const SW_VERSION = "lw-v2"; // bump this when updating

// 🔧 Your Firebase config (replace with real values)
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// -----------------------------
// 📌 HANDLE FCM BACKGROUND PUSH
// -----------------------------
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] FCM Background payload:", payload);

  // Extract values from both notification & data
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Little Wheel";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    JSON.stringify(payload?.data || payload || {});

  const icon =
    payload?.notification?.icon ||
    payload?.data?.icon ||
    "/icons/icon-192x192.png";

  // Keep full payload
  const data = {
    ...payload?.data,
    clickUrl: payload?.data?.url || "/dash",
  };

  self.registration.showNotification(title, {
    body,
    icon,
    data,
  });
});

// -------------------------------
// 📌 CLICK HANDLER FOR REDIRECT
// -------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl || "/dash";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/") && "focus" in client) {
          client.focus();
          client.navigate(clickUrl);
          return;
        }
      }
      return clients.openWindow(clickUrl);
    })
  );
});

// ---------------------------------
// 📌 OPTIONAL PWA CACHING SECTION
// ---------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Static assets cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/i.test(req.url)) {
    event.respondWith(
      caches.open("lw-static-" + SW_VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.status === 200 || res.type === "opaque") {
          cache.put(req, res.clone());
        }
        return res;
      })
    );
    return;
  }

  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
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
