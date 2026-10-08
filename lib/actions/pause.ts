"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { applyScheduleOps } from "@/lib/data/scheduleOps";
import { addDaysISO, compareISO, todayISO } from "@/lib/dates";
import { MAX_BACKFILL_DAYS } from "@/lib/logging/rules";
import { planPause, planResume } from "@/lib/scheduling/pause";
import type { HabitWithSchedules } from "@/types/domain";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pauseSchema = z.object({
  /** null = todos os hábitos ativos */
  habitIds: z.array(z.uuid()).max(200).nullable(),
  /** primeiro dia de volta; null = pausa indefinida até retomar */
  resumeOn: isoDate.nullable(),
});

const resumeSchema = z.object({
  habitIds: z.array(z.uuid()).max(200).nullable(),
});

async function loadActiveHabits(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  habitIds: string[] | null,
): Promise<HabitWithSchedules[]> {
  let query = supabase.from("habits").select("*, habit_schedules(*)").eq("active", true);
  if (habitIds) query = query.in("id", habitIds);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HabitWithSchedules[];
}

/**
 * Pausa hábitos a partir de hoje. Só reescreve agendas (nunca apaga registros),
 * então pontuação e sequências continuam corretas durante e depois da pausa.
 */
export async function pauseHabits(input: z.input<typeof pauseSchema>) {
  const { supabase, user } = await requireUser();
  const data = pauseSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  if (data.resumeOn !== null) {
    if (addDaysISO(data.resumeOn, 0) !== data.resumeOn) throw new Error("Data inválida.");
    if (compareISO(data.resumeOn, today) <= 0) {
      throw new Error("A data de retorno precisa ser depois de hoje.");
    }
    if (compareISO(data.resumeOn, addDaysISO(today, MAX_BACKFILL_DAYS)) > 0) {
      throw new Error("A data de retorno é distante demais.");
    }
  }

  const until = data.resumeOn === null ? null : addDaysISO(data.resumeOn, -1);
  const habits = await loadActiveHabits(supabase, data.habitIds);

  for (const habit of habits) {
    await applyScheduleOps(supabase, habit.id, planPause(habit.habit_schedules, today, until));
  }

  revalidatePath("/", "layout");
  return { paused: habits.length };
}

/** Retoma hoje os hábitos pausados (ou que voltariam numa data futura). */
export async function resumeHabits(input: z.input<typeof resumeSchema>) {
  const { supabase, user } = await requireUser();
  const data = resumeSchema.parse(input);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const habits = await loadActiveHabits(supabase, data.habitIds);
  let resumed = 0;

  for (const habit of habits) {
    const ops = planResume(habit.habit_schedules, today);
    if (ops.length === 0) continue;
    await applyScheduleOps(supabase, habit.id, ops);
    resumed += 1;
  }

  revalidatePath("/", "layout");
  return { resumed };
}
