import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { HabitLog } from "@/types/domain";

/** Limite padrão de linhas por requisição do PostgREST/Supabase. */
const PAGE_SIZE = 1000;

/**
 * Lê todas as páginas de uma consulta. A ordenação precisa ser determinística
 * (log_date + id), senão linhas podem repetir ou sumir entre páginas.
 */
async function fetchAllLogs(
  supabase: SupabaseClient<Database>,
  build: (query: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>,
): Promise<HabitLog[]> {
  const rows: HabitLog[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(baseQuery(supabase))
      .order("log_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  return rows;
}

function baseQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("habit_logs").select("*");
}

export async function getLogsForDate(
  supabase: SupabaseClient<Database>,
  dateISO: string,
): Promise<Map<string, HabitLog>> {
  const logs = await fetchAllLogs(supabase, (q) => q.eq("log_date", dateISO));
  return new Map(logs.map((log) => [log.habit_id, log]));
}

/** Logs de [startISO, endISO] inclusive, indexados por `${habit_id}:${log_date}`. */
export async function getLogsForRange(
  supabase: SupabaseClient<Database>,
  startISO: string,
  endISO: string,
): Promise<Map<string, HabitLog>> {
  const logs = await fetchAllLogs(supabase, (q) =>
    q.gte("log_date", startISO).lte("log_date", endISO),
  );
  return new Map(logs.map((log) => [`${log.habit_id}:${log.log_date}`, log]));
}

/** Todos os logs de um hábito (opcionalmente a partir de uma data), indexados por data. */
export async function getLogsForHabit(
  supabase: SupabaseClient<Database>,
  habitId: string,
  { sinceISO }: { sinceISO?: string } = {},
): Promise<Map<string, HabitLog>> {
  const logs = await fetchAllLogs(supabase, (q) => {
    const scoped = q.eq("habit_id", habitId);
    return sinceISO ? scoped.gte("log_date", sinceISO) : scoped;
  });
  return new Map(logs.map((log) => [log.log_date, log]));
}

/** Agrupa um mapa `${habitId}:${data}` em mapas por hábito (para calcular sequências). */
export function groupLogsByHabit(
  logs: Map<string, HabitLog>,
): Map<string, Map<string, HabitLog>> {
  const byHabit = new Map<string, Map<string, HabitLog>>();
  for (const log of logs.values()) {
    const inner = byHabit.get(log.habit_id) ?? new Map<string, HabitLog>();
    inner.set(log.log_date, log);
    byHabit.set(log.habit_id, inner);
  }
  return byHabit;
}
