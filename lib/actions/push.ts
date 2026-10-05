"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isPushConfigured, sendPush } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

export async function savePushSubscription(
  subscription: unknown,
  userAgent?: string,
) {
  const { supabase, user } = await requireUser();
  const data = subscriptionSchema.parse(subscription);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      user_agent: userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw new Error(error.message);
}

/** Envia uma notificação de teste para os dispositivos do próprio usuário. */
export async function sendTestPush(): Promise<{ sent: number; error?: string }> {
  const { supabase } = await requireUser();

  if (!isPushConfigured()) {
    return { sent: 0, error: "Notificações não configuradas no servidor." };
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) return { sent: 0, error: error.message };

  let sent = 0;
  for (const sub of subs ?? []) {
    const result = await sendPush(sub, {
      title: "Routine",
      body: "Tudo certo! Seus lembretes estão funcionando.",
      url: "/today",
      tag: "routine-test",
    });
    if (result === "ok") sent += 1;
    if (result === "gone") {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }

  return sent > 0 ? { sent } : { sent, error: "Nenhum dispositivo respondeu." };
}
