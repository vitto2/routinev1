"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleHabitCompletion, addHabitProgress } from "@/lib/actions/habitLogs";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

const QUICK_INCREMENTS: Record<string, number[]> = {
  ml: [250, 500],
  min: [15, 30],
};

type LogState = { completed: boolean; value: number };
type LogAction = { type: "toggle" } | { type: "add"; delta: number; target: number };

function reduceLog(state: LogState, action: LogAction): LogState {
  if (action.type === "toggle") return { ...state, completed: !state.completed };
  const value = Math.max(0, state.value + action.delta);
  const completed = action.target > 0 ? value >= action.target : value > 0;
  return { value, completed };
}

export function HabitListItem({
  habit,
  log,
  dateISO,
  index = 0,
  weekProgress,
}: {
  habit: HabitWithSchedules;
  log: HabitLog | undefined;
  dateISO: string;
  index?: number;
  weekProgress?: { done: number; target: number };
}) {
  const [pending, startTransition] = useTransition();
  const [state, applyOptimistic] = useOptimistic<LogState, LogAction>(
    { completed: log?.completed ?? false, value: log?.value ?? 0 },
    reduceLog,
  );

  function handleToggle() {
    startTransition(async () => {
      applyOptimistic({ type: "toggle" });
      try {
        await toggleHabitCompletion(habit.id, dateISO);
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  function handleAdd(delta: number) {
    startTransition(async () => {
      applyOptimistic({ type: "add", delta, target: habit.target_value ?? 0 });
      try {
        await addHabitProgress(habit.id, dateISO, delta);
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  const delay = { animationDelay: `${Math.min(index, 8) * 40}ms` };

  if (habit.tracking_type === "quantity" || habit.tracking_type === "time") {
    return (
      <div style={delay} className="animate-rise">
        <ProgressHabitRow
          habit={habit}
          value={state.value}
          completed={state.completed}
          pending={pending}
          onAdd={handleAdd}
        />
      </div>
    );
  }

  const isAvoid = habit.habit_type === "avoid";
  const subtitle = isAvoid
    ? state.completed
      ? "Consegui evitar hoje"
      : "Hábito a evitar"
    : weekProgress
      ? `${weekProgress.done}/${weekProgress.target} nesta semana`
      : null;

  return (
    <div style={delay} className="animate-rise">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
          state.completed && "border-primary/30 bg-primary/5",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
            state.completed
              ? "animate-check border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30",
          )}
        >
          {state.completed ? <Check className="size-4" /> : null}
        </span>
        <span className="flex-1">
          <span
            className={cn(
              "block font-medium transition-colors duration-200",
              state.completed && "text-muted-foreground line-through",
            )}
          >
            {habit.name}
          </span>
          {subtitle ? (
            <span className="block text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </span>
      </button>
    </div>
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
        "rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors duration-200",
        completed && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          {habit.name}
          {completed ? (
            <span className="animate-check flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
          ) : null}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value}
          {target ? `/${target}` : ""} {unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
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
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
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
            className="ml-auto flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
            aria-label="Remover"
          >
            <Minus className="size-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
