import { addDaysISO, compareISO, formatDisplayDate } from "@/lib/dates";
import { dailyScore, scoreForDays, type Score } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export interface ReviewHabit {
  habitId: string;
  name: string;
  scheduled: number;
  completed: number;
  percent: number;
}

export interface ReviewDay {
  date: string;
  percent: number;
}

export type SuggestionKind = "praise" | "tip" | "info";

export interface Suggestion {
  kind: SuggestionKind;
  text: string;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  /** a semana já terminou (o último dia é anterior a hoje) */
  ended: boolean;
  score: Score;
  previous: Score;
  /** diferença em pontos percentuais em relação à semana anterior (null se não comparável) */
  deltaPoints: number | null;
  bestDay: ReviewDay | null;
  worstDay: ReviewDay | null;
  perfectDays: number;
  habits: ReviewHabit[];
  strongest: ReviewHabit | null;
  weakest: ReviewHabit | null;
  suggestions: Suggestion[];
}

type LogMap = Map<string, HabitLog>;

const LOW = 0.5;
const CHRONIC_WEEKS = 3;
const MAX_SUGGESTIONS = 3;

const pct = (value: number) => Math.round(value * 100);

function weekDays(start: string) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
}

function habitStats(
  habits: HabitWithSchedules[],
  logs: LogMap,
  days: string[],
  today: string,
): ReviewHabit[] {
  const result: ReviewHabit[] = [];

  for (const habit of habits) {
    const score = scoreForDays([habit], logs, days, today);
    if (score.percent === null || score.scheduled === 0) continue;
    result.push({
      habitId: habit.id,
      name: habit.name,
      scheduled: score.scheduled,
      completed: score.completed,
      percent: score.percent,
    });
  }

  return result;
}

export function buildWeeklyReview(
  habits: HabitWithSchedules[],
  logs: LogMap,
  weekStart: string,
  today: string,
): WeeklyReview {
  const days = weekDays(weekStart);
  const weekEnd = days[6];
  const previousStart = addDaysISO(weekStart, -7);

  const score = scoreForDays(habits, logs, days, today);
  const previous = scoreForDays(habits, logs, weekDays(previousStart), today);
  const deltaPoints =
    score.percent !== null && previous.percent !== null
      ? Math.round((score.percent - previous.percent) * 100)
      : null;

  // Melhor/pior dia entre os dias (já vividos) com algo programado.
  const scoredDays: ReviewDay[] = [];
  let perfectDays = 0;
  for (const date of days) {
    if (compareISO(date, today) > 0) continue;
    const logsForDay = new Map<string, HabitLog>();
    for (const habit of habits) {
      const log = logs.get(`${habit.id}:${date}`);
      if (log) logsForDay.set(habit.id, log);
    }
    const day = dailyScore(habits, logsForDay, date);
    if (day.percent === null) continue;
    scoredDays.push({ date, percent: day.percent });
    if (day.percent === 1) perfectDays += 1;
  }

  const bestDay = scoredDays.reduce<ReviewDay | null>(
    (best, d) => (best === null || d.percent > best.percent ? d : best),
    null,
  );
  const worstDay =
    scoredDays.length >= 2
      ? scoredDays.reduce<ReviewDay | null>(
          (worst, d) => (worst === null || d.percent < worst.percent ? d : worst),
          null,
        )
      : null;

  const habitList = habitStats(habits, logs, days, today).sort(
    (a, b) => b.percent - a.percent || b.scheduled - a.scheduled,
  );
  const strongest = habitList[0] ?? null;
  const weakest =
    habitList.length >= 2 ? habitList[habitList.length - 1] : null;

  // --- sugestões (tom encorajador; poucas e só com dados suficientes) ---
  const suggestions: Suggestion[] = [];

  if (score.percent === null) {
    suggestions.push({
      kind: "info",
      text: "Nenhum hábito de dia fixo foi programado nesta semana.",
    });
  } else if (score.percent >= 0.9) {
    suggestions.push({
      kind: "praise",
      text: `Semana excelente: ${pct(score.percent)}% dos hábitos concluídos.`,
    });
  }

  if (deltaPoints !== null) {
    if (deltaPoints >= 10) {
      suggestions.push({
        kind: "praise",
        text: `Você subiu ${deltaPoints} pontos percentuais em relação à semana anterior.`,
      });
    } else if (deltaPoints <= -15) {
      suggestions.push({
        kind: "tip",
        text: "A semana foi mais puxada que a anterior. Uma semana difícil não define sua rotina: comece de novo por um hábito só.",
      });
    }
  }

  // Hábito abaixo de 50% por 3 semanas seguidas (com ao menos 2 registros programados em cada).
  const chronic = new Set<string>();
  for (const candidate of habitList) {
    const habit = habits.find((h) => h.id === candidate.habitId);
    if (!habit) continue;

    let lowWeeks = 0;
    for (let back = 0; back < CHRONIC_WEEKS; back++) {
      const start = addDaysISO(weekStart, -7 * back);
      const weekScore = scoreForDays([habit], logs, weekDays(start), today);
      if (weekScore.percent !== null && weekScore.scheduled >= 2 && weekScore.percent < LOW) {
        lowWeeks += 1;
      }
    }
    if (lowWeeks === CHRONIC_WEEKS) {
      chronic.add(habit.id);
      suggestions.push({
        kind: "tip",
        text: `${habit.name} ficou abaixo de 50% por ${CHRONIC_WEEKS} semanas seguidas. Vale reduzir a meta ou a frequência para recuperar o ritmo.`,
      });
    }
  }

  if (
    weakest &&
    !chronic.has(weakest.habitId) &&
    weakest.percent < LOW &&
    weakest.scheduled >= 3
  ) {
    suggestions.push({
      kind: "tip",
      text: `${weakest.name} foi o mais difícil (${pct(weakest.percent)}%). Que tal mudar o horário ou a meta?`,
    });
  }

  return {
    weekStart,
    weekEnd,
    ended: compareISO(weekEnd, today) < 0,
    score,
    previous,
    deltaPoints,
    bestDay,
    worstDay,
    perfectDays,
    habits: habitList,
    strongest,
    weakest,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
  };
}

export function describeWeek(review: Pick<WeeklyReview, "weekStart" | "weekEnd">) {
  return `${formatDisplayDate(review.weekStart)} a ${formatDisplayDate(review.weekEnd)}`;
}
