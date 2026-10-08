"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { assignHabitToRoutine, moveHabitInRoutine } from "@/lib/actions/routines";
import { Button } from "@/components/ui/button";

export interface RoutineHabitItem {
  id: string;
  name: string;
}

/** Hábitos da rotina (reordenar/remover) e hábitos livres que podem ser adicionados. */
export function RoutineHabits({
  routineId,
  members,
  available,
}: {
  routineId: string;
  members: RoutineHabitItem[];
  available: RoutineHabitItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, success?: string) {
    startTransition(async () => {
      try {
        await action();
        if (success) toast.success(success);
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar a alteração.");
      }
    });
  }

  const iconButton =
    "flex size-10 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40";

  return (
    <div className="space-y-6">
      <section className="space-y-2" aria-labelledby="members-heading">
        <h2
          id="members-heading"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Hábitos desta rotina ({members.length})
        </h2>

        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-input p-4 text-sm text-muted-foreground">
            Nenhum hábito ainda. Adicione abaixo.
          </p>
        ) : (
          <ol className="space-y-2">
            {members.map((habit, index) => (
              <li
                key={habit.id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm"
              >
                <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
                <button
                  type="button"
                  className={iconButton}
                  disabled={pending || index === 0}
                  aria-label={`Mover ${habit.name} para cima`}
                  onClick={() => run(() => moveHabitInRoutine(habit.id, "up"))}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={pending || index === members.length - 1}
                  aria-label={`Mover ${habit.name} para baixo`}
                  onClick={() => run(() => moveHabitInRoutine(habit.id, "down"))}
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={pending}
                  aria-label={`Tirar ${habit.name} da rotina`}
                  onClick={() => run(() => assignHabitToRoutine(habit.id, null))}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="available-heading">
        <h2
          id="available-heading"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Adicionar hábito
        </h2>

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos os seus hábitos já estão em alguma rotina.
          </p>
        ) : (
          <ul className="space-y-2">
            {available.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4"
              >
                <span className="min-w-0 flex-1 truncate">{habit.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() => assignHabitToRoutine(habit.id, routineId), "Hábito adicionado")
                  }
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
