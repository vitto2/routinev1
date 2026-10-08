import { Layers, Layers3, Palette, Repeat, User } from "lucide-react";
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
import { IconBadge } from "@/components/ui/icon-badge";
import { ListRow, RowChevron } from "@/components/ui/list-row";
import { Panel } from "@/components/ui/panel";
import { SectionTitle } from "@/components/ui/section-title";

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

      <div className="space-y-3">
        <Panel
          icon={User}
          title={profile.display_name || "Nome não informado"}
          description={`Fuso horário: ${profile.timezone}`}
        >
          <TimezoneSync current={profile.timezone} />
        </Panel>

        <Panel icon={Palette} title="Aparência" description="Claro, escuro ou o tema do seu aparelho.">
          <ThemeToggle />
        </Panel>

        <EnableNotifications />
        <InstallButton />
        <PauseCard
          today={today}
          habits={activeHabits.map((h) => ({ id: h.id, name: h.name }))}
          paused={paused}
        />
      </div>

      <section className="space-y-3">
        <SectionTitle>Gerenciar</SectionTitle>
        <nav className="space-y-2">
          <ListRow
            href="/habits"
            leading={<IconBadge icon={Repeat} />}
            title="Hábitos"
            subtitle="Criar, editar e arquivar"
            trailing={<RowChevron />}
          />
          {hasSchemaV2(profile) ? (
            <ListRow
              href="/routines"
              leading={<IconBadge icon={Layers3} />}
              title="Rotinas"
              subtitle="Manhã, tarde e noite"
              trailing={<RowChevron />}
            />
          ) : null}
          <ListRow
            href="/pillars"
            leading={<IconBadge icon={Layers} />}
            title="Pilares"
            subtitle="As áreas da sua vida"
            trailing={<RowChevron />}
          />
        </nav>
      </section>

      <ExportCard />

      <SignOutButton />
    </div>
  );
}
