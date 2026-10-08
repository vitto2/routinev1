"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getHabitWithSchedules } from "@/lib/data/habits";
import { getLogsForHabit } from "@/lib/data/logs";
import { getOrCreateProfile } from "@/lib/data/profile";
import { addDaysISO, todayISO } from "@/lib/dates";
import { milestoneCrossed, type StreakUnit } from "@/lib/gamification";
import {
  MAX_BACKFILL_DAYS,
  isCompletedByValue,
  validateLogDate,
  validateLogValue,
} from "@/lib/logging/rules";
import { isScheduledOn } from "@/lib/scheduling";
import { computeStreak } from "@/lib/scoring";
import type { Database } from "@/types/database.types";
import type { HabitWithSchedules } from "@/types/domain";

type Supabase = SupabaseClient<Database>;

export interface LogResult {
  completed: boolean;
  value: number;
  note: string | null;
  streak: { current: number; best: number; unit: StreakUnit };
  /** marco de sequência recém-atingido (3, 7, 14...) ou null */
  milestone: number | null;
  newBest: boolean;
}

const idSchema = z.uuid();
const MAX_NOTE_LENGTH = 280;

/**
 * Valida tudo o que vem do cliente antes de gravar: dono do hábito (RLS),
 * data (formato, não futura, janela de 400 dias) e se o hábito estava
 * programado naquele dia.
 */
async function loadContext(habitId: string, dateISO: string) {
  const { supabase, user } = await requireUser();
  const id = idSchema.parse(habitId);
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const dateError = validateLogDate(dateISO, today);
  if (dateError) throw new Error(dateError);

  const habit = await getHabitWithSchedules(supabase, id);
  if (!habit) throw new Error("Hábito não encontrado.");
  if (!isScheduledOn(habit.habit_schedules, dateISO)) {
    throw new Error("Este hábito não está programado para esse dia.");
  }

  return { supabase, user, habit, today };
}

async function readLog(supabase: Supabase, habitId: string, dateISO: string) {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("log_date", dateISO)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Sequência depois da gravação, comparada com a de antes, para saber se houve marco. */
async function summarizeStreak(
  supabase: Supabase,
  habit: HabitWithSchedules,
  today: string,
  dateISO: string,
  previousCompleted: boolean,
): Promise<Pick<LogResult, "streak" | "milestone" | "newBest">> {
  const logs = await getLogsForHabit(supabase, habit.id, {
    sinceISO: addDaysISO(today, -MAX_BACKFILL_DAYS),
  });
  const after = computeStreak(habit, logs, today, MAX_BACKFILL_DAYS);

  const entry = logs.get(dateISO);
  const beforeLogs = new Map(logs);
  if (entry) beforeLogs.set(dateISO, { ...entry, completed: previousCompleted });
  const before = computeStreak(habit, beforeLogs, today, MAX_BACKFILL_DAYS);

  const completedNow = entry?.completed ?? false;

  return {
    streak: { current: after.current, best: after.best, unit: after.unit },
    milestone: completedNow ? milestoneCrossed(before.current, after.current) : null,
    newBest: completedNow && after.best > before.best && after.current >= 3,
  };
}

/**
 * Marca ou desmarca um hábito de checkbox/evitar em `dateISO`.
 * Recebe o estado desejado (não "alternar"): repetir a chamada, desfazer e
 * sincronizar a fila offline nunca invertem o resultado.
 */
export async function setHabitCompletion(
  habitId: string,
  dateISO: string,
  completed: boolean,
): Promise<LogResult> {
  const { supabase, user, habit, today } = await loadContext(habitId, dateISO);

  if (habit.tracking_type !== "checkbox") {
    throw new Error("Este hábito é registrado por valor, não por marcação.");
  }

  const existing = await readLog(supabase, habit.id, dateISO);
  let row = existing;

  // Desmarcar algo que nunca foi registrado não precisa criar linha.
  if (existing || completed) {
    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: habit.id, user_id: user.id, log_date: dateISO, completed },
        { onConflict: "habit_id,log_date" },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    row = data;
  }

  const summary = await summarizeStreak(
    supabase,
    habit,
    today,
    dateISO,
    existing?.completed ?? false,
  );

  revalidatePath("/", "layout");

  return {
    completed: row?.completed ?? false,
    value: Number(row?.value ?? 0),
    note: row?.note ?? null,
    ...summary,
  };
}

/**
 * Define o valor do dia (ml, minutos) de um hábito de quantidade/tempo.
 * Valor absoluto: o cliente soma os incrementos localmente e envia o total.
 */
export async function setHabitValue(
  habitId: string,
  dateISO: string,
  value: number,
): Promise<LogResult> {
  const { supabase, user, habit, today } = await loadContext(habitId, dateISO);

  if (habit.tracking_type === "checkbox") {
    throw new Error("Este hábito é marcado como feito ou não feito.");
  }

  const valueError = validateLogValue(value);
  if (valueError) throw new Error(valueError);

  const rounded = Math.round(value * 100) / 100;
  const completed = isCompletedByValue(rounded, habit.target_value);
  const existing = await readLog(supabase, habit.id, dateISO);
  let row = existing;

  if (existing || rounded > 0) {
    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id: habit.id,
          user_id: user.id,
          log_date: dateISO,
          value: rounded,
          completed,
        },
        { onConflict: "habit_id,log_date" },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    row = data;
  }

  const summary = await summarizeStreak(
    supabase,
    habit,
    today,
    dateISO,
    existing?.completed ?? false,
  );

  revalidatePath("/", "layout");

  return {
    completed: row?.completed ?? false,
    value: Number(row?.value ?? 0),
    note: row?.note ?? null,
    ...summary,
  };
}

/**
 * Nota do dia para um hábito. Só toca na coluna `note`: `completed` e
 * `value` ficam como estão (a coluna não vai no upsert quando já há registro).
 */
export async function setHabitNote(
  habitId: string,
  dateISO: string,
  note: string | null,
): Promise<{ note: string | null }> {
  const { supabase, user, habit } = await loadContext(habitId, dateISO);

  const clean = (note ?? "").trim();
  if (clean.length > MAX_NOTE_LENGTH) {
    throw new Error(`A nota pode ter até ${MAX_NOTE_LENGTH} caracteres.`);
  }

  const existing = await readLog(supabase, habit.id, dateISO);

  // Nota vazia sem registro: nada a gravar (evita linhas vazias).
  if (!existing && clean === "") return { note: null };

  const { data, error } = await supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: habit.id,
        user_id: user.id,
        log_date: dateISO,
        note: clean === "" ? null : clean,
      },
      { onConflict: "habit_id,log_date" },
    )
    .select("note")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return { note: data.note };
}
