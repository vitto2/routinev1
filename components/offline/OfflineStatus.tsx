"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudOff, RefreshCw } from "lucide-react";
import { flushPending } from "@/lib/offline/client";
import { pendingStore, useOnline, usePendingCount } from "@/lib/offline/store";

/** Quanto tempo esperar entre tentativas automáticas enquanto houver itens pendentes. */
const RETRY_MS = 30_000;

/**
 * Faixa no topo quando não há conexão ou há alterações a enviar. Também é quem
 * dispara a sincronização: ao abrir o app, ao voltar a internet, ao voltar o foco
 * à aba e a cada 30 s enquanto houver pendências.
 */
export function OfflineStatus() {
  const router = useRouter();
  const online = useOnline();
  const count = usePendingCount();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!navigator.onLine || Object.keys(pendingStore.get()).length === 0) return;

    setSyncing(true);
    try {
      const summary = await flushPending();
      if (summary.sent > 0) {
        toast.success(
          summary.sent === 1
            ? "1 alteração sincronizada"
            : `${summary.sent} alterações sincronizadas`,
          { id: "sync-done" },
        );
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    // Adiado um tick: evita atualizar estado de forma síncrona dentro do efeito.
    const first = window.setTimeout(() => void sync(), 0);
    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const interval = window.setInterval(() => void sync(), RETRY_MS);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  if (online && count === 0) return null;

  const pendingText =
    count === 0
      ? ""
      : count === 1
        ? "1 alteração aguardando envio"
        : `${count} alterações aguardando envio`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 border-b border-warning bg-card pt-[env(safe-area-inset-top)] shadow-sm"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-2.5 text-sm">
        {online ? (
          <RefreshCw
            className={syncing ? "size-4 shrink-0 animate-spin text-primary" : "size-4 shrink-0 text-primary"}
            aria-hidden
          />
        ) : (
          <CloudOff className="size-4 shrink-0 text-warning" aria-hidden />
        )}
        <p className="min-w-0 flex-1">
          <span className="font-semibold">
            {online ? (syncing ? "Enviando..." : "Pendente") : "Sem conexão"}
          </span>
          {online ? null : " · suas marcações ficam salvas no aparelho."}
          {pendingText ? ` ${pendingText}.` : ""}
        </p>
        {online && !syncing ? (
          <button
            type="button"
            onClick={() => void sync()}
            className="min-h-9 shrink-0 rounded-full border border-input px-3 text-xs font-semibold hover:bg-accent"
          >
            Enviar agora
          </button>
        ) : null}
      </div>
    </div>
  );
}
