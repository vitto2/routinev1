"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { clearOfflineData, pendingStore } from "@/lib/offline/store";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    const waiting = Object.keys(pendingStore.get()).length;
    if (
      waiting > 0 &&
      !confirm(
        `Há ${waiting} ${waiting === 1 ? "alteração" : "alterações"} que ainda não foram enviadas. Sair agora vai descartá-${waiting === 1 ? "la" : "las"}. Deseja sair mesmo assim?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      // Privacidade: nada da conta fica guardado no aparelho depois de sair.
      await clearOfflineData();
      await signOut();
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
