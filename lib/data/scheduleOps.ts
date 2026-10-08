import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduleOp } from "@/lib/scheduling/pause";
import type { Database } from "@/types/database.types";

/** Aplica, em ordem, as operações planejadas sobre as agendas de um hábito. */
export async function applyScheduleOps(
  supabase: SupabaseClient<Database>,
  habitId: string,
  ops: ScheduleOp[],
) {
  for (const op of ops) {
    if (op.type === "insert") {
      const { error } = await supabase
        .from("habit_schedules")
        .insert({ habit_id: habitId, ...op.row });
      if (error) throw new Error(error.message);
    } else if (op.type === "update") {
      const { error } = await supabase
        .from("habit_schedules")
        .update(op.patch)
        .eq("id", op.id)
        .eq("habit_id", habitId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("habit_schedules")
        .delete()
        .eq("id", op.id)
        .eq("habit_id", habitId);
      if (error) throw new Error(error.message);
    }
  }
}
