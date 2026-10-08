import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export async function getTasksForDate(
  supabase: SupabaseClient<Database>,
  dateISO: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("due_date", dateISO)
    .order("completed", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data;
}

/** Tarefas com data em [startISO, endISO] (resumo do período em Progresso). */
export async function getTasksInRange(
  supabase: SupabaseClient<Database>,
  startISO: string,
  endISO: string,
) {
  const PAGE = 1000;
  const rows: Database["public"]["Tables"]["tasks"]["Row"][] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .gte("due_date", startISO)
      .lte("due_date", endISO)
      .order("due_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE) break;
  }

  return rows;
}

/** Tarefas pendentes de dias anteriores (não somem quando o dia passa). */
export async function getOverdueTasks(
  supabase: SupabaseClient<Database>,
  todayISODate: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("completed", false)
    .lt("due_date", todayISODate)
    .order("due_date", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  return data;
}
