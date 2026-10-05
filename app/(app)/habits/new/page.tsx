import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getPillars } from "@/lib/data/pillars";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { HabitForm } from "@/components/habits/HabitForm";

export default async function NewHabitPage() {
  const { supabase, user } = await requireUser();
  const [profile, pillars] = await Promise.all([
    getOrCreateProfile(supabase, user.id),
    getPillars(supabase),
  ]);

  return (
    <div>
      <PageHeader title="Novo hábito" backHref="/habits" />
      <HabitForm pillars={pillars} today={todayISO(profile.timezone)} />
    </div>
  );
}
