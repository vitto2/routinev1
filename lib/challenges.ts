import { addDaysISO, compareISO, diffInDays } from "@/lib/dates";
import { isScheduledOn } from "@/lib/scheduling";
import { scoreForDays } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

/** Desafio concluído com sucesso quando ao menos 80% dos dias programados foram feitos. */
export const CHALLENGE_SUCCESS_THRESHOLD = 0.8;

export const CHALLENGE_OPTIONS = [21, 30, 66, 90] as const;

export type ChallengeStatus = "upcoming" | "active" | "finished";

export interface ChallengeInfo {
  totalDays: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  /** dia atual do desafio (1 a total); 0 se ainda não começou */
  dayNumber: number;
  /** dias que ainda faltam depois de hoje */
  daysLeft: number;
  /** vezes concluído dentro da janela, até hoje */
  completedDays: number;
  /** dias programados (ou vagas da cota semanal) até hoje */
  scheduledDays: number;
  /** consistência na janela até hoje (pausas não entram) */
  percent: number | null;
  successful: boolean;
}

type ChallengeHabit = Pick<
  HabitWithSchedules,
  "id" | "challenge_days" | "challenge_start_date" | "habit_schedules"
>;

/** Situação do desafio de um hábito, ou null se ele não tem desafio. */
export function challengeOf(
  habit: ChallengeHabit,
  logs: Map<string, HabitLog>, // key: `${habitId}:${data}`
  today: string,
): ChallengeInfo | null {
  const total = habit.challenge_days;
  const start = habit.challenge_start_date;
  if (!total || total <= 0 || !start) return null;

  const endDate = addDaysISO(start, total - 1);
  const window = Array.from({ length: total }, (_, i) => addDaysISO(start, i));

  const status: ChallengeStatus =
    compareISO(today, start) < 0 ? "upcoming" : compareISO(today, endDate) > 0 ? "finished" : "active";

  const dayNumber =
    status === "upcoming" ? 0 : status === "finished" ? total : diffInDays(today, start) + 1;

  const score = scoreForDays([habit as HabitWithSchedules], logs, window, today);
  const completedDays = window.filter(
    (d) =>
      compareISO(d, today) <= 0 &&
      isScheduledOn(habit.habit_schedules, d) &&
      logs.get(`${habit.id}:${d}`)?.completed,
  ).length;

  return {
    totalDays: total,
    startDate: start,
    endDate,
    status,
    dayNumber,
    daysLeft: status === "upcoming" ? total : status === "finished" ? 0 : total - dayNumber,
    completedDays,
    scheduledDays: score.scheduled,
    percent: score.percent,
    successful:
      status === "finished" && score.percent !== null && score.percent >= CHALLENGE_SUCCESS_THRESHOLD,
  };
}
