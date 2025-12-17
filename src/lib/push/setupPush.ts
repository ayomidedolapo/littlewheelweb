// src/lib/push/setupPush.ts

type SetupResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: string };

export async function setupWebPush(): Promise<SetupResult> {
  if (typeof window === "undefined") return { ok: false, reason: "server" };
  if (!("serviceWorker" in navigator)) return { ok: false, reason: "no-sw" };
  if (!("PushManager" in window)) return { ok: false, reason: "no-push" };

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: "missing-vapid" };

  // 1) Ask permission
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  // 2) Ensure SW is registered
  const reg = await navigator.serviceWorker.register("/sw.js");

  // 3) Reuse existing subscription if any
  const existing = await reg.pushManager.getSubscription();

  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));

  // 4) Send subscription to backend (your Next.js API route)
  try {
    const r = await fetch("/api/agent/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    if (!r.ok) {
      return { ok: false, reason: `subscribe-api-${r.status}` };
    }
  } catch {
    return { ok: false, reason: "subscribe-api-failed" };
  }

  return { ok: true, subscription };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
