import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPillars } from "@/lib/data/pillars";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ICONS_BY_NAME } from "@/lib/constants/appearance";
import { buttonVariants } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListRow, RowChevron } from "@/components/ui/list-row";

export default async function PillarsPage() {
  const supabase = await createClient();
  const pillars = await getPillars(supabase);

  return (
    <div>
      <PageHeader
        title="Pilares"
        backHref="/profile"
        action={
          <Link href="/pillars/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Plus aria-hidden />
            Novo
          </Link>
        }
      />

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
          {pillars.map((pillar, i) => (
            <ListRow
              key={pillar.id}
              href={`/pillars/${pillar.id}`}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="animate-rise"
              leading={
                <IconBadge
                  icon={pillar.icon ? ICONS_BY_NAME[pillar.icon] : undefined}
                  accent={pillar.color ?? null}
                />
              }
              title={pillar.name}
              subtitle={pillar.description || undefined}
              trailing={<RowChevron />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
