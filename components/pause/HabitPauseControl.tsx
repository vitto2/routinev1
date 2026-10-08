"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";
import { PauseDialog } from "@/components/pause/PauseDialog";
import { ResumeButton } from "@/components/pause/ResumeButton";
import { cn } from "@/lib/utils";

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
    <div
      data-ui="habit-pause-control"
      className={cn(surfaceVariants({ padding: "row" }), "flex min-h-16 items-center gap-3")}
    >
      <IconBadge icon={PauseCircle} tone="warning" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium leading-snug">{paused ? "Hábito em pausa" : "Pausa"}</p>
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
