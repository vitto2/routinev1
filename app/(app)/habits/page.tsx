import Link from "next/link";
import { Repeat, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllHabits } from "@/lib/data/habits";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function HabitsPage() {
  const supabase = await createClient();
  const habits = await getAllHabits(supabase);

  const active = habits.filter((h) => h.active);
  const archived = habits.filter((h) => !h.active);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Hábitos" backHref="/profile" />
        <Button render={<Link href="/habits/new" />} size="sm" variant="outline">
          <Plus className="size-4" />
          Novo
        </Button>
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
          {active.map((habit) => (
            <Link
              key={habit.id}
              href={`/habits/${habit.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {habit.tracking_type === "quantity" && habit.target_value
                    ? `Meta: ${habit.target_value}${habit.target_unit}`
                    : habit.tracking_type === "time" && habit.target_value
                      ? `Meta: ${habit.target_value}min`
                      : null}
                </p>
              </div>
              <Badge variant={habit.habit_type === "avoid" ? "secondary" : "outline"}>
                {habit.habit_type === "avoid" ? "Evitar" : "Fazer"}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Arquivados
          </h2>
          <div className="space-y-2">
            {archived.map((habit) => (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3.5 text-muted-foreground"
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
