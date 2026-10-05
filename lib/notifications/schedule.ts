import { formatInTimeZone } from "date-fns-tz";

/** Janelas (hora local do usuário) em que cada tipo de lembrete pode sair. */
export const DIGEST_HOURS = { from: 9, to: 20 } as const;
export const EVENING_HOURS = { from: 18, to: 22 } as const;

/** Quantos minutos antes do horário da tarefa avisar, e por quanto tempo ainda vale avisar depois. */
export const TASK_LEAD_MINUTES = 15;
export const TASK_GRACE_MINUTES = 60;

export interface LocalMoment {
  date: string; // YYYY-MM-DD no fuso do usuário
  hour: number;
  minutes: number; // minutos desde 00:00 local
}

export function localMoment(now: Date, timezone: string): LocalMoment {
  const date = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const hour = Number(formatInTimeZone(now, timezone, "H"));
  const minute = Number(formatInTimeZone(now, timezone, "m"));
  return { date, hour, minutes: hour * 60 + minute };
}

export function inWindow(hour: number, window: { from: number; to: number }) {
  return hour >= window.from && hour < window.to;
}

/** "HH:MM" ou "HH:MM:SS" -> minutos desde 00:00. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** A tarefa com horário já está na janela de aviso? (15 min antes até 60 min depois) */
export function isTaskReminderDue(
  task: { due_date: string; due_time: string },
  moment: LocalMoment,
): boolean {
  if (task.due_date !== moment.date) return false;
  const due = timeToMinutes(task.due_time);
  return (
    moment.minutes >= due - TASK_LEAD_MINUTES &&
    moment.minutes < due + TASK_GRACE_MINUTES
  );
}

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
