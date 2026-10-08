import { addDaysISO, compareISO } from "@/lib/dates";
import { activeScheduleOn } from "@/lib/scheduling";
import type { HabitSchedule } from "@/types/domain";

/**
 * Pausa = lacuna nas agendas temporais do hábito (mesmo mecanismo do arquivamento).
 * Como pontuação, sequência, semana, Hoje e lembretes só consideram dias em que
 * o hábito está agendado, nenhum deles precisa saber que existe uma pausa:
 * dias pausados não entram no denominador e não quebram a sequência.
 */

type ScheduleFields = Omit<HabitSchedule, "id" | "habit_id" | "created_at">;

export type ScheduleOp =
  | { type: "update"; id: string; patch: Partial<Pick<HabitSchedule, "start_date" | "end_date">> }
  | { type: "delete"; id: string }
  | { type: "insert"; row: ScheduleFields };

function clone(schedule: HabitSchedule, start: string, end: string | null): ScheduleFields {
  return {
    schedule_type: schedule.schedule_type,
    weekdays: schedule.weekdays,
    frequency_target: schedule.frequency_target,
    interval_days: schedule.interval_days,
    specific_date: schedule.specific_date,
    start_date: start,
    end_date: end,
  };
}

/**
 * Operações para pausar de `from` até `until` (último dia pausado, inclusive).
 * `until = null` pausa por tempo indeterminado, até alguém retomar.
 * Nunca mexe em dias anteriores a `from`.
 */
export function planPause(
  schedules: HabitSchedule[],
  from: string,
  until: string | null,
): ScheduleOp[] {
  if (until !== null && compareISO(until, from) < 0) return [];

  const resumeOn = until === null ? null : addDaysISO(until, 1);
  const inserts: ScheduleOp[] = [];
  const updates: ScheduleOp[] = [];
  const deletes: ScheduleOp[] = [];

  for (const s of schedules) {
    // Já terminou antes da pausa: intocada.
    if (s.end_date !== null && compareISO(s.end_date, from) < 0) continue;

    if (compareISO(s.start_date, from) >= 0) {
      // Começa dentro ou depois do início da pausa.
      if (resumeOn === null) {
        deletes.push({ type: "delete", id: s.id });
      } else if (compareISO(s.start_date, resumeOn) >= 0) {
        continue; // começa só depois da pausa
      } else if (s.end_date !== null && compareISO(s.end_date, resumeOn) < 0) {
        deletes.push({ type: "delete", id: s.id }); // inteira dentro da pausa
      } else {
        updates.push({ type: "update", id: s.id, patch: { start_date: resumeOn } });
      }
      continue;
    }

    // Começou antes da pausa e atravessa `from`: encerra na véspera.
    updates.push({
      type: "update",
      id: s.id,
      patch: { end_date: addDaysISO(from, -1) },
    });

    // ...e, se continuava depois do fim da pausa, recria a partir do retorno.
    if (resumeOn !== null && (s.end_date === null || compareISO(s.end_date, resumeOn) >= 0)) {
      inserts.push({ type: "insert", row: clone(s, resumeOn, s.end_date) });
    }
  }

  // Inserir antes de alterar: se algo falhar no meio, o hábito nunca fica sem agenda por engano.
  return [...inserts, ...updates, ...deletes];
}

/**
 * Operações para retomar a partir de `from` (normalmente hoje).
 * - Se já há agenda vigente em `from`, não há o que retomar.
 * - Se existe uma agenda futura (pausa com data de retorno), ela passa a valer já.
 * - Pausa indefinida: recria a última agenda a partir de `from`.
 */
export function planResume(schedules: HabitSchedule[], from: string): ScheduleOp[] {
  if (activeScheduleOn(schedules, from)) return [];

  const upcoming = schedules
    .filter((s) => compareISO(s.start_date, from) > 0)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  if (upcoming) {
    return [{ type: "update", id: upcoming.id, patch: { start_date: from } }];
  }

  const last = [...schedules].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
  return last ? [{ type: "insert", row: clone(last, from, null) }] : [];
}

export interface PauseState {
  paused: boolean;
  /** primeiro dia de volta quando a pausa tem data de retorno; null se indefinida */
  resumesOn: string | null;
}

/** O hábito (ativo) está em pausa hoje? */
export function pauseState(
  schedules: HabitSchedule[],
  today: string,
  active: boolean,
): PauseState {
  if (!active || schedules.length === 0 || activeScheduleOn(schedules, today)) {
    return { paused: false, resumesOn: null };
  }

  const upcoming = schedules
    .filter((s) => compareISO(s.start_date, today) > 0)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  return { paused: true, resumesOn: upcoming?.start_date ?? null };
}

export interface PausedHabit {
  id: string;
  name: string;
  resumesOn: string | null;
}

/** Hábitos ativos que estão em pausa hoje, com a data de retorno quando há. */
export function pausedHabits(
  habits: { id: string; name: string; active: boolean; habit_schedules: HabitSchedule[] }[],
  today: string,
): PausedHabit[] {
  const result: PausedHabit[] = [];
  for (const habit of habits) {
    const state = pauseState(habit.habit_schedules, today, habit.active);
    if (state.paused) result.push({ id: habit.id, name: habit.name, resumesOn: state.resumesOn });
  }
  return result;
}
