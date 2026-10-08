import {
  MAX_ATTEMPTS,
  bumpAttempts,
  classifyError,
  removeIfUnchanged,
  sortedEntries,
  upsertEntry,
  type PendingEntry,
  type PendingInput,
  type PendingMap,
} from "@/lib/offline/queue";

export interface PendingStore {
  get(): PendingMap;
  /** Persiste e avisa quem estiver observando. */
  set(next: PendingMap): void;
}

export interface EngineDeps {
  store: PendingStore;
  /** Envia um item ao servidor (ação de estado absoluto). Resolve com o resultado dela. */
  send(entry: PendingEntry): Promise<unknown>;
  isOnline(): boolean;
  now(): number;
  /** Item entregue com sucesso. */
  onSettled?(entry: PendingEntry, result: unknown): void;
  /** Item descartado (recusado pelo servidor ou sem sucesso após várias tentativas). */
  onFailed?(entry: PendingEntry, error: unknown): void;
}

export type SubmitOutcome =
  | { status: "saved"; result?: unknown }
  | { status: "queued" }
  | { status: "failed" };

export interface FlushSummary {
  sent: number;
  failed: number;
  remaining: number;
  /** a rodada parou por falta de conexão */
  offline: boolean;
}

const MAX_PASSES = 5;

/**
 * Motor de sincronização. Todo registro passa pela fila e é enviado em série:
 * assim um item antigo nunca ultrapassa (e sobrescreve) um mais novo.
 */
export function createEngine(deps: EngineDeps) {
  let chain: Promise<unknown> = Promise.resolve();
  let lastStamp = 0;
  const results = new Map<string, unknown>();
  const failures = new Set<string>();

  const stamp = (entry: PendingEntry) => `${entry.key}@${entry.updatedAt}`;

  async function runFlush(): Promise<FlushSummary> {
    const summary: FlushSummary = { sent: 0, failed: 0, remaining: 0, offline: false };

    for (let pass = 0; pass < MAX_PASSES && !summary.offline; pass++) {
      const entries = sortedEntries(deps.store.get());
      if (entries.length === 0) break;

      let progressed = false;
      let blocked = false;

      for (const entry of entries) {
        // O item pode ter sido substituído por um mais novo desde o início da rodada.
        const current = deps.store.get()[entry.key];
        if (!current || current.updatedAt !== entry.updatedAt) continue;

        if (!deps.isOnline()) {
          summary.offline = true;
          break;
        }

        try {
          const result = await deps.send(entry);
          results.set(stamp(entry), result);
          deps.store.set(removeIfUnchanged(deps.store.get(), entry.key, entry.updatedAt));
          deps.onSettled?.(entry, result);
          summary.sent += 1;
          progressed = true;
        } catch (error) {
          const kind = classifyError(error, deps.isOnline());

          if (kind === "network") {
            // Sem conexão (ou servidor fora do ar): nada é descartado, tenta de novo depois.
            summary.offline = true;
            break;
          }

          const attempts = entry.attempts + 1;
          if (kind === "permanent" || attempts >= MAX_ATTEMPTS) {
            failures.add(stamp(entry));
            deps.store.set(removeIfUnchanged(deps.store.get(), entry.key, entry.updatedAt));
            deps.onFailed?.(entry, error);
            summary.failed += 1;
            progressed = true;
          } else {
            // Erro inesperado: conta a tentativa e segue para os próximos itens.
            deps.store.set(bumpAttempts(deps.store.get(), entry.key, entry.updatedAt));
            blocked = true;
          }
        }
      }

      // Se só restaram itens com erro inesperado, parar: nova rodada só no próximo gatilho.
      if (!progressed || blocked) break;
    }

    summary.remaining = Object.keys(deps.store.get()).length;
    return summary;
  }

  /** Enfileira uma rodada de envio depois das anteriores (nunca duas ao mesmo tempo). */
  function flush(): Promise<FlushSummary> {
    const next = chain.then(runFlush, runFlush);
    chain = next.catch(() => undefined);
    return next;
  }

  async function submit(input: PendingInput): Promise<SubmitOutcome> {
    lastStamp = Math.max(deps.now(), lastStamp + 1);
    const next = upsertEntry(deps.store.get(), input, lastStamp);
    deps.store.set(next);

    const entry = Object.values(next).find((e) => e.updatedAt === lastStamp)!;
    await flush();

    const pending = deps.store.get()[entry.key];
    if (pending && pending.updatedAt === entry.updatedAt) return { status: "queued" };
    if (failures.has(stamp(entry))) return { status: "failed" };
    return { status: "saved", result: results.get(stamp(entry)) };
  }

  return { submit, flush };
}

export type Engine = ReturnType<typeof createEngine>;
