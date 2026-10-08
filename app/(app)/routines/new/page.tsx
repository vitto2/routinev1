import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoutineForm } from "@/components/routines/RoutineForm";

export default async function NewRoutinePage() {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);
  if (!hasSchemaV2(profile)) redirect("/routines");

  return (
    <div>
      <PageHeader title="Nova rotina" backHref="/routines" />
      <RoutineForm />
    </div>
  );
}
