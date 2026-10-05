"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

export interface AuthFormState {
  error: string | null;
  message: string | null;
}

function validTimezone(value: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const timezone = validTimezone(
    String(formData.get("timezone") ?? "") || DEFAULT_TIMEZONE,
  );

  if (!email || !password) {
    return { error: "Preencha email e senha.", message: null };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres.", message: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null, timezone },
    },
  });

  if (error) {
    return { error: error.message, message: null };
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha email e senha.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

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
