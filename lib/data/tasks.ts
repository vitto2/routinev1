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
