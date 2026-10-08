"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/auth";
import { removePushSubscription } from "@/lib/actions/push";
import { clearOfflineData, pendingStore } from "@/lib/offline/store";
import { Button } from "@/components/ui/button";

/** Quanto esperar pela limpeza das notificações antes de sair mesmo assim. */
const RELEASE_TIMEOUT_MS = 4000;

/**
 * Privacidade: depois de sair, este aparelho não deve continuar recebendo os
 * lembretes da conta. Remove a assinatura no servidor (precisa da sessão, por isso
 * vem antes do signOut) e cancela a do navegador. Nunca impede o logout: se algo
 * falhar, a linha antiga some sozinha quando o serviço de push responder 404/410.
 */
async function releasePush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    try {
      await removePushSubscription(subscription.endpoint);
    } finally {
      await subscription.unsubscribe();
    }
  } catch {
    /* ignorado de propósito */
  }
}

function discardMessage(waiting: number) {
  return waiting === 1
    ? "Há 1 alteração que ainda não foi enviada. Sair agora vai descartá-la. Deseja sair mesmo assim?"
    : `Há ${waiting} alterações que ainda não foram enviadas. Sair agora vai descartá-las. Deseja sair mesmo assim?`;
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    // Sair precisa do servidor; offline, apagar a fila e não conseguir sair seria o pior dos mundos.
    if (!navigator.onLine) {
      toast.error("Sem conexão. Conecte-se à internet para sair da conta.");
      return;
    }

    const waiting = Object.keys(pendingStore.get()).length;
    if (waiting > 0 && !confirm(discardMessage(waiting))) return;

    startTransition(async () => {
      await Promise.race([
        releasePush(),
        new Promise((resolve) => setTimeout(resolve, RELEASE_TIMEOUT_MS)),
      ]);
      // Privacidade: nada da conta fica guardado no aparelho depois de sair.
      await clearOfflineData();
      try {
        await signOut();
      } catch {
        toast.error("Não foi possível sair agora. Tente de novo.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={handleSignOut}
    >
      <LogOut className="size-4" />
      {pending ? "Saindo..." : "Sair"}
    </Button>
  );
}
