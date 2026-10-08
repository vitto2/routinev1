import Link from "next/link";
import { Repeat, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { describeSchedule } from "@/lib/scheduling/summary";
import { ICONS_BY_NAME } from "@/lib/constants/appearance";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListRow, RowChevron } from "@/components/ui/list-row";
import { SectionTitle } from "@/components/ui/section-title";
import type { HabitWithSchedules } from "@/types/domain";

function currentSchedule(habit: HabitWithSchedules) {
  const open = habit.habit_schedules.find((s) => s.end_date === null);
  if (open) return open;
  // Arquivado: mostra a última frequência que valeu.
  return [...habit.habit_schedules].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
}

export default async function HabitsPage() {
  const supabase = await createClient();
  const [habits, pillars] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getPillars(supabase, { includeArchived: true }),
  ]);
  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  const active = habits.filter((h) => h.active);
  const archived = habits.filter((h) => !h.active);

  return (
    <div>
      <PageHeader
        title="Hábitos"
        backHref="/profile"
        action={
          <Link href="/habits/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Plus aria-hidden />
            Novo
          </Link>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Você ainda não possui hábitos."
          actionLabel="Criar hábito"
          actionHref="/habits/new"
        />
      ) : (
        <div className="space-y-2">
          {active.map((habit, i) => {
            const pillar = habit.pillar_id ? pillarById.get(habit.pillar_id) : undefined;
            const Icon = ICONS_BY_NAME[habit.icon ?? pillar?.icon ?? ""];
            const goal =
              habit.target_value && habit.target_unit
                ? ` · meta ${habit.target_value} ${habit.target_unit}`
                : "";
            return (
              <ListRow
                key={habit.id}
                href={`/habits/${habit.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-rise"
                leading={<IconBadge icon={Icon} accent={habit.color ?? pillar?.color ?? null} />}
                title={habit.name}
                subtitle={`${describeSchedule(currentSchedule(habit))}${goal}`}
                trailing={
                  <span className="flex items-center gap-2">
                    <Badge variant={habit.habit_type === "avoid" ? "secondary" : "outline"}>
                      {habit.habit_type === "avoid" ? "Evitar" : "Fazer"}
                    </Badge>
                    <RowChevron />
                  </span>
                }
              />
            );
          })}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="mt-8 space-y-2">
          <SectionTitle>Arquivados</SectionTitle>
          <div className="space-y-2">
            {archived.map((habit) => (
              <ListRow
                key={habit.id}
                href={`/habits/${habit.id}`}
                tone="dashed"
                className="min-h-14 text-muted-foreground"
                title={habit.name}
                trailing={<RowChevron />}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
