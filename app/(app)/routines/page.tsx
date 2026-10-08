import Link from "next/link";
import { Clock3, Layers3, Moon, Plus, Sun, Sunrise, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile, hasSchemaV2 } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getRoutines } from "@/lib/data/routines";
import { PERIOD_BY_VALUE } from "@/lib/constants/routines";
import type { RoutinePeriod } from "@/types/database.types";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListRow, RowChevron } from "@/components/ui/list-row";

/** Mesmos ícones do cabeçalho da rotina na tela Hoje. */
const PERIOD_ICONS: Record<RoutinePeriod, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  custom: Clock3,
};

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
      <PageHeader
        title="Rotinas"
        backHref="/profile"
        action={
          <Link href="/routines/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Plus aria-hidden />
            Nova
          </Link>
        }
      />

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
              <ListRow
                key={routine.id}
                href={`/routines/${routine.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="animate-rise"
                leading={<IconBadge icon={PERIOD_ICONS[routine.period]} />}
                title={routine.name}
                subtitle={`${PERIOD_BY_VALUE[routine.period].label} · ${count === 1 ? "1 hábito" : `${count} hábitos`}`}
                trailing={<RowChevron />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
