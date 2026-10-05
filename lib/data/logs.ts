import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { HabitLog } from "@/types/domain";

export async function getLogsForDate(
  supabase: SupabaseClient<Database>,
  dateISO: string,
): Promise<Map<string, HabitLog>> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("log_date", dateISO);

  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((log) => [log.habit_id, log]));
}

/** Logs de um intervalo [startISO, endISO] inclusive, indexados por `${habit_id}:${log_date}`. */
export async function getLogsForRange(
  supabase: SupabaseClient<Database>,
  startISO: string,
  endISO: string,
): Promise<Map<string, HabitLog>> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .gte("log_date", startISO)
    .lte("log_date", endISO);

  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((log) => [`${log.habit_id}:${log.log_date}`, log]));
}

export async function getLogsForHabit(
  supabase: SupabaseClient<Database>,
  habitId: string,
  { sinceISO }: { sinceISO?: string } = {},
): Promise<Map<string, HabitLog>> {
  let query = supabase.from("habit_logs").select("*").eq("habit_id", habitId);
  if (sinceISO) query = query.gte("log_date", sinceISO);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((log) => [log.log_date, log]));
}
