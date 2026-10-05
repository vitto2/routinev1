import { z } from "zod";

export const scheduleSchema = z.discriminatedUnion("schedule_type", [
  z.object({ schedule_type: z.literal("daily") }),
  z.object({
    schedule_type: z.literal("weekdays"),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  }),
  z.object({
    schedule_type: z.literal("x_per_week"),
    frequency_target: z.number().int().min(1).max(7),
  }),
  z.object({
    schedule_type: z.literal("specific_date"),
    specific_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    schedule_type: z.literal("interval"),
    interval_days: z.number().int().min(2).max(90),
  }),
]);

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(80),
  description: z.string().trim().max(280).optional().nullable(),
  pillar_id: z.string().uuid().optional().nullable(),
  habit_type: z.enum(["build", "avoid"]),
  tracking_type: z.enum(["checkbox", "quantity", "time"]),
  target_value: z.number().positive().optional().nullable(),
  target_unit: z.enum(["ml", "min"]).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  schedule: scheduleSchema,
});

export type HabitInput = z.infer<typeof habitSchema>;
