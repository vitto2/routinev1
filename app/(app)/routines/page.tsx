import Link from "next/link";
import { ChevronRight, Layers3, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getRoutines } from "@/lib/data/routines";
import { PERIOD_BY_VALUE } from "@/lib/constants/routines";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { buttonVariants } from "@/components/ui/button";

export default async function RoutinesPage() {
  const { supabase, user } = await requireUser();
  const profile = await getOrCreateProfile(supabase, user.id);

  if (!hasSchemaV2(profile)) {
    return (
      <div>
        <PageHeader title="Rotinas" backHref="/profile" />
        <EmptyState
          icon={Layers3}
          title="Rotinas ainda não estão disponíveis."
          description="Rode a migration supabase/migrations/0004_v2.sql no SQL Editor do Supabase para liberar este recurso."
        />
      </div>
    );
  }

  const [routines, habits] = await Promise.all([
    getRoutines(supabase),
    getHabitsWithSchedules(supabase),
  ]);

  const countByRoutine = new Map<string, number>();
  for (const habit of habits) {
    if (habit.active && habit.routine_id) {
      countByRoutine.set(habit.routine_id, (countByRoutine.get(habit.routine_id) ?? 0) + 1);
    }
  }

  const ordered = [...routines].sort(
    (a, b) =>
      PERIOD_BY_VALUE[a.period].order - PERIOD_BY_VALUE[b.period].order ||
      a.sort_order - b.sort_order,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <PageHeader title="Rotinas" backHref="/profile" />
        <Link
          href="/routines/new"
          className={buttonVariants({ size: "sm", variant: "outline", className: "mb-6" })}
        >
          <Plus className="size-4" />
          Nova
        </Link>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="Você ainda não tem rotinas."
          description="Agrupe hábitos em blocos como Manhã e Noite. Na tela Hoje eles aparecem na ordem do dia."
          actionLabel="Criar rotina"
          actionHref="/routines/new"
        />
      ) : (
        <div className="space-y-2">
          {ordered.map((routine, i) => {
            const count = countByRoutine.get(routine.id) ?? 0;
            return (
              <Link
                key={routine.id}
                href={`/routines/${routine.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-rise flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{routine.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PERIOD_BY_VALUE[routine.period].label} ·{" "}
                    {count === 1 ? "1 hábito" : `${count} hábitos`}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
