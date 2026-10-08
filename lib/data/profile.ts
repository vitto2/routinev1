import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

export async function getOrCreateProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data;

  // Rede de segurança: o trigger handle_new_user() já cria o profile no
  // signup; isso só cobre uma eventual corrida entre signup e primeiro load.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId, timezone: DEFAULT_TIMEZONE })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

/**
 * A migration 0004 já foi aplicada? `last_review_date` só existe depois dela.
 * Enquanto não existir, os recursos que dependem de colunas/tabelas novas ficam ocultos.
 */
export function hasSchemaV2(profile: object): boolean {
  return "last_review_date" in profile;
}
