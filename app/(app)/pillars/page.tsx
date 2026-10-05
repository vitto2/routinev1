import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPillars } from "@/lib/data/pillars";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ICONS_BY_NAME } from "@/lib/constants/appearance";
import { Button } from "@/components/ui/button";

export default async function PillarsPage() {
  const supabase = await createClient();
  const pillars = await getPillars(supabase);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Pilares" backHref="/profile" />
        <Button render={<Link href="/pillars/new" />} size="sm" variant="outline">
          <Plus className="size-4" />
          Novo
        </Button>
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
            return (
              <Link
                key={pillar.id}
                href={`/pillars/${pillar.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${pillar.color ?? "#6366f1"}22` }}
                >
                  {Icon ? (
                    <Icon
                      className="size-4"
                      style={{ color: pillar.color ?? undefined }}
                    />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{pillar.name}</p>
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
