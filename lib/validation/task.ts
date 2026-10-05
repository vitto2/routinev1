import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o título da tarefa")
    .max(120, "Use até 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Use até 500 caracteres")
    .optional()
    .nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data da tarefa"),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido")
    .optional()
    .nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  pillar_id: z.string().uuid().optional().nullable(),
});

export type TaskInput = z.input<typeof taskSchema>;
