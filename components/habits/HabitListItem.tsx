"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Minus, NotebookPen, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LogResult } from "@/lib/actions/habitLogs";
import {
  queuedMessage,
  submitHabitCompletion,
  submitHabitValue,
  type SubmitOutcome,
} from "@/lib/offline/client";
import { overlayHabitState } from "@/lib/offline/overlay";
import { usePendingEntry } from "@/lib/offline/store";
import { celebrationMessage, type StreakUnit } from "@/lib/gamification";
import {
  ICONS_BY_NAME,
  accentStyles,
  readableOn,
  DEFAULT_ACCENT,
} from "@/lib/constants/appearance";
import { HabitNoteDialog } from "@/components/habits/HabitNoteDialog";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { IconBadge } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";
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
      data-ui="check"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
        done ? "animate-check border-transparent" : "border-input bg-card",
      )}
      style={done ? { backgroundColor: color, color: readableOn(color) } : undefined}
    >
      {done ? <Check className="size-4" strokeWidth={3} /> : null}
    </span>
  );
}

/** Botão de nota: 40 x 40 px com glifo de 20 px, igual a todo botão só de ícone do app. */
function NoteButton({
  hasNote,
  onClick,
  className,
}: {
  hasNote: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-ui="icon-button"
      onClick={onClick}
      aria-label={hasNote ? "Editar nota" : "Adicionar nota"}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
        hasNote
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <NotebookPen className="size-5" />
      {hasNote ? (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" aria-hidden />
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
  // Sem bloquear os botões enquanto envia: cada toque grava o valor total (estado absoluto)
  // e a fila garante que o último vence, então toques rápidos somam.
  const [, startTransition] = useTransition();
  // Alteração feita sem internet (ou ainda em envio) vale mais que o dado do servidor.
  const pendingEntry = usePendingEntry(`h:${habit.id}:${dateISO}`);
  const [state, setOptimistic] = useOptimistic<LogState, LogState>(
    overlayHabitState(
      pendingEntry,
      { completed: log?.completed ?? false, value: Number(log?.value ?? 0) },
      habit.target_value,
    ),
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
      toast(`Concluído: ${habit.name}`, { id: TOAST_ID, duration: 6000, action });
    }
  }

  /**
   * Mostra o desfecho de um registro: aviso de guardado ou, se salvo, o de conclusão.
   * Quando o servidor recusa ("failed"), quem avisa é o motor da fila (uma vez só).
   */
  function handleOutcome(
    outcome: SubmitOutcome,
    onSaved?: (result: LogResult) => void,
  ) {
    if (outcome.status === "queued") {
      toast(queuedMessage(), { id: TOAST_ID, duration: 4000 });
    } else if (outcome.status === "saved" && outcome.result && onSaved) {
      onSaved(outcome.result as LogResult);
    }
  }

  /** Grava o estado de marcação desejado; `announceDone` mostra o aviso com "Desfazer". */
  function commitCompletion(next: boolean, announceDone: boolean) {
    startTransition(async () => {
      setOptimistic({ completed: next, value: state.value });
      try {
        const outcome = await submitHabitCompletion(habit.id, dateISO, next);
        handleOutcome(outcome, (result) => {
          if (next && announceDone) announce(result, () => commitCompletion(false, false));
        });
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  /** Grava o valor total do dia (quantidade/tempo). */
  function commitValue(nextValue: number, previousValue: number, announceDone: boolean) {
    const target = habit.target_value ?? 0;
    const completed = target > 0 ? nextValue >= target : nextValue > 0;
    const wasCompleted = state.completed;

    startTransition(async () => {
      setOptimistic({ completed, value: nextValue });
      try {
        const outcome = await submitHabitValue(habit.id, dateISO, nextValue);
        handleOutcome(outcome, (result) => {
          if (announceDone && result.completed && !wasCompleted) {
            announce(result, () => commitValue(previousValue, nextValue, false));
          }
        });
      } catch {
        toast.error("Não foi possível atualizar");
      }
    });
  }

  const delay = { animationDelay: `${Math.min(index, 8) * 40}ms` };
  // Sempre presente (com um ponto quando não há ícone), para as linhas ficarem alinhadas.
  const bubble = <IconBadge icon={Icon} size="sm" accent={accentColor} />;

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

  const isProgress = habit.tracking_type === "quantity" || habit.tracking_type === "time";
  const isAvoid = habit.habit_type === "avoid";

  // Linhas de detalhe sob o nome (a mesma estrutura nos dois tipos de cartão).
  const metaParts: React.ReactNode[] = [];
  if (!isProgress) {
    if (isAvoid) {
      metaParts.push(state.completed ? "Consegui evitar hoje" : "Hábito a evitar");
    } else if (weekProgress) {
      metaParts.push(`${weekProgress.done}/${weekProgress.target} nesta semana`);
    }
  }
  metaParts.push(...extras);

  const body = (
    <>
      <CheckCircle done={state.completed} color={accentColor} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-medium leading-snug transition-colors duration-200",
            !isProgress && state.completed && "text-muted-foreground line-through decoration-1",
          )}
        >
          {habit.name}
        </span>
        {metaParts.length > 0 ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {metaParts.map((part, i) => (
              <span key={i}>{part}</span>
            ))}
          </span>
        ) : null}
      </span>
      {bubble}
    </>
  );

  return (
    <div
      data-ui="habit-row"
      style={{ ...delay, ...(state.completed ? accent.soft : undefined) }}
      className={cn(
        surfaceVariants({ padding: "none" }),
        "animate-rise transition-colors duration-200",
        state.completed && "border-transparent",
      )}
    >
      {/* Cabeçalho idêntico nos dois tipos: [check 32] [nome e detalhes] [ícone 32] [nota 40] */}
      <div className="flex min-h-16 items-center">
        {isProgress ? (
          <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2">{body}</div>
        ) : (
          <button
            type="button"
            onClick={() => commitCompletion(!state.completed, true)}
            aria-pressed={state.completed}
            className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-l-2xl py-3 pl-4 pr-2 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-accent/60"
          >
            {body}
          </button>
        )}
        <NoteButton className="mr-2" hasNote={Boolean(note)} onClick={() => setNoteOpen(true)} />
      </div>

      {isProgress ? (
        <ProgressControls
          habit={habit}
          value={state.value}
          color={accentColor}
          onChange={(next) => commitValue(next, state.value, true)}
        />
      ) : null}

      {noteOpen ? noteDialog : null}
    </div>
  );
}

/** Barra de progresso e botões de soma/subtração dos hábitos de quantidade e tempo. */
function ProgressControls({
  habit,
  value,
  color,
  onChange,
}: {
  habit: HabitWithSchedules;
  value: number;
  color: string;
  onChange: (next: number) => void;
}) {
  const target = habit.target_value ?? 0;
  const unit = habit.target_unit ?? "";
  const increments = QUICK_INCREMENTS[unit] ?? [1, 5];
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Barra e valor na mesma linha: o número nunca quebra em duas linhas. */}
      <div className="flex items-center gap-3">
        <div
          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
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
        <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-muted-foreground">
          {value}
          {target ? `/${target}` : ""} {unit}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {increments.map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => onChange(value + inc)}
            className="flex h-10 items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95"
          >
            <Plus className="size-4" aria-hidden />
            {inc}
            {unit}
          </button>
        ))}

        {/* Sempre ocupa o lugar: o resto da linha não "pula" quando o botão aparece. */}
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - (increments[0] ?? 1)))}
          disabled={value <= 0}
          tabIndex={value > 0 ? 0 : -1}
          aria-hidden={value <= 0}
          aria-label={`Remover ${increments[0]} ${unit}`}
          className={cn(
            "ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card text-muted-foreground transition-[transform,background-color] duration-150 hover:bg-accent active:scale-95",
            value <= 0 && "invisible",
          )}
        >
          <Minus className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
