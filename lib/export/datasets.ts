import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import { getPillars } from "@/lib/data/pillars";
import { getRoutines } from "@/lib/data/routines";
import { getTasksInRange } from "@/lib/data/tasks";
import { describeSchedule } from "@/lib/scheduling/summary";
import type { CsvCell } from "@/lib/export/csv";
import type { Database } from "@/types/database.types";
import type { HabitWithSchedules } from "@/types/domain";

type Supabase = SupabaseClient<Database>;

export interface Dataset {
  headers: string[];
  rows: CsvCell[][];
}

const FIRST_DAY = "0001-01-01";
const LAST_DAY = "9999-12-31";

const MEASURE: Record<HabitWithSchedules["tracking_type"], string> = {
  checkbox: "marcar",
  quantity: "quantidade",
  time: "tempo",
};

const PRIORITY: Record<"low" | "medium" | "high", string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

/** Um registro por linha: o que foi feito em cada dia, com valores e notas. */
export async function buildLogsDataset(supabase: Supabase): Promise<Dataset> {
  const [habits, pillars, logs] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getPillars(supabase, { includeArchived: true }),
    getLogsForRange(supabase, FIRST_DAY, LAST_DAY),
  ]);
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  const rows: CsvCell[][] = [];
  for (const log of logs.values()) {
    const habit = habitById.get(log.habit_id);
    if (!habit) continue;
    rows.push([
      log.log_date,
      habit.name,
      (habit.pillar_id && pillarById.get(habit.pillar_id)?.name) || "",
      habit.habit_type === "avoid" ? "evitar" : "fazer",
      MEASURE[habit.tracking_type],
      log.value === null ? null : Number(log.value),
      habit.target_unit ?? "",
      habit.target_value === null ? null : Number(habit.target_value),
      log.completed,
      log.note ?? "",
    ]);
  }

  return {
    headers: ["data", "habito", "pilar", "tipo", "medicao", "valor", "unidade", "meta", "concluido", "nota"],
    rows,
  };
}

export async function buildTasksDataset(supabase: Supabase): Promise<Dataset> {
  const [tasks, pillars] = await Promise.all([
    getTasksInRange(supabase, FIRST_DAY, LAST_DAY),
    getPillars(supabase, { includeArchived: true }),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  return {
    headers: [
      "titulo",
      "descricao",
      "data",
      "horario",
      "prioridade",
      "pilar",
      "concluida",
      "concluida_em",
      "criada_em",
    ],
    rows: tasks.map((task) => [
      task.title,
      task.description ?? "",
      task.due_date,
      task.due_time?.slice(0, 5) ?? "",
      PRIORITY[task.priority],
      (task.pillar_id && pillarById.get(task.pillar_id)?.name) || "",
      task.completed,
      task.completed_at ?? "",
      task.created_at,
    ]),
  };
}

export async function buildHabitsDataset(supabase: Supabase): Promise<Dataset> {
  const [habits, pillars, routines] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getPillars(supabase, { includeArchived: true }),
    getRoutines(supabase),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  const routineById = new Map(routines.map((r) => [r.id, r]));

  return {
    headers: [
      "nome",
      "descricao",
      "pilar",
      "tipo",
      "medicao",
      "meta",
      "unidade",
      "frequencia",
      "ativo",
      "criado_em",
      "arquivado_em",
      "lembrete",
      "rotina",
      "desafio_dias",
      "desafio_inicio",
    ],
    rows: habits.map((habit) => {
      const schedule =
        habit.habit_schedules.find((s) => s.end_date === null) ??
        [...habit.habit_schedules].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

      return [
        habit.name,
        habit.description ?? "",
        (habit.pillar_id && pillarById.get(habit.pillar_id)?.name) || "",
        habit.habit_type === "avoid" ? "evitar" : "fazer",
        MEASURE[habit.tracking_type],
        habit.target_value === null ? null : Number(habit.target_value),
        habit.target_unit ?? "",
        describeSchedule(schedule),
        habit.active,
        habit.created_at,
        habit.archived_at ?? "",
        habit.reminder_time?.slice(0, 5) ?? "",
        (habit.routine_id && routineById.get(habit.routine_id)?.name) || "",
        habit.challenge_days ?? null,
        habit.challenge_start_date ?? "",
      ];
    }),
  };
}
