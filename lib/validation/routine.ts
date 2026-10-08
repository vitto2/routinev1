import { z } from "zod";

export const routineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome para a rotina")
    .max(40, "Use até 40 caracteres"),
  period: z.enum(["morning", "afternoon", "evening", "custom"]),
});

export type RoutineInput = z.infer<typeof routineSchema>;
