import { PERIOD_BY_VALUE } from "@/lib/constants/routines";
import type { Routine } from "@/types/domain";

export interface HabitGroup<H> {
  /** null = hábitos sem rotina */
  routine: Routine | null;
  habits: H[];
}

/**
 * Agrupa os hábitos do dia por rotina, na ordem do dia (manhã, tarde, noite, outras).
 * - Mantém a ordem recebida dentro de cada grupo.
 * - Rotinas sem hábitos hoje não aparecem.
 * - Sem nenhuma rotina em uso, devolve um único grupo (lista simples, como antes).
 */
export function groupByRoutine<H extends { routine_id: string | null }>(
  habits: H[],
  routines: Routine[],
): HabitGroup<H>[] {
  const known = new Map(routines.map((r) => [r.id, r]));
  const inUse = habits.some((h) => h.routine_id !== null && known.has(h.routine_id));

  if (!inUse) return [{ routine: null, habits }];

  const groups: HabitGroup<H>[] = [...routines]
    .sort(
      (a, b) =>
        PERIOD_BY_VALUE[a.period].order - PERIOD_BY_VALUE[b.period].order ||
        a.sort_order - b.sort_order,
    )
    .map((routine) => ({
      routine,
      habits: habits.filter((h) => h.routine_id === routine.id),
    }))
    .filter((group) => group.habits.length > 0);

  const loose = habits.filter((h) => h.routine_id === null || !known.has(h.routine_id));
  if (loose.length > 0) groups.push({ routine: null, habits: loose });

  return groups;
}
