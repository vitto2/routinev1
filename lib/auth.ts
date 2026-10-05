import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Revalida a sessão junto ao Supabase. Usar no início de todo Server Action
 * e toda página protegida — o proxy.ts cobre a navegação normal, mas nunca é
 * a única linha de defesa (ver docs/01-app/02-guides/data-security do Next).
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  return { supabase, user };
}
