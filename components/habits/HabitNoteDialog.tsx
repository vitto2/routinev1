"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setHabitNote } from "@/lib/actions/habitLogs";
import { formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MAX = 280;

function NoteForm({
  habitId,
  dateISO,
  initialNote,
  onSaved,
  onClose,
}: {
  habitId: string;
  dateISO: string;
  initialNote: string | null;
  onSaved: (note: string | null) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();

  function save(next: string | null) {
    startTransition(async () => {
      try {
        const result = await setHabitNote(habitId, dateISO, next);
        onSaved(result.note);
        toast.success(result.note ? "Nota salva" : "Nota removida");
        onClose();
      } catch {
        toast.error("Não foi possível salvar a nota. Tente novamente.");
      }
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save(text.trim() === "" ? null : text);
      }}
    >
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          rows={4}
          autoFocus
          aria-label="Nota do dia"
          placeholder="Como foi hoje? O que ajudou ou atrapalhou?"
        />
        <p
          className="text-right text-xs text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {text.length}/{MAX}
        </p>
      </div>
      <div className="flex gap-2">
        {initialNote ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={pending}
            onClick={() => save(null)}
          >
            Remover
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nota"}
        </Button>
      </div>
    </form>
  );
}

export function HabitNoteDialog({
  open,
  onOpenChange,
  habitId,
  habitName,
  dateISO,
  initialNote,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitName: string;
  dateISO: string;
  initialNote: string | null;
  onSaved: (note: string | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{habitName}</DialogTitle>
          <DialogDescription>Nota de {formatDisplayDate(dateISO)}</DialogDescription>
        </DialogHeader>
        <NoteForm
          habitId={habitId}
          dateISO={dateISO}
          initialNote={initialNote}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
