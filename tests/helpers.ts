import type { HabitLog, HabitWithSchedules } from "@/types/domain";

type ScheduleOverrides = Partial<HabitWithSchedules["habit_schedules"][number]>;

/** Hábito de teste com uma agenda aberta a partir de `start` (data local YYYY-MM-DD). */
export function habit(
  id: string,
  schedule: ScheduleOverrides,
  start = "2026-09-28",
): HabitWithSchedules {
  return {
    id,
    user_id: "u",
    pillar_id: null,
    name: id,
    description: null,
    habit_type: "build",
    tracking_type: "checkbox",
    target_value: null,
    target_unit: null,
    icon: null,
    color: null,
    active: true,
    archived_at: null,
    sort_order: 0,
    created_at: `${start}T23:30:00Z`,
    updated_at: "",
    habit_schedules: [
      {
        id: `${id}-s`,
        habit_id: id,
        schedule_type: "daily",
        weekdays: null,
        frequency_target: null,
        interval_days: null,
        specific_date: null,
        start_date: start,
        end_date: null,
        created_at: "",
        ...schedule,
      },
    ],
  } as HabitWithSchedules;
}

/** Log de quantidade/tempo com valor registrado. */
export function logValue(
  habitId: string,
  date: string,
  value: number,
  completed = false,
): [string, HabitLog] {
  const [key, base] = log(habitId, date, completed);
  return [key, { ...base, value }];
}

/** Mapa de logs de um hábito nas datas informadas (chave `${habitId}:${data}`). */
export function logsOn(
  habitId: string,
  dates: string[],
  completed = true,
): Map<string, HabitLog> {
  return new Map(dates.map((date) => log(habitId, date, completed)));
}

/** Junta vários mapas de logs. */
export function mergeLogs(...maps: Map<string, HabitLog>[]): Map<string, HabitLog> {
  return new Map(maps.flatMap((m) => [...m.entries()]));
}

export function log(habitId: string, date: string, completed = true): [string, HabitLog] {
  return [
    `${habitId}:${date}`,
    {
      id: "",
      habit_id: habitId,
      user_id: "u",
      log_date: date,
      value: null,
      completed,
      note: null,
      created_at: "",
      updated_at: "",
    },
  ];
}
