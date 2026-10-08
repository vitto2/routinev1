"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CloudOff, RefreshCw } from "lucide-react";
import { flushPending } from "@/lib/offline/client";
import { pendingStore, useOnline, usePendingCount } from "@/lib/offline/store";

/** Quanto esperar entre tentativas automáticas enquanto houver itens pendentes. */
const RETRY_MS = 30_000;

/**
 * Esperas (ms) para tentar de novo logo depois de uma falha de rede em que o navegador
 * ainda diz estar online (sinal ruim, servidor fora): nesses casos o evento `online` nunca
 * dispara, e esperar o ciclo de 30 s deixaria a marcação parada sem necessidade.
 */
const BACKOFF_MS = [2_000, 5_000, 10_000, 20_000];

/**
 * Faixa no topo quando não há conexão ou há alterações a enviar. Também é quem
 * dispara a sincronização: ao abrir o app, ao voltar a internet, ao voltar o foco
 * à aba, a cada 30 s enquanto houver pendências e, depois de uma falha de rede, em
 * esperas curtas e crescentes.
 */
export function OfflineStatus() {
  const router = useRouter();
  const online = useOnline();
  const count = usePendingCount();
  const [syncing, setSyncing] = useState(false);
  const failures = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  const sync = useCallback(async () => {
    if (!navigator.onLine || Object.keys(pendingStore.get()).length === 0) return;

    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

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

      if (summary.offline && summary.remaining > 0) {
        const wait = BACKOFF_MS[Math.min(failures.current, BACKOFF_MS.length - 1)];
        failures.current += 1;
        retryTimer.current = window.setTimeout(() => void syncRef.current(), wait);
      } else {
        failures.current = 0;
      }
    } finally {
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  useEffect(() => {
    // Adiado um tick: evita atualizar estado de forma síncrona dentro do efeito.
    const first = window.setTimeout(() => void sync(), 0);
    const onOnline = () => {
      failures.current = 0;
      void sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const interval = window.setInterval(() => void sync(), RETRY_MS);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
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
