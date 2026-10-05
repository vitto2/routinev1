import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

// Use em Server Components, Server Actions e Route Handlers.
// `setAll` pode falhar quando chamado a partir de um Server Component puro
// (não é possível escrever cookies durante o render) — isso é esperado e
// seguro de ignorar porque o proxy.ts já cuida de renovar a sessão.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado de um Server Component — ignorado de propósito.
          }
        },
      },
    },
  );
}
