/**
 * Fila de alterações feitas sem internet. Cada item é um ESTADO ABSOLUTO ("este hábito
 * está concluído neste dia", "o valor do dia é 1500"), nunca uma operação ("alternar",
 * "somar"). Por isso:
 *  - várias alterações na mesma chave viram uma só (a última vence);
 *  - reenviar um item é sempre seguro (idempotente), mesmo se a resposta anterior se perdeu.
 */

export type PendingEntry =
  | {
      kind: "habit-completion";
      key: string;
      habitId: string;
      date: string;
      completed: boolean;
      updatedAt: number;
      attempts: number;
    }
  | {
      kind: "habit-value";
      key: string;
      habitId: string;
      date: string;
      value: number;
      updatedAt: number;
      attempts: number;
    }
  | {
      kind: "task-completion";
      key: string;
      taskId: string;
      completed: boolean;
      updatedAt: number;
      attempts: number;
    };

export type PendingMap = Record<string, PendingEntry>;

/** Dados que o chamador informa; chave, horário e tentativas são calculados aqui. */
export type PendingInput =
  | { kind: "habit-completion"; habitId: string; date: string; completed: boolean }
  | { kind: "habit-value"; habitId: string; date: string; value: number }
  | { kind: "task-completion"; taskId: string; completed: boolean };

/** Limite de itens guardados: evita crescer sem fim se o aparelho ficar muito tempo offline. */
export const MAX_PENDING = 300;

/** Tentativas com erro desconhecido antes de desistir de um item. */
export const MAX_ATTEMPTS = 10;

export class QueueFullError extends Error {
  constructor() {
    super("Muitas alterações pendentes. Conecte-se à internet para sincronizar.");
    this.name = "QueueFullError";
  }
}

export function keyFor(input: PendingInput): string {
  switch (input.kind) {
    case "habit-completion":
      return `h:${input.habitId}:${input.date}`;
    case "habit-value":
      // Mesma chave do check: um hábito é de marcar OU de valor, nunca os dois.
      return `h:${input.habitId}:${input.date}`;
    case "task-completion":
      return `t:${input.taskId}`;
  }
}

/** Adiciona ou substitui (última escrita vence). Não altera o mapa recebido. */
export function upsertEntry(map: PendingMap, input: PendingInput, updatedAt: number): PendingMap {
  const key = keyFor(input);
  if (!(key in map) && Object.keys(map).length >= MAX_PENDING) throw new QueueFullError();

  return { ...map, [key]: { ...input, key, updatedAt, attempts: 0 } as PendingEntry };
}

/** Remove só se o item não foi alterado desde o envio (comparação por updatedAt). */
export function removeIfUnchanged(map: PendingMap, key: string, updatedAt: number): PendingMap {
  const current = map[key];
  if (!current || current.updatedAt !== updatedAt) return map;
  const { [key]: _removed, ...rest } = map;
  void _removed;
  return rest;
}

export function bumpAttempts(map: PendingMap, key: string, updatedAt: number): PendingMap {
  const current = map[key];
  if (!current || current.updatedAt !== updatedAt) return map;
  return { ...map, [key]: { ...current, attempts: current.attempts + 1 } };
}

/** Itens em ordem de criação (o mais antigo primeiro). */
export function sortedEntries(map: PendingMap): PendingEntry[] {
  return Object.values(map).sort((a, b) => a.updatedAt - b.updatedAt || a.key.localeCompare(b.key));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isEntry(value: unknown): value is PendingEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.key !== "string" || typeof v.updatedAt !== "number" || typeof v.attempts !== "number") {
    return false;
  }

  switch (v.kind) {
    case "habit-completion":
      return (
        typeof v.habitId === "string" &&
        typeof v.date === "string" &&
        ISO_DATE.test(v.date) &&
        typeof v.completed === "boolean"
      );
    case "habit-value":
      return (
        typeof v.habitId === "string" &&
        typeof v.date === "string" &&
        ISO_DATE.test(v.date) &&
        typeof v.value === "number" &&
        Number.isFinite(v.value)
      );
    case "task-completion":
      return typeof v.taskId === "string" && typeof v.completed === "boolean";
    default:
      return false;
  }
}

/** Lê o que estava salvo no aparelho; descarta qualquer item inválido em vez de quebrar. */
export function parseStored(json: string | null): PendingMap {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const result: PendingMap = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (isEntry(entry) && entry.key === key) result[key] = entry;
    }
    return result;
  } catch {
    return {};
  }
}

export function serialize(map: PendingMap): string {
  return JSON.stringify(map);
}

/**
 * - network: sem conexão, servidor indisponível ou página de versão antiga. O item FICA
 *   na fila (nunca é descartado por isso) e é reenviado depois.
 * - permanent: o servidor recebeu e recusou (data inválida, hábito removido...). Descartar.
 * - unknown: erro inesperado. Tenta de novo algumas vezes (MAX_ATTEMPTS) e então desiste,
 *   para que um item "envenenado" não fique para sempre na fila.
 */
export type ErrorKind = "network" | "permanent" | "unknown";

const TRANSIENT_MESSAGE =
  /failed to fetch|fetch failed|networkerror|load failed|network request failed|unexpected response was received|failed to find server action/i;

/**
 * Em produção o Next esconde a mensagem de erros lançados no servidor, mas anexa um
 * `digest`: é assim que reconhecemos "o servidor recebeu e recusou".
 */
export function classifyError(error: unknown, online: boolean): ErrorKind {
  if (!online) return "network";
  if (error instanceof TypeError) return "network";

  if (typeof error === "object" && error !== null) {
    const e = error as { digest?: unknown; message?: unknown };
    if (typeof e.digest === "string") return "permanent";
    if (typeof e.message === "string") {
      if (TRANSIENT_MESSAGE.test(e.message)) return "network";
      if (/An error occurred in the Server Components render/i.test(e.message)) return "permanent";
    }
  }
  return "unknown";
}
