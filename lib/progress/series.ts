import {
  addDaysISO,
  addMonths,
  daysOfMonth,
  formatDisplayDate,
  monthLabel,
  monthOf,
  monthShort,
  weekRangeOf,
} from "@/lib/dates";
import { scoreForDays } from "@/lib/scoring";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

export interface SeriesPoint {
  key: string;
  /** rótulo curto do eixo ("28/09", "out") */
  label: string;
  /** descrição completa, para leitor de tela e dica */
  detail: string;
  /** 0 a 1, ou null quando nada estava programado no período */
  percent: number | null;
  scheduled: number;
  completed: number;
  /** período ainda em andamento: não entra no cálculo de tendência */
  partial: boolean;
}

type LogMap = Map<string, HabitLog>;

const shortDate = (dateISO: string) => formatDisplayDate(dateISO).slice(0, 5);

/** Últimas `weeks` semanas (segunda a domingo), da mais antiga para a atual. */
export function weeklySeries(
  habits: HabitWithSchedules[],
  logs: LogMap,
  today: string,
  weeks = 8,
): SeriesPoint[] {
  const currentStart = weekRangeOf(today).start;

  return Array.from({ length: weeks }, (_, index) => {
    const back = weeks - 1 - index;
    const start = addDaysISO(currentStart, -7 * back);
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
    const score = scoreForDays(habits, logs, days, today);

    return {
      key: start,
      label: shortDate(start),
      detail: `Semana de ${formatDisplayDate(start)} a ${formatDisplayDate(days[6])}`,
      percent: score.percent,
      scheduled: score.scheduled,
      completed: score.completed,
      partial: back === 0,
    };
  });
}

/** Últimos `months` meses, do mais antigo para o atual. */
export function monthlySeries(
  habits: HabitWithSchedules[],
  logs: LogMap,
  today: string,
  months = 6,
): SeriesPoint[] {
  const current = monthOf(today);

  return Array.from({ length: months }, (_, index) => {
    const back = months - 1 - index;
    const month = addMonths(current, -back);
    const score = scoreForDays(habits, logs, daysOfMonth(month), today);

    return {
      key: month,
      label: monthShort(month),
      detail: monthLabel(month),
      percent: score.percent,
      scheduled: score.scheduled,
      completed: score.completed,
      partial: back === 0,
    };
  });
}

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface Trend {
  direction: TrendDirection;
  /** variação média por período, em pontos percentuais */
  pointsPerPeriod: number;
}

/**
 * Tendência por mínimos quadrados sobre os períodos já encerrados e com dados.
 * Com menos de 3 pontos não afirma nada ("unknown"); variações pequenas contam como estáveis.
 */
export function seriesTrend(points: SeriesPoint[], flatThresholdPoints = 1.5): Trend {
  const usable = points
    .map((p, x) => ({ x, y: p.percent, partial: p.partial }))
    .filter((p): p is { x: number; y: number; partial: boolean } => p.y !== null && !p.partial);

  if (usable.length < 3) return { direction: "unknown", pointsPerPeriod: 0 };

  const n = usable.length;
  const meanX = usable.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = usable.reduce((sum, p) => sum + p.y, 0) / n;
  const numerator = usable.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const denominator = usable.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const slopePoints = denominator === 0 ? 0 : (numerator / denominator) * 100;

  const direction: TrendDirection =
    Math.abs(slopePoints) < flatThresholdPoints ? "flat" : slopePoints > 0 ? "up" : "down";

  return { direction, pointsPerPeriod: Math.round(slopePoints * 10) / 10 };
}
