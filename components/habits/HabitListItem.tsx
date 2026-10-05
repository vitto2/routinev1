"use client";

import { useTransition } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleHabitCompletion, addHabitProgress } from "@/lib/actions/habitLogs";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

const QUICK_INCREMENTS: Record<string, number[]> = {
  ml: [250, 500],
  min: [15, 30],
};

export function HabitListItem({
  habit,
  log,
  dateISO,
}: {
  habit: HabitWithSchedules;
  log: HabitLog | undefined;
  dateISO: string;
}) {
  const [pending, startTransition] = useTransition();
  const completed = log?.completed ?? false;

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleHabitCompletion(habit.id, dateISO);
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  function handleAdd(delta: number) {
    startTransition(async () => {
      try {
        await addHabitProgress(habit.id, dateISO, delta);
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  if (habit.tracking_type === "quantity" || habit.tracking_type === "time") {
    return (
      <ProgressHabitRow
        habit={habit}
        value={log?.value ?? 0}
        completed={completed}
        pending={pending}
        onAdd={handleAdd}
      />
    );
  }

  const isAvoid = habit.habit_type === "avoid";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
        completed && "bg-primary/5 border-primary/30",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30",
        )}
      >
        {completed ? <Check className="size-4" /> : null}
      </span>
      <span className="flex-1">
        <span className={cn("block font-medium", completed && "text-muted-foreground line-through")}>
          {habit.name}
        </span>
        {isAvoid ? (
          <span className="block text-xs text-muted-foreground">
            {completed ? "Consegui evitar hoje" : "Hábito a evitar"}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ProgressHabitRow({
  habit,
  value,
  completed,
  pending,
  onAdd,
}: {
  habit: HabitWithSchedules;
  value: number;
  completed: boolean;
  pending: boolean;
  onAdd: (delta: number) => void;
}) {
  const target = habit.target_value ?? 0;
  const unit = habit.target_unit ?? "";
  const increments = QUICK_INCREMENTS[unit] ?? [1, 5];
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card px-4 py-3.5",
        completed && "bg-primary/5 border-primary/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("font-medium", completed && "text-muted-foreground")}>
          {habit.name}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value}
          {target ? `/${target}` : ""} {unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {increments.map((inc) => (
          <button
            key={inc}
            type="button"
            disabled={pending}
            onClick={() => onAdd(inc)}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Plus className="size-3" />
            {inc}
            {unit}
          </button>
        ))}
        {value > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onAdd(-(increments[0] ?? 1))}
            className="ml-auto flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Remover"
          >
            <Minus className="size-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
