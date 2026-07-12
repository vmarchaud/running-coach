import webpush from "web-push";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "./config";

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// web-push's sendNotification() shells out to Node's `https` client, which
// isn't reliably available on Cloudflare Workers even with nodejs_compat.
// generateRequestDetails() does the actual work we need — VAPID JWT signing
// and RFC 8291 payload encryption, both backed by Node's `crypto` module,
// which nodejs_compat does support — and just hands back a plain
// {endpoint, method, headers, body}, which we send ourselves via fetch().
export type PushResult = { ok: true } | { ok: false; gone: boolean; error: string };

export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  vapidPrivateKey: string,
  payload: { title: string; body: string; url?: string }
): Promise<PushResult> {
  const details = webpush.generateRequestDetails(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    {
      vapidDetails: {
        subject: VAPID_SUBJECT,
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: vapidPrivateKey,
      },
      TTL: 60 * 60 * 24, // 24h
    }
  );

  const res = await fetch(details.endpoint, {
    method: details.method,
    headers: details.headers as Record<string, string>,
    body: details.body as any,
  });

  if (res.ok) return { ok: true };

  // 410/404 means the subscription is gone (uninstalled, permission revoked,
  // push service expired it) — caller should drop it rather than retry.
  const gone = res.status === 410 || res.status === 404;
  return { ok: false, gone, error: `${res.status}: ${await res.text()}` };
}
