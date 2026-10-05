import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Informe seu email")
  .pipe(z.email("Informe um email válido"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha"),
});

export const signupSchema = z.object({
  display_name: z.string().trim().max(60, "Use até 60 caracteres").optional(),
  email,
  password: z
    .string()
    .min(1, "Crie uma senha")
    .min(6, "A senha precisa ter pelo menos 6 caracteres")
    .max(72, "Use até 72 caracteres"),
});
