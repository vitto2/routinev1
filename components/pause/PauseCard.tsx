"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { PauseDialog, type PausableHabit } from "@/components/pause/PauseDialog";
import { ResumeButton } from "@/components/pause/ResumeButton";

export interface PausedHabitView {
  id: string;
  name: string;
  /** primeiro dia de volta, ou null se indefinido */
  resumesOn: string | null;
}

/** Cartão do Perfil: situação da pausa e atalhos para pausar/retomar. */
export function PauseCard({
  today,
  habits,
  paused,
}: {
  today: string;
  habits: PausableHabit[];
  paused: PausedHabitView[];
}) {
  const [open, setOpen] = useState(false);
  const allPaused = habits.length > 0 && paused.length === habits.length;
  const returns = [...new Set(paused.map((h) => h.resumesOn).filter(Boolean))].sort() as string[];

  const description =
    (paused.length === 0
      ? "Viagem, doença ou descanso: pause sem perder suas sequências."
      : allPaused
        ? "Todos os seus hábitos estão em pausa."
        : `${paused.length} ${paused.length === 1 ? "hábito está" : "hábitos estão"} em pausa.`) +
    (paused.length > 0
      ? returns.length > 0
        ? ` Voltam a valer em ${formatDisplayDate(returns[0])}.`
        : " Sem data de retorno."
      : "");

  return (
    <Panel icon={PauseCircle} tone="warning" title="Pausa e férias" description={description}>
      {paused.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Hábitos em pausa">
          {paused.map((habit) => (
            <li
              key={habit.id}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {habit.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {paused.length > 0 ? <ResumeButton habitIds={null} label="Retomar tudo" /> : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={habits.length === 0 || allPaused}
        >
          Pausar hábitos
        </Button>
      </div>

      {open ? (
        <PauseDialog
          open={open}
          onOpenChange={setOpen}
          today={today}
          habits={habits.filter((h) => !paused.some((p) => p.id === h.id))}
        />
      ) : null}
    </Panel>
  );
}
