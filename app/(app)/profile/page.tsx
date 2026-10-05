import Link from "next/link";
import { Layers, Repeat, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { TimezoneSync } from "@/components/auth/TimezoneSync";
import { InstallButton } from "@/components/pwa/InstallButton";
import { EnableNotifications } from "@/components/notifications/EnableNotifications";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium">{profile.display_name || "Não informado"}</p>
        </div>
        <TimezoneSync current={profile.timezone} />
      </div>

      <InstallButton />
      <EnableNotifications />

      <nav className="space-y-2">
        <Link
          href="/habits"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
        >
          <Repeat className="size-4 text-muted-foreground" />
          <span className="flex-1 font-medium">Gerenciar hábitos</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          href="/pillars"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
        >
          <Layers className="size-4 text-muted-foreground" />
          <span className="flex-1 font-medium">Gerenciar pilares</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </nav>

      <SignOutButton />
    </div>
  );
}
