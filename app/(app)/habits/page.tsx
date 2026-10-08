import Link from "next/link";
import { Repeat, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getPillars } from "@/lib/data/pillars";
import { describeSchedule } from "@/lib/scheduling/summary";
import { ICONS_BY_NAME, accentStyles } from "@/lib/constants/appearance";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="mb-6 flex items-center justify-between gap-2">
        <PageHeader title="Hábitos" backHref="/profile" />
        <Link
          href="/habits/new"
          className={buttonVariants({ size: "sm", variant: "outline", className: "mb-6" })}
        >
          <Plus className="size-4" />
          Novo
        </Link>
      </div>

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
            const accent = accentStyles(habit.color ?? pillar?.color);
            const Icon = ICONS_BY_NAME[habit.icon ?? pillar?.icon ?? ""];
            const goal =
              habit.target_value && habit.target_unit
                ? ` · meta ${habit.target_value} ${habit.target_unit}`
                : "";
            return (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-rise flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                  style={accent.bubble}
                  aria-hidden
                >
                  {Icon ? <Icon className="size-5" /> : <span className="size-2.5 rounded-full bg-current" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{habit.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {describeSchedule(currentSchedule(habit))}
                    {goal}
                  </p>
                </div>
                <Badge variant={habit.habit_type === "avoid" ? "secondary" : "outline"}>
                  {habit.habit_type === "avoid" ? "Evitar" : "Fazer"}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Arquivados
          </h2>
          <div className="space-y-2">
            {archived.map((habit) => (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-dashed border-input px-4 py-3 text-muted-foreground transition-colors hover:bg-accent/40"
              >
                <p className="truncate">{habit.name}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
