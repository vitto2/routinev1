import type { RoutinePeriod } from "@/types/database.types";

export interface PeriodInfo {
  value: RoutinePeriod;
  label: string;
  hint: string;
  /** ordem de exibição no Hoje */
  order: number;
}

export const ROUTINE_PERIODS: PeriodInfo[] = [
  { value: "morning", label: "Manhã", hint: "Até o meio-dia", order: 0 },
  { value: "afternoon", label: "Tarde", hint: "Do meio-dia às 18h", order: 1 },
  { value: "evening", label: "Noite", hint: "A partir das 18h", order: 2 },
  { value: "custom", label: "Outra", hint: "Sem horário fixo", order: 3 },
];

export const PERIOD_BY_VALUE: Record<RoutinePeriod, PeriodInfo> = Object.fromEntries(
  ROUTINE_PERIODS.map((p) => [p.value, p]),
) as Record<RoutinePeriod, PeriodInfo>;

/** Período do dia correspondente a uma hora local (0 a 23). */
export function periodForHour(hour: number): Exclude<RoutinePeriod, "custom"> {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
