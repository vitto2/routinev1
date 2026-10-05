import { createClient } from "@/lib/supabase/server";
import { getPillars } from "@/lib/data/pillars";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";

export default async function NewHabitPage() {
  const supabase = await createClient();
  const pillars = await getPillars(supabase);

  return (
    <div>
      <PageHeader title="Novo hábito" backHref="/habits" />
      <HabitForm pillars={pillars} />
    </div>
  );
}
