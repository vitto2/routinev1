"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { assignHabitToRoutine, moveHabitInRoutine } from "@/lib/actions/routines";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SectionTitle } from "@/components/ui/section-title";
import { surfaceVariants } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <section className="space-y-2" aria-labelledby="members-heading">
        <SectionTitle id="members-heading">Hábitos desta rotina ({members.length})</SectionTitle>

        {members.length === 0 ? (
          <p
            className={cn(
              surfaceVariants({ tone: "dashed", padding: "md" }),
              "text-sm text-muted-foreground",
            )}
          >
            Nenhum hábito ainda. Adicione abaixo.
          </p>
        ) : (
          <ol className="space-y-2">
            {members.map((habit, index) => (
              <li
                key={habit.id}
                className={cn(
                  surfaceVariants({ padding: "none" }),
                  "flex min-h-16 items-center gap-2 py-3 pl-4 pr-2",
                )}
              >
                <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
                <IconButton
                  icon={ArrowUp}
                  variant="outline"
                  label={`Mover ${habit.name} para cima`}
                  disabled={pending || index === 0}
                  onClick={() => run(() => moveHabitInRoutine(habit.id, "up"))}
                />
                <IconButton
                  icon={ArrowDown}
                  variant="outline"
                  label={`Mover ${habit.name} para baixo`}
                  disabled={pending || index === members.length - 1}
                  onClick={() => run(() => moveHabitInRoutine(habit.id, "down"))}
                />
                <IconButton
                  icon={X}
                  variant="outline"
                  label={`Tirar ${habit.name} da rotina`}
                  disabled={pending}
                  onClick={() => run(() => assignHabitToRoutine(habit.id, null))}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="available-heading">
        <SectionTitle id="available-heading">Adicionar hábito</SectionTitle>

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos os seus hábitos já estão em alguma rotina.
          </p>
        ) : (
          <ul className="space-y-2">
            {available.map((habit) => (
              <li
                key={habit.id}
                className={cn(
                  surfaceVariants({ padding: "none" }),
                  "flex min-h-16 items-center gap-2 py-3 pl-4 pr-3",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() => assignHabitToRoutine(habit.id, routineId), "Hábito adicionado")
                  }
                >
                  <Plus aria-hidden />
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
