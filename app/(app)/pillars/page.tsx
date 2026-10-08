import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPillars } from "@/lib/data/pillars";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ICONS_BY_NAME, accentStyles } from "@/lib/constants/appearance";
import { buttonVariants } from "@/components/ui/button";

export default async function PillarsPage() {
  const supabase = await createClient();
  const pillars = await getPillars(supabase);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Pilares" backHref="/profile" />
        <Link href="/pillars/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
          <Plus className="size-4" />
          Novo
        </Link>
      </div>

      {pillars.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Você ainda não possui pilares."
          description="Pilares ajudam a organizar seus hábitos por área da vida."
          actionLabel="Criar pilar"
          actionHref="/pillars/new"
        />
      ) : (
        <div className="space-y-2">
          {pillars.map((pillar) => {
            const Icon = pillar.icon ? ICONS_BY_NAME[pillar.icon] : undefined;
            const accent = accentStyles(pillar.color);
            return (
              <Link
                key={pillar.id}
                href={`/pillars/${pillar.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                  style={accent.bubble}
                  aria-hidden
                >
                  {Icon ? <Icon className="size-5" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{pillar.name}</p>
                  {pillar.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {pillar.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
