"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/actions/push";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

type Status =
  | "checking"
  | "unsupported" // navegador sem Push (ou iOS fora do app instalado)
  | "unconfigured" // servidor sem chaves VAPID
  | "dev" // service worker só roda em produção
  | "denied"
  | "off"
  | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? (await navigator.serviceWorker.ready);
}

export function EnableNotifications({
  variant = "profile",
}: {
  variant?: "profile" | "onboarding";
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function detect(): Promise<Status> {
      if (!PUBLIC_KEY) return "unconfigured";
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return "unsupported";
      }
      if (process.env.NODE_ENV !== "production") return "dev";
      if (Notification.permission === "denied") return "denied";

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      return subscription && Notification.permission === "granted" ? "on" : "off";
    }

    detect().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }

        const registration = await getRegistration();
        // Assinatura nova a cada ativação: evita endpoint herdado de outra conta.
        await (await registration.pushManager.getSubscription())?.unsubscribe();
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!),
        });

        await savePushSubscription(subscription.toJSON(), navigator.userAgent);
        setStatus("on");
        toast.success("Lembretes ativados");
      } catch {
        toast.error("Não foi possível ativar os lembretes");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setStatus("off");
        toast.success("Lembretes desativados");
      } catch {
        toast.error("Não foi possível desativar os lembretes");
      }
    });
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestPush();
      if (result.error) toast.error(result.error);
      else toast.success("Notificação de teste enviada");
    });
  }

  if (status === "checking") return null;

  const compact = variant === "onboarding";
  // No onboarding só vale mostrar o convite quando dá para ativar de fato.
  if (compact && status !== "off") return null;

  const Icon = status === "on" ? BellRing : status === "off" ? Bell : BellOff;

  const description: Record<Status, string> = {
    checking: "",
    on: "Você receberá o resumo do dia, lembrete à noite e aviso antes de tarefas com horário.",
    off: "Resumo do dia às 9h, lembrete à noite e aviso 15 min antes de tarefas com horário.",
    denied: "As notificações estão bloqueadas. Libere nas configurações do navegador para este site.",
    unsupported:
      "Este navegador não suporta notificações. No iPhone, instale o app na Tela de Início primeiro.",
    unconfigured: "As notificações ainda não foram configuradas no servidor.",
    dev: "Os lembretes funcionam apenas no app publicado (não no modo de desenvolvimento).",
  };

  return (
    <Panel
      icon={Icon}
      tone={status === "on" ? "primary" : "muted"}
      title={status === "on" ? "Lembretes ativados" : "Lembretes de tarefas e hábitos"}
      description={description[status]}
    >
      {status === "off" ? (
        <Button className="w-full" onClick={enable} disabled={pending}>
          {pending ? "Ativando..." : "Ativar lembretes"}
        </Button>
      ) : null}

      {status === "on" ? (
        <div className={cn("flex gap-2", compact && "hidden")}>
          <Button variant="outline" className="flex-1" onClick={sendTest} disabled={pending}>
            Enviar teste
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={disable} disabled={pending}>
            Desativar
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
