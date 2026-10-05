import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { HabitWithSchedules } from "@/types/domain";

export async function getActiveHabitsWithSchedules(
  supabase: SupabaseClient<Database>,
): Promise<HabitWithSchedules[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*, habit_schedules(*)")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HabitWithSchedules[];
}

export async function getHabitWithSchedules(
  supabase: SupabaseClient<Database>,
  habitId: string,
): Promise<HabitWithSchedules | null> {
  const { data, error } = await supabase
    .from("habits")
    .select("*, habit_schedules(*)")
    .eq("id", habitId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as HabitWithSchedules | null;
}

export async function getAllHabits(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}
