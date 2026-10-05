"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/dates";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/errors";

export interface AuthFormState {
  error: string | null;
  message: string | null;
  fieldErrors?: Record<string, string>;
}

function authMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Este email já está cadastrado. Tente entrar.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    case "email_address_invalid":
      return "Este email não é aceito. Verifique o endereço digitado.";
    case "signup_disabled":
      return "Novos cadastros estão desativados no momento.";
    default:
      return fallback;
  }
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    display_name: String(formData.get("display_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: null, message: null, fieldErrors: fieldErrors(parsed.error) };
  }

  const requestedTimezone = String(formData.get("timezone") ?? "");
  const timezone = isValidTimezone(requestedTimezone)
    ? requestedTimezone
    : DEFAULT_TIMEZONE;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.display_name || null, timezone },
    },
  });

  if (error) {
    return {
      error: authMessage(error.code, "Não foi possível criar a conta. Tente novamente."),
      message: null,
    };
  }

  // Com "Confirm email" ligado no Supabase o cadastro não devolve sessão:
  // avisar em vez de redirecionar para uma rota que mandaria de volta ao login.
  if (!data.session) {
    return {
      error: null,
      message:
        "Conta criada. Enviamos um link de confirmação para o seu email; confirme e depois entre.",
    };
  }

  redirect("/today");
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: null, message: null, fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirme seu email antes de entrar.", message: null };
    }
    return { error: "Email ou senha inválidos.", message: null };
  }

  redirect("/today");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
