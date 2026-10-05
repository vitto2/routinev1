"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleTaskCompletion, deleteTask } from "@/lib/actions/tasks";
import { formatDisplayDate } from "@/lib/dates";
import type { Task } from "@/types/domain";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

export function TaskListItem({
  task,
  index = 0,
  overdue = false,
}: {
  task: Task;
  index?: number;
  overdue?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useOptimistic(
    task.completed,
    (_current, next: boolean) => next,
  );

  function handleToggle() {
    startTransition(async () => {
      setCompleted(!completed);
      try {
        await toggleTaskCompletion(task.id);
      } catch {
        toast.error("Não foi possível atualizar a tarefa");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;

    startTransition(async () => {
      try {
        await deleteTask(task.id);
        toast.success("Tarefa excluída");
      } catch {
        toast.error("Não foi possível excluir a tarefa");
      }
    });
  }

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-rise flex items-center gap-2"
    >
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
          completed && "border-primary/30 bg-primary/5",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
            completed
              ? "animate-check border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30",
          )}
        >
          {completed ? <Check className="size-4" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium transition-colors duration-200",
              completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          {overdue || task.due_time ? (
            <span
              className={cn(
                "block text-xs",
                overdue && !completed ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {overdue ? `Venceu em ${formatDisplayDate(task.due_date)}` : null}
              {overdue && task.due_time ? " · " : null}
              {task.due_time ? task.due_time.slice(0, 5) : null}
            </span>
          ) : null}
        </span>
        <span
          className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        aria-label={`Excluir tarefa ${task.title}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
