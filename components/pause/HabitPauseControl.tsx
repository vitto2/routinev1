"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { PauseDialog } from "@/components/pause/PauseDialog";
import { ResumeButton } from "@/components/pause/ResumeButton";

/** Na edição do hábito: pausar só este hábito ou retomá-lo. */
export function HabitPauseControl({
  habitId,
  habitName,
  today,
  paused,
  resumesOn,
}: {
  habitId: string;
  habitName: string;
  today: string;
  paused: boolean;
  resumesOn: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <PauseCircle className="size-5 text-warning" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{paused ? "Hábito em pausa" : "Pausa"}</p>
        <p className="text-muted-foreground">
          {paused
            ? resumesOn
              ? `Volta a valer em ${formatDisplayDate(resumesOn)}.`
              : "Sem data de retorno."
            : "Suspenda este hábito sem perder a sequência."}
        </p>
      </div>
      {paused ? (
        <ResumeButton habitIds={[habitId]} label="Retomar" variant="outline" />
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Pausar
        </Button>
      )}
      {open ? (
        <PauseDialog
          open={open}
          onOpenChange={setOpen}
          today={today}
          habits={[{ id: habitId, name: habitName }]}
          fixedHabitId={habitId}
        />
      ) : null}
    </div>
  );
}
