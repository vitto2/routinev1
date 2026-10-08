"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleAlert, ShieldCheck } from "lucide-react";
import { pauseHabits } from "@/lib/actions/pause";
import { addDaysISO, compareISO, formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PausableHabit {
  id: string;
  name: string;
}

type Duration = "today" | "3d" | "1w" | "2w" | "open" | "custom";

const DURATIONS: { value: Duration; label: string }[] = [
  { value: "today", label: "Só hoje" },
  { value: "3d", label: "3 dias" },
  { value: "1w", label: "1 semana" },
  { value: "2w", label: "2 semanas" },
  { value: "open", label: "Até eu retomar" },
  { value: "custom", label: "Escolher data" },
];

function resumeDate(duration: Duration, today: string, custom: string): string | null {
  switch (duration) {
    case "today":
      return addDaysISO(today, 1);
    case "3d":
      return addDaysISO(today, 3);
    case "1w":
      return addDaysISO(today, 7);
    case "2w":
      return addDaysISO(today, 14);
    case "custom":
      return custom || null;
    default:
      return null;
  }
}

function PauseForm({
  today,
  habits,
  fixedHabitId,
  onDone,
}: {
  today: string;
  habits: PausableHabit[];
  fixedHabitId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "some">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration>("1w");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resumeOn = resumeDate(duration, today, custom);
  const customInvalid =
    duration === "custom" && (!custom || compareISO(custom, addDaysISO(today, 1)) < 0);

  const summary =
    duration === "open"
      ? "Pausa por tempo indeterminado. Você retoma quando quiser."
      : resumeOn && !customInvalid
        ? `Em pausa de hoje até ${formatDisplayDate(addDaysISO(resumeOn, -1))}. Volta a valer em ${formatDisplayDate(resumeOn)}.`
        : "Escolha a data de retorno.";

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (customInvalid) {
      setError("Escolha uma data de retorno a partir de amanhã.");
      return;
    }
    if (!fixedHabitId && scope === "some" && selected.length === 0) {
      setError("Escolha pelo menos um hábito.");
      return;
    }

    startTransition(async () => {
      try {
        const habitIds = fixedHabitId ? [fixedHabitId] : scope === "all" ? null : selected;
        await pauseHabits({ habitIds, resumeOn: duration === "open" ? null : resumeOn });
        toast.success("Pausa ativada");
        router.refresh();
        onDone();
      } catch {
        toast.error("Não foi possível pausar. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {!fixedHabitId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">O que pausar?</p>
          <Segmented
            label="O que pausar"
            value={scope}
            onChange={(v) => {
              setScope(v);
              setError(null);
            }}
            options={[
              { value: "all", label: "Todos os hábitos" },
              { value: "some", label: "Escolher hábitos" },
            ]}
          />
          {scope === "some" ? (
            <div role="group" aria-label="Hábitos" className="max-h-48 space-y-1.5 overflow-y-auto">
              {habits.map((habit) => {
                const checked = selected.includes(habit.id);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggle(habit.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors",
                      checked ? "border-primary bg-primary/10" : "border-input bg-card hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                      aria-hidden
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="truncate font-medium">{habit.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Por quanto tempo?</p>
        <div role="group" aria-label="Duração da pausa" className="flex flex-wrap gap-2">
          {DURATIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={duration === option.value}
              onClick={() => {
                setDuration(option.value);
                setError(null);
              }}
              className={cn(
                "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:scale-95",
                duration === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card hover:bg-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {duration === "custom" ? (
          <Input
            type="date"
            aria-label="Data de retorno"
            value={custom}
            min={addDaysISO(today, 1)}
            onChange={(e) => {
              setCustom(e.target.value);
              setError(null);
            }}
          />
        ) : null}
        <p aria-live="polite" className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          {summary}
        </p>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        Seu histórico e suas sequências ficam preservados: dias em pausa não contam como falha.
      </p>

      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Pausando..." : "Pausar"}
      </Button>
    </form>
  );
}

export function PauseDialog({
  open,
  onOpenChange,
  today,
  habits,
  fixedHabitId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  habits: PausableHabit[];
  fixedHabitId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {fixedHabitId ? "Pausar este hábito" : "Pausar hábitos"}
          </DialogTitle>
          <DialogDescription>
            Ideal para viagens, doença ou férias: nada é cobrado enquanto estiver em pausa.
          </DialogDescription>
        </DialogHeader>
        <PauseForm
          today={today}
          habits={habits}
          fixedHabitId={fixedHabitId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
