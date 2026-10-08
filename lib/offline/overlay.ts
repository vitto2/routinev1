import { isCompletedByValue } from "@/lib/logging/rules";
import type { PendingEntry } from "@/lib/offline/queue";

export interface HabitLogState {
  completed: boolean;
  value: number;
}

/**
 * Estado a exibir de um hábito: se há uma alteração pendente (ou recém-enviada, ainda
 * aguardando a tela atualizar), ela vale mais do que o que veio do servidor.
 */
export function overlayHabitState(
  entry: PendingEntry | null,
  server: HabitLogState,
  target: number | null,
): HabitLogState {
  if (!entry) return server;

  if (entry.kind === "habit-completion") {
    return { completed: entry.completed, value: server.value };
  }
  if (entry.kind === "habit-value") {
    return { value: entry.value, completed: isCompletedByValue(entry.value, target) };
  }
  return server;
}

export function overlayTaskCompleted(entry: PendingEntry | null, server: boolean): boolean {
  return entry?.kind === "task-completion" ? entry.completed : server;
}
