"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { addDaysISO, todayISO } from "@/lib/dates";
import { habitSchema, type HabitInput } from "@/lib/validation/habit";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;
type ScheduleColumns = ReturnType<typeof scheduleColumns>;

function scheduleColumns(schedule: HabitInput["schedule"]) {
  return {
    schedule_type: schedule.schedule_type,
    weekdays:
      "weekdays" in schedule ? [...schedule.weekdays].sort((a, b) => a - b) : null,
    frequency_target:
      "frequency_target" in schedule ? schedule.frequency_target : null,
    interval_days: "interval_days" in schedule ? schedule.interval_days : null,
    specific_date: "specific_date" in schedule ? schedule.specific_date : null,
  };
}

function sameSchedule(
  current: Database["public"]["Tables"]["habit_schedules"]["Row"],
  next: ScheduleColumns,
) {
  return (
    current.schedule_type === next.schedule_type &&
    JSON.stringify(current.weekdays ?? null) === JSON.stringify(next.weekdays) &&
    (current.frequency_target ?? null) === next.frequency_target &&
    (current.interval_days ?? null) === next.interval_days &&
    (current.specific_date ?? null) === next.specific_date
  );
}

async function getCurrentSchedule(supabase: Supabase, habitId: string) {
  const { data, error } = await supabase
    .from("habit_schedules")
    .select("*")
    .eq("habit_id", habitId)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Encerra a agenda vigente sem apagar histórico: se ela começou antes de
 * hoje, fecha em ontem; se começou hoje (nunca valeu em dia passado), some.
 */
async function endCurrentSchedule(
  supabase: Supabase,
  current: Database["public"]["Tables"]["habit_schedules"]["Row"],
  today: string,
) {
  if (current.start_date >= today) {
    const { error } = await supabase
      .from("habit_schedules")
      .delete()
      .eq("id", current.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("habit_schedules")
    .update({ end_date: addDaysISO(today, -1) })
    .eq("id", current.id);
  if (error) throw new Error(error.message);
}

export async function createHabit(input: HabitInput) {
  const { supabase, user } = await requireUser();
  const data = habitSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { data: habit, error } = await supabase
    .from("habits")
    .insert(habitRow(data, user.id))
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

/** Hábitos de evitação são sempre checkbox; unidade deriva do tipo de medição. */
function habitRow(data: HabitInput, userId: string) {
  const trackingType = data.habit_type === "avoid" ? "checkbox" : data.tracking_type;
  const measured = trackingType === "quantity" || trackingType === "time";

  return {
    user_id: userId,
    pillar_id: data.pillar_id ?? null,
    name: data.name,
    description: data.description ?? null,
    habit_type: data.habit_type,
    tracking_type: trackingType,
    target_value: measured ? (data.target_value ?? null) : null,
    target_unit: measured ? (trackingType === "time" ? "min" : "ml") : null,
    icon: data.icon ?? null,
    color: data.color ?? null,
  };
}

export async function updateHabit(habitId: string, input: HabitInput) {
  const { supabase, user } = await requireUser();
  const data = habitSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { user_id: _userId, ...fields } = habitRow(data, user.id);
  void _userId;

  const { data: updated, error } = await supabase
    .from("habits")
    .update(fields)
    .eq("id", habitId)
    .select("active")
    .single();

  if (error) throw new Error(error.message);

  // Habito arquivado não ganha agenda nova (voltaria a aparecer no histórico).
  if (updated.active) {
    const next = scheduleColumns(data.schedule);
    const current = await getCurrentSchedule(supabase, habitId);

    if (!current) {
      const { error: insertError } = await supabase
        .from("habit_schedules")
        .insert({ habit_id: habitId, start_date: today, ...next });
      if (insertError) throw new Error(insertError.message);
    } else if (!sameSchedule(current, next)) {
      if (current.start_date >= today) {
        // Mesma data de início: edita no lugar (não existe histórico a preservar).
        const { error: updateError } = await supabase
          .from("habit_schedules")
          .update(next)
          .eq("id", current.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        // Alterar frequência nunca sobrescreve histórico: fecha a vigente
        // e cria uma nova a partir de hoje.
        await endCurrentSchedule(supabase, current, today);
        const { error: insertError } = await supabase
          .from("habit_schedules")
          .insert({ habit_id: habitId, start_date: today, ...next });
        if (insertError) throw new Error(insertError.message);
      }
    }
  }

  revalidatePath("/", "layout");
}

export async function archiveHabit(habitId: string) {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { error } = await supabase
    .from("habits")
    .update({ active: false, archived_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  // Fecha a agenda vigente: dias passados continuam contando no histórico,
  // dias futuros deixam de exibir o hábito.
  const current = await getCurrentSchedule(supabase, habitId);
  if (current) await endCurrentSchedule(supabase, current, today);

  revalidatePath("/", "layout");
}

export async function unarchiveHabit(habitId: string) {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const { error } = await supabase
    .from("habits")
    .update({ active: true, archived_at: null })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  const { data: last } = await supabase
    .from("habit_schedules")
    .select("*")
    .eq("habit_id", habitId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const open = await getCurrentSchedule(supabase, habitId);
  if (!open) {
    const { error: insertError } = await supabase.from("habit_schedules").insert({
      habit_id: habitId,
      start_date: today,
      schedule_type: last?.schedule_type ?? "daily",
      weekdays: last?.weekdays ?? null,
      frequency_target: last?.frequency_target ?? null,
      interval_days: last?.interval_days ?? null,
      specific_date: last?.specific_date ?? null,
    });
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/", "layout");
}
