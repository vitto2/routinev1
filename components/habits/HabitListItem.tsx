"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Minus, NotebookPen, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  setHabitCompletion,
  setHabitValue,
  type LogResult,
} from "@/lib/actions/habitLogs";
import { celebrationMessage, type StreakUnit } from "@/lib/gamification";
import {
  ICONS_BY_NAME,
  accentStyles,
  readableOn,
  DEFAULT_ACCENT,
} from "@/lib/constants/appearance";
import { HabitNoteDialog } from "@/components/habits/HabitNoteDialog";
import { StreakBadge } from "@/components/habits/StreakBadge";
import type { HabitLog, HabitWithSchedules } from "@/types/domain";

const QUICK_INCREMENTS: Record<string, number[]> = {
  ml: [250, 500],
  min: [15, 30],
};

const TOAST_ID = "habit-feedback";

type LogState = { completed: boolean; value: number };

export interface ChallengeView {
  day: number;
  total: number;
}

function ChallengeBadge({ day, total }: ChallengeView) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-foreground">
      <Trophy className="size-3.5 text-primary" aria-hidden />
      Desafio: dia {day}/{total}
    </span>
  );
}

export interface StreakView {
  current: number;
  unit: StreakUnit;
  /** a janela de cálculo acabou antes de a sequência terminar */
  capped?: boolean;
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

function NoteButton({ hasNote, onClick }: { hasNote: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hasNote ? "Editar nota" : "Adicionar nota"}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
        hasNote
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <NotebookPen className="size-4" />
      {hasNote ? (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
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
  streak,
  challenge,
}: {
  habit: HabitWithSchedules;
  log: HabitLog | undefined;
  dateISO: string;
  index?: number;
  weekProgress?: { done: number; target: number };
  /** cor do hábito, ou do pilar quando o hábito não tem a sua */
  color?: string | null;
  iconName?: string | null;
  streak?: StreakView;
  /** desafio em andamento (dia atual / total) */
  challenge?: ChallengeView;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic<LogState, LogState>(
    { completed: log?.completed ?? false, value: Number(log?.value ?? 0) },
    (_current, next) => next,
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteOverride, setNoteOverride] = useState<string | null | undefined>(undefined);
  const note = noteOverride === undefined ? (log?.note ?? null) : noteOverride;

  const accentColor = color || DEFAULT_ACCENT;
  const accent = accentStyles(accentColor);
  const Icon = iconName ? ICONS_BY_NAME[iconName] : undefined;

  function announce(result: LogResult, undo: () => void) {
    const message = celebrationMessage(habit.name, result.streak.current, result.streak.unit, {
      milestone: result.milestone,
      newBest: result.newBest,
    });
    const action = { label: "Desfazer", onClick: undo };

    if (message) {
      toast.success(message.title, {
        id: TOAST_ID,
        description: message.description,
        duration: 6000,
        action,
      });
    } else {
      toast(`Concluído: ${habit.name}`, { id: TOAST_ID, duration: 4000, action });
    }
  }

  /** Grava o estado de marcação desejado; `announceDone` mostra o aviso com "Desfazer". */
  function commitCompletion(next: boolean, announceDone: boolean) {
    startTransition(async () => {
      setOptimistic({ completed: next, value: state.value });
      try {
        const result = await setHabitCompletion(habit.id, dateISO, next);
        if (next && announceDone) announce(result, () => commitCompletion(false, false));
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  /** Grava o valor total do dia (quantidade/tempo). */
  function commitValue(nextValue: number, previousValue: number, announceDone: boolean) {
    const target = habit.target_value ?? 0;
    const completed = target > 0 ? nextValue >= target : nextValue > 0;

    startTransition(async () => {
      setOptimistic({ completed, value: nextValue });
      try {
        const result = await setHabitValue(habit.id, dateISO, nextValue);
        if (announceDone && result.completed && !state.completed) {
          announce(result, () => commitValue(previousValue, nextValue, false));
        }
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

  const noteDialog = (
    <HabitNoteDialog
      open={noteOpen}
      onOpenChange={setNoteOpen}
      habitId={habit.id}
      habitName={habit.name}
      dateISO={dateISO}
      initialNote={note}
      onSaved={setNoteOverride}
    />
  );

  const extras: React.ReactNode[] = [];
  if (streak && streak.current > 0) {
    extras.push(<StreakBadge current={streak.current} unit={streak.unit} capped={streak.capped} />);
  }
  if (challenge) extras.push(<ChallengeBadge day={challenge.day} total={challenge.total} />);

  if (habit.tracking_type === "quantity" || habit.tracking_type === "time") {
    return (
      <div style={delay} className="animate-rise">
        <ProgressHabitRow
          habit={habit}
          value={state.value}
          completed={state.completed}
          pending={pending}
          onChange={(next) => commitValue(next, state.value, true)}
          color={accentColor}
          bubble={bubble}
          extras={extras}
          note={
            <NoteButton hasNote={Boolean(note)} onClick={() => setNoteOpen(true)} />
          }
        />
        {noteOpen ? noteDialog : null}
      </div>
    );
  }

  const isAvoid = habit.habit_type === "avoid";
  const subtitleParts: React.ReactNode[] = [];
  if (isAvoid) {
    subtitleParts.push(state.completed ? "Consegui evitar hoje" : "Hábito a evitar");
  } else if (weekProgress) {
    subtitleParts.push(`${weekProgress.done}/${weekProgress.target} nesta semana`);
  }
  subtitleParts.push(...extras);

  return (
    <div style={delay} className="animate-rise flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => commitCompletion(!state.completed, true)}
        aria-pressed={state.completed}
        style={state.completed ? accent.soft : undefined}
        className={cn(
          "flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
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
          {subtitleParts.length > 0 ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {subtitleParts.map((part, i) => (
                <span key={i}>{part}</span>
              ))}
            </span>
          ) : null}
        </span>
        {bubble}
      </button>
      <NoteButton hasNote={Boolean(note)} onClick={() => setNoteOpen(true)} />
      {noteOpen ? noteDialog : null}
    </div>
  );
}

function ProgressHabitRow({
  habit,
  value,
  completed,
  pending,
  onChange,
  color,
  bubble,
  extras,
  note,
}: {
  habit: HabitWithSchedules;
  value: number;
  completed: boolean;
  pending: boolean;
  onChange: (next: number) => void;
  color: string;
  bubble: React.ReactNode;
  extras: React.ReactNode[];
  note: React.ReactNode;
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
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{habit.name}</span>
          {extras.length > 0 ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {extras.map((extra, i) => (
                <span key={i}>{extra}</span>
              ))}
            </span>
          ) : null}
        </span>
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
            onClick={() => onChange(value + inc)}
            className="flex min-h-10 items-center gap-1 rounded-full border border-input bg-card px-3.5 text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
          >
            <Plus className="size-3.5" />
            {inc}
            {unit}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          {value > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onChange(Math.max(0, value - (increments[0] ?? 1)))}
              className="flex size-10 items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
              aria-label={`Remover ${increments[0]} ${unit}`}
            >
              <Minus className="size-4" />
            </button>
          ) : null}
          {note}
        </span>
      </div>
    </div>
  );
}
