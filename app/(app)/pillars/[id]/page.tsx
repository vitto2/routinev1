import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { PillarForm } from "@/components/pillars/PillarForm";
import { ArchivePillarButton } from "@/components/pillars/ArchivePillarButton";

export default async function EditPillarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pillar } = await supabase
    .from("pillars")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!pillar) notFound();

  return (
    <div>
      <PageHeader title="Editar pilar" backHref="/pillars" />
      <PillarForm pillar={pillar} />
      <div className="mt-6 border-t border-border pt-4">
        <ArchivePillarButton pillarId={pillar.id} />
      </div>
    </div>
  );
}
