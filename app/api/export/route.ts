import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { todayISO } from "@/lib/dates";
import { safeFilename, toCsv } from "@/lib/export/csv";
import {
  buildHabitsDataset,
  buildLogsDataset,
  buildTasksDataset,
  type Dataset,
} from "@/lib/export/datasets";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUILDERS: Record<string, (supabase: SupabaseClient<Database>) => Promise<Dataset>> = {
  registros: buildLogsDataset,
  tarefas: buildTasksDataset,
  habitos: buildHabitsDataset,
};

/**
 * Exporta os dados do próprio usuário em CSV (UTF-8 com BOM).
 * A leitura usa o cliente com sessão: a RLS garante que só saem dados dele.
 */
export async function GET(request: NextRequest) {
  const tipo = request.nextUrl.searchParams.get("tipo") ?? "";
  const build = BUILDERS[tipo];

  if (!build) {
    return NextResponse.json(
      { error: "Tipo inválido. Use registros, tarefas ou habitos." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const profile = await getOrCreateProfile(supabase, user.id);
    const dataset = await build(supabase);
    const csv = toCsv(dataset.headers, dataset.rows);
    const filename = safeFilename(`routine-${tipo}-${todayISO(profile.timezone)}`, "csv");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[export]", error);
    return NextResponse.json({ error: "Não foi possível gerar o arquivo." }, { status: 500 });
  }
}
