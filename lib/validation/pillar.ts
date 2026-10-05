import { z } from "zod";

export const pillarSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(60),
  icon: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  description: z.string().trim().max(280).optional().nullable(),
});

export type PillarInput = z.infer<typeof pillarSchema>;
