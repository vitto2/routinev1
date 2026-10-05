import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export async function getPillars(
  supabase: SupabaseClient<Database>,
  { includeArchived = false }: { includeArchived?: boolean } = {},
) {
  let query = supabase
    .from("pillars")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
