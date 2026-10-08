import { addDaysISO, compareISO } from "@/lib/dates";

/** Até quantos dias para trás é possível registrar/corrigir um hábito. */
export const MAX_BACKFILL_DAYS = 400;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Regras para registrar um hábito em `dateISO` (data local do usuário).
 * Devolve a mensagem de erro, ou null se a data é válida.
 */
export function validateLogDate(dateISO: string, todayISODate: string): string | null {
  if (!ISO_DATE.test(dateISO)) return "Data inválida.";
  // "2026-02-31" casa com o formato; round-trip descarta datas inexistentes.
  if (addDaysISO(dateISO, 0) !== dateISO) return "Data inválida.";
  if (compareISO(dateISO, todayISODate) > 0) return "Não é possível registrar dias futuros.";
  if (compareISO(dateISO, addDaysISO(todayISODate, -MAX_BACKFILL_DAYS)) < 0) {
    return "Essa data é antiga demais para ser alterada.";
  }
  return null;
}

/** Valor registrado para hábitos de quantidade/tempo: finito, >= 0 e dentro de um teto sensato. */
export function validateLogValue(value: number): string | null {
  if (!Number.isFinite(value)) return "Valor inválido.";
  if (value < 0) return "O valor não pode ser negativo.";
  if (value > 100000) return "Valor alto demais.";
  return null;
}

export function isCompletedByValue(value: number, target: number | null): boolean {
  return target && target > 0 ? value >= target : value > 0;
}
