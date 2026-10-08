import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { Routine } from "@/types/domain";

/** Tabela ainda não criada (migration 0004 não aplicada): PostgREST ou Postgres. */
function isMissingRelation(error: { code?: string }) {
  return error.code === "PGRST205" || error.code === "42P01";
}

/** Rotinas do usuário; lista vazia se a migration 0004 ainda não foi aplicada. */
export async function getRoutines(supabase: SupabaseClient<Database>): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}
