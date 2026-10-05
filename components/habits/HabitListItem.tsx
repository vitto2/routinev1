"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleHabitCompletion, addHabitProgress } from "@/lib/actions/habitLogs";
import { ICONS_BY_NAME, accentStyles, readableOn, DEFAULT_ACCENT } from "@/lib/constants/appearance";
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

function CheckCircle({ done, color }: { done: boolean; color: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
        done ? "animate-check border-transparent" : "border-input bg-card",
      )}
      style={done ? { backgroundColor: color, color: readableOn(color) } : undefined}
    >
      {done ? <Check className="size-[18px]" strokeWidth={3} /> : null}
    </span>
  );
}

export function HabitListItem({
  habit,
  log,
  dateISO,
  index = 0,
  weekProgress,
  color,
  iconName,
}: {
  habit: HabitWithSchedules;
  log: HabitLog | undefined;
  dateISO: string;
  index?: number;
  weekProgress?: { done: number; target: number };
  /** cor do hábito, ou do pilar quando o hábito não tem a sua */
  color?: string | null;
  iconName?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [state, applyOptimistic] = useOptimistic<LogState, LogAction>(
    { completed: log?.completed ?? false, value: log?.value ?? 0 },
    reduceLog,
  );

  const accentColor = color || DEFAULT_ACCENT;
  const accent = accentStyles(accentColor);
  const Icon = iconName ? ICONS_BY_NAME[iconName] : undefined;

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
  const bubble = Icon ? (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-xl"
      style={accent.bubble}
      aria-hidden
    >
      <Icon className="size-[18px]" />
    </span>
  ) : null;

  if (habit.tracking_type === "quantity" || habit.tracking_type === "time") {
    return (
      <div style={delay} className="animate-rise">
        <ProgressHabitRow
          habit={habit}
          value={state.value}
          completed={state.completed}
          pending={pending}
          onAdd={handleAdd}
          color={accentColor}
          bubble={bubble}
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
        aria-pressed={state.completed}
        style={state.completed ? accent.soft : undefined}
        className={cn(
          "flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
          state.completed ? "border-transparent" : "border-border hover:bg-accent/40",
        )}
      >
        <CheckCircle done={state.completed} color={accentColor} />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium transition-colors duration-200",
              state.completed && "text-muted-foreground line-through decoration-1",
            )}
          >
            {habit.name}
          </span>
          {subtitle ? (
            <span className="block text-xs text-muted-foreground">{subtitle}</span>
          ) : null}
        </span>
        {bubble}
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
  color,
  bubble,
}: {
  habit: HabitWithSchedules;
  value: number;
  completed: boolean;
  pending: boolean;
  onAdd: (delta: number) => void;
  color: string;
  bubble: React.ReactNode;
}) {
  const target = habit.target_value ?? 0;
  const unit = habit.target_unit ?? "";
  const increments = QUICK_INCREMENTS[unit] ?? [1, 5];
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const accent = accentStyles(color);

  return (
    <div
      style={completed ? accent.soft : undefined}
      className={cn(
        "rounded-2xl border bg-card px-4 py-3.5 shadow-sm transition-colors duration-200",
        completed ? "border-transparent" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        <CheckCircle done={completed} color={color} />
        <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {value}
          {target ? `/${target}` : ""} {unit}
        </span>
        {bubble}
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Progresso de ${habit.name}`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        {increments.map((inc) => (
          <button
            key={inc}
            type="button"
            disabled={pending}
            onClick={() => onAdd(inc)}
            className="flex min-h-10 items-center gap-1 rounded-full border border-input bg-card px-3.5 text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
          >
            <Plus className="size-3.5" />
            {inc}
            {unit}
          </button>
        ))}
        {value > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onAdd(-(increments[0] ?? 1))}
            className="ml-auto flex size-10 items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
            aria-label={`Remover ${increments[0]} ${unit}`}
          >
            <Minus className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
