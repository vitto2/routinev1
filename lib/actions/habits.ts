"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { addDaysISO, todayISO } from "@/lib/dates";
import { habitSchema, type HabitInput } from "@/lib/validation/habit";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

function scheduleColumns(schedule: HabitInput["schedule"]) {
  return {
    schedule_type: schedule.schedule_type,
    weekdays: "weekdays" in schedule ? schedule.weekdays : null,
    frequency_target:
      "frequency_target" in schedule ? schedule.frequency_target : null,
    interval_days: "interval_days" in schedule ? schedule.interval_days : null,
    specific_date:
      "specific_date" in schedule ? schedule.specific_date : null,
  };
}

export async function createHabit(input: HabitInput) {
  const { supabase, user } = await requireUser();
  const data = habitSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  // Hábitos de evitação são sempre registrados como checkbox
  // (cumpri/não cumpri); a semântica invertida fica na UI.
  const trackingType = data.habit_type === "avoid" ? "checkbox" : data.tracking_type;

  const { data: habit, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      pillar_id: data.pillar_id ?? null,
      name: data.name,
      description: data.description ?? null,
      habit_type: data.habit_type,
      tracking_type: trackingType,
      target_value: data.target_value ?? null,
      target_unit: data.target_unit ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: scheduleError } = await supabase.from("habit_schedules").insert({
    habit_id: habit.id,
    start_date: today,
    ...scheduleColumns(data.schedule),
  });

  if (scheduleError) throw new Error(scheduleError.message);

  revalidatePath("/", "layout");
}

async function closeCurrentSchedule(
  supabase: Supabase,
  habitId: string,
  today: string,
) {
  const { error } = await supabase
    .from("habit_schedules")
    .update({ end_date: addDaysISO(today, -1) })
    .eq("habit_id", habitId)
    .is("end_date", null);

  if (error) throw new Error(error.message);
}

export async function updateHabit(habitId: string, input: HabitInput) {
  const { supabase, user } = await requireUser();
  const data = habitSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const trackingType = data.habit_type === "avoid" ? "checkbox" : data.tracking_type;

  const { error } = await supabase
    .from("habits")
    .update({
      pillar_id: data.pillar_id ?? null,
      name: data.name,
      description: data.description ?? null,
      habit_type: data.habit_type,
      tracking_type: trackingType,
      target_value: data.target_value ?? null,
      target_unit: data.target_unit ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
    })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  // Alterar frequência nunca sobrescreve histórico: fecha a linha vigente e
  // cria uma nova a partir de hoje.
  await closeCurrentSchedule(supabase, habitId, today);
  const { error: scheduleError } = await supabase.from("habit_schedules").insert({
    habit_id: habitId,
    start_date: today,
    ...scheduleColumns(data.schedule),
  });

  if (scheduleError) throw new Error(scheduleError.message);

  revalidatePath("/", "layout");
}

export async function archiveHabit(habitId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update({ active: false, archived_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function unarchiveHabit(habitId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("habits")
    .update({ active: true, archived_at: null })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
