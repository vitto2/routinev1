"use client";

import { toast } from "sonner";
import {
  setHabitCompletion,
  setHabitValue,
  type LogRejection,
  type LogResult,
} from "@/lib/actions/habitLogs";
import { setTaskCompletion } from "@/lib/actions/tasks";
import { createEngine, type SubmitOutcome } from "@/lib/offline/engine";
import { RejectedError, type PendingEntry } from "@/lib/offline/queue";
import { markSettled, pendingStore } from "@/lib/offline/store";

function run(entry: PendingEntry): Promise<unknown> {
  switch (entry.kind) {
    case "habit-completion":
      return setHabitCompletion(entry.habitId, entry.date, entry.completed);
    case "habit-value":
      return setHabitValue(entry.habitId, entry.date, entry.value);
    case "task-completion":
      return setTaskCompletion(entry.taskId, entry.completed);
  }
}

function isRejection(value: unknown): value is LogRejection {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { rejected?: unknown }).rejected === "string"
  );
}

/** Envia um item; uma recusa explícita do servidor vira RejectedError (não adianta reenviar). */
async function send(entry: PendingEntry): Promise<unknown> {
  const result = await run(entry);
  if (isRejection(result)) throw new RejectedError(result.rejected);
  return result;
}

const engine = createEngine({
  store: pendingStore,
  send,
  isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine),
  now: () => Date.now(),
  onSettled: (entry) => markSettled(entry),
  onFailed: (_entry, error) => {
    toast.error(
      error instanceof RejectedError
        ? error.message
        : "Uma alteração não pôde ser salva e foi descartada.",
      { id: "sync-failed" },
    );
  },
});

/** Todo registro passa pela fila: online é enviado na hora; offline fica guardado no aparelho. */
export const submitHabitCompletion = (habitId: string, date: string, completed: boolean) =>
  engine.submit({ kind: "habit-completion", habitId, date, completed });

export const submitHabitValue = (habitId: string, date: string, value: number) =>
  engine.submit({ kind: "habit-value", habitId, date, value });

export const submitTaskCompletion = (taskId: string, completed: boolean) =>
  engine.submit({ kind: "task-completion", taskId, completed });

export const flushPending = engine.flush;

export type { LogResult, SubmitOutcome };

/** Mensagem do aviso quando o registro ficou guardado em vez de enviado. */
export function queuedMessage(): string {
  return typeof navigator !== "undefined" && !navigator.onLine
    ? "Sem conexão: salvo no aparelho. Enviamos quando voltar."
    : "Salvo no aparelho. Vamos tentar enviar de novo em instantes.";
}
