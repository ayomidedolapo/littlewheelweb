import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

type SetupResult =
  | { ok: true; fcmToken: string; deviceToken: string }
  | { ok: false; reason: string };

export async function setupWebPush({ deviceToken }: { deviceToken: string }): Promise<SetupResult> {
  if (typeof window === "undefined") return { ok: false, reason: "server" };

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };

  try {
    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
    const fcmToken = await getToken(messaging, { vapidKey: vapid });

    console.log("FCM Web Token:", fcmToken);

    // If you need to send device+fcm to backend for storage uncomment:
    // await fetch("/api/agent/push/subscribe", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ deviceToken, fcmToken })
    // });

    return { ok: true, fcmToken, deviceToken };
  } catch (err) {
    console.error("FCM token error:", err);
    return { ok: false, reason: "fcm-failed" };
  }
}
