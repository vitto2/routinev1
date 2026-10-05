import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  pillar_id: z.string().uuid().optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;
