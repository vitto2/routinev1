import { WEEKDAY_NAMES, formatDisplayDate } from "@/lib/dates";
import type { HabitSchedule } from "@/types/domain";

export interface ScheduleLike {
  schedule_type: HabitSchedule["schedule_type"];
  weekdays?: number[] | null;
  frequency_target?: number | null;
  interval_days?: number | null;
  specific_date?: string | null;
}

const PLURAL: Record<number, string> = {
  0: "domingos",
  1: "segundas",
  2: "terças",
  3: "quartas",
  4: "quintas",
  5: "sextas",
  6: "sábados",
};

function listPt(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Frequência em linguagem natural, para listas e para o resumo ao vivo do formulário. */
export function describeSchedule(schedule: ScheduleLike | null | undefined): string {
  if (!schedule) return "Sem frequência definida";

  switch (schedule.schedule_type) {
    case "daily":
      return "Todos os dias";
    case "weekdays": {
      const days = [...new Set(schedule.weekdays ?? [])].sort((a, b) => a - b);
      if (days.length === 0) return "Escolha os dias da semana";
      if (days.length === 7) return "Todos os dias";
      if (days.join() === "1,2,3,4,5") return "Dias úteis (segunda a sexta)";
      if (days.join() === "0,6") return "Fins de semana";
      if (days.length === 1) return `Toda ${WEEKDAY_NAMES[days[0]]}`.replace(
        /Toda (domingo|sábado)/,
        "Todo $1",
      );
      // Segunda primeiro, domingo por último
      const ordered = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      return `${listPt(ordered.map((d) => PLURAL[d]))}`.replace(/^./, (c) => c.toUpperCase());
    }
    case "x_per_week": {
      const n = schedule.frequency_target ?? 0;
      return n === 1 ? "1 vez por semana" : `${n} vezes por semana, nos dias que quiser`;
    }
    case "specific_date":
      return schedule.specific_date
        ? `Uma vez, em ${formatDisplayDate(schedule.specific_date)}`
        : "Escolha a data";
    case "interval":
      return `A cada ${schedule.interval_days ?? "?"} dias`;
    default:
      return "";
  }
}

export function scheduleSummary(schedule: HabitSchedule | undefined): string {
  return describeSchedule(schedule);
}
