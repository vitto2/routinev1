import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente com service role: IGNORA o RLS. Use apenas em rotas de servidor
 * protegidas por segredo (ex.: /api/cron/reminders), nunca em código que
 * receba input de usuário sem validar, e nunca importe em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
