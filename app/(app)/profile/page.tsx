import Link from "next/link";
import { Layers, Layers3, Repeat, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { todayISO } from "@/lib/dates";
import { pausedHabits } from "@/lib/scheduling/pause";
import { PauseCard } from "@/components/pause/PauseCard";
import { ExportCard } from "@/components/profile/ExportCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TimezoneSync } from "@/components/auth/TimezoneSync";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallButton } from "@/components/pwa/InstallButton";
import { EnableNotifications } from "@/components/notifications/EnableNotifications";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);
  const activeHabits = (await getHabitsWithSchedules(supabase)).filter((h) => h.active);
  const paused = pausedHabits(activeHabits, today);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium">{profile.display_name || "Não informado"}</p>
        </div>
        <TimezoneSync current={profile.timezone} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <ThemeToggle />
      </div>

      <PauseCard
        today={today}
        habits={activeHabits.map((h) => ({ id: h.id, name: h.name }))}
        paused={paused}
      />

      <InstallButton />
      <EnableNotifications />

      <nav className="space-y-2">
        <Link
          href="/habits"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
        >
          <Repeat className="size-4 text-muted-foreground" />
          <span className="flex-1 font-medium">Gerenciar hábitos</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        {hasSchemaV2(profile) ? (
          <Link
            href="/routines"
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
          >
            <Layers3 className="size-4 text-muted-foreground" />
            <span className="flex-1 font-medium">Gerenciar rotinas</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ) : null}
        <Link
          href="/pillars"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
        >
          <Layers className="size-4 text-muted-foreground" />
          <span className="flex-1 font-medium">Gerenciar pilares</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </nav>

      <ExportCard />

      <SignOutButton />
    </div>
  );
}
