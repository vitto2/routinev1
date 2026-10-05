import { z } from "zod";

export const pillarSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome para o pilar")
    .max(60, "Use até 60 caracteres"),
  icon: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  description: z
    .string()
    .trim()
    .max(280, "Use até 280 caracteres")
    .optional()
    .nullable(),
});

export type PillarInput = z.infer<typeof pillarSchema>;
