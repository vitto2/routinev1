import type { Database } from "./database.types";

export type Pillar = Database["public"]["Tables"]["pillars"]["Row"];
export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitSchedule =
  Database["public"]["Tables"]["habit_schedules"]["Row"];
export type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];

export interface HabitWithSchedules extends Habit {
  habit_schedules: HabitSchedule[];
}
