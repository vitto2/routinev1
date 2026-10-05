"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleTaskCompletion } from "@/lib/actions/tasks";
import type { Task } from "@/types/domain";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

export function TaskListItem({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleTaskCompletion(task.id);
      } catch {
        toast.error("Não foi possível atualizar a tarefa");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30",
        )}
      >
        {task.completed ? <Check className="size-4" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-medium",
            task.completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {task.due_time ? (
          <span className="block text-xs text-muted-foreground">
            {task.due_time.slice(0, 5)}
          </span>
        ) : null}
      </span>
      <span
        className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
        aria-hidden
      />
    </button>
  );
}
