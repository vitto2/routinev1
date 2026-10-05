import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { todayISO } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";

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

  return <AppShell today={today}>{children}</AppShell>;
}
