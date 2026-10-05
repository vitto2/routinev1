import "server-only";
import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** "ok", "gone" (assinatura expirada: remover do banco) ou "error". */
export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<"ok" | "gone" | "error"> {
  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}
