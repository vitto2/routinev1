"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

async function getHabitTarget(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  habitId: string,
) {
  const { data, error } = await supabase
    .from("habits")
    .select("target_value, tracking_type")
    .eq("id", habitId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function getExistingLog(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  habitId: string,
  dateISO: string,
) {
  const { data } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("log_date", dateISO)
    .maybeSingle();

  return data;
}

/** checkbox e avoid: alterna concluído/não concluído (1 toque). */
export async function toggleHabitCompletion(habitId: string, dateISO: string) {
  const { supabase, user } = await requireUser();
  const existing = await getExistingLog(supabase, habitId, dateISO);
  const nextCompleted = !(existing?.completed ?? false);

  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      log_date: dateISO,
      completed: nextCompleted,
    },
    { onConflict: "habit_id,log_date" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** quantity/time: soma um incremento rápido (+250ml, +15min, ...). */
export async function addHabitProgress(
  habitId: string,
  dateISO: string,
  delta: number,
) {
  const { supabase, user } = await requireUser();
  const [existing, habit] = await Promise.all([
    getExistingLog(supabase, habitId, dateISO),
    getHabitTarget(supabase, habitId),
  ]);

  const nextValue = Math.max(0, (existing?.value ?? 0) + delta);
  const target = habit.target_value ?? 0;
  const completed = target > 0 ? nextValue >= target : nextValue > 0;

  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      log_date: dateISO,
      value: nextValue,
      completed,
    },
    { onConflict: "habit_id,log_date" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** quantity/time: define o valor exato do dia (registro manual). */
export async function setHabitProgress(
  habitId: string,
  dateISO: string,
  value: number,
) {
  const { supabase, user } = await requireUser();
  const habit = await getHabitTarget(supabase, habitId);
  const target = habit.target_value ?? 0;
  const completed = target > 0 ? value >= target : value > 0;

  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      log_date: dateISO,
      value: Math.max(0, value),
      completed,
    },
    { onConflict: "habit_id,log_date" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
