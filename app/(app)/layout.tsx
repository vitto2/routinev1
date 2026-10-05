import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { todayISO } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  return (
    <AppShell today={today}>
      {children}
      {/* "onboarded_at" in profile: sem a migration 0003 a coluna não existe e o
          modal ficaria preso para sempre; nesse caso simplesmente não aparece. */}
      {"onboarded_at" in profile && !profile.onboarded_at ? (
        <OnboardingModal displayName={profile.display_name} />
      ) : null}
    </AppShell>
  );
}
