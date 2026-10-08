import { z } from "zod";

export const scheduleSchema = z.discriminatedUnion("schedule_type", [
  z.object({ schedule_type: z.literal("daily") }),
  z.object({
    schedule_type: z.literal("weekdays"),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Escolha ao menos um dia da semana"),
  }),
  z.object({
    schedule_type: z.literal("x_per_week"),
    frequency_target: z
      .number("Informe quantas vezes por semana")
      .int("Use um número inteiro")
      .min(1, "Informe de 1 a 7 vezes por semana")
      .max(7, "Informe de 1 a 7 vezes por semana"),
  }),
  z.object({
    schedule_type: z.literal("specific_date"),
    specific_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data"),
  }),
  z.object({
    schedule_type: z.literal("interval"),
    interval_days: z
      .number("Informe o intervalo em dias")
      .int("Use um número inteiro")
      .min(2, "Informe de 2 a 90 dias")
      .max(90, "Informe de 2 a 90 dias"),
  }),
]);

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe um nome para o hábito")
      .max(80, "Use até 80 caracteres"),
    description: z
      .string()
      .trim()
      .max(280, "Use até 280 caracteres")
      .optional()
      .nullable(),
    pillar_id: z.string().uuid().optional().nullable(),
    habit_type: z.enum(["build", "avoid"]),
    tracking_type: z.enum(["checkbox", "quantity", "time"]),
    target_value: z.number().positive().optional().nullable(),
    target_unit: z.enum(["ml", "min"]).optional().nullable(),
    icon: z.string().trim().max(50).optional().nullable(),
    color: z.string().trim().max(20).optional().nullable(),
    schedule: scheduleSchema,
    // Recursos da migration 0004: omitidos pelo cliente quando o schema ainda é o antigo.
    reminder_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Horário inválido")
      .nullable()
      .optional(),
    challenge_days: z
      .number()
      .int("Use um número inteiro de dias")
      .min(7, "O desafio precisa ter ao menos 7 dias")
      .max(365, "O desafio pode ter no máximo 365 dias")
      .nullable()
      .optional(),
    challenge_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data de início")
      .nullable()
      .optional(),
    routine_id: z.uuid().nullable().optional(),
  })
  .superRefine((habit, ctx) => {
    const measured =
      habit.habit_type === "build" &&
      (habit.tracking_type === "quantity" || habit.tracking_type === "time");
    if (!measured) return;

    const max = habit.tracking_type === "quantity" ? 20000 : 1440;
    const unit = habit.tracking_type === "quantity" ? "ml" : "min";

    if (!habit.target_value || habit.target_value <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["target_value"],
        message: "Informe uma meta maior que 0",
      });
    } else if (habit.target_value > max) {
      ctx.addIssue({
        code: "custom",
        path: ["target_value"],
        message: `Meta muito alta (máximo ${max} ${unit})`,
      });
    }
  });

export type HabitInput = z.infer<typeof habitSchema>;
