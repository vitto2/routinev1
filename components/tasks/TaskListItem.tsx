"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteTask } from "@/lib/actions/tasks";
import { queuedMessage, submitTaskCompletion } from "@/lib/offline/client";
import { overlayTaskCompleted } from "@/lib/offline/overlay";
import { usePendingEntry } from "@/lib/offline/store";
import { formatDisplayDate } from "@/lib/dates";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import type { Task } from "@/types/domain";

const PRIORITY: Record<Task["priority"], { dot: string; label: string }> = {
  high: { dot: "bg-destructive", label: "Prioridade alta" },
  medium: { dot: "bg-warning", label: "Prioridade média" },
  low: { dot: "bg-muted-foreground", label: "Prioridade baixa" },
};

export function TaskListItem({
  task,
  today,
  index = 0,
  overdue = false,
}: {
  task: Task;
  today: string;
  index?: number;
  overdue?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const pendingEntry = usePendingEntry(`t:${task.id}`);
  const [completed, setCompleted] = useOptimistic(
    overlayTaskCompleted(pendingEntry, task.completed),
    (_current, next: boolean) => next,
  );

  /** Grava o estado desejado (não "alternar"): o "Desfazer" nunca inverte por engano. */
  function commit(next: boolean, announce: boolean) {
    startTransition(async () => {
      setCompleted(next);
      try {
        const outcome = await submitTaskCompletion(task.id, next);
        // Se o servidor recusar ("failed"), quem avisa é o motor da fila (uma vez só).
        if (outcome.status === "queued") {
          toast(queuedMessage(), { id: "task-feedback", duration: 4000 });
        } else if (outcome.status === "saved" && next && announce) {
          toast(`Tarefa concluída: ${task.title}`, {
            id: "task-feedback",
            duration: 6000,
            action: { label: "Desfazer", onClick: () => commit(false, false) },
          });
        }
      } catch {
        toast.error("Não foi possível atualizar a tarefa");
      }
    });
  }

  function handleToggle() {
    commit(!completed, true);
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

  const priority = PRIORITY[task.priority];

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-rise flex items-center gap-1.5"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={completed}
        className={cn(
          "flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-sm transition-[transform,background-color,border-color] duration-200 active:scale-[0.98]",
          completed ? "border-transparent bg-success/10" : "border-border hover:bg-accent/40",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
            completed
              ? "animate-check border-transparent bg-success text-success-foreground"
              : "border-input bg-card",
          )}
        >
          {completed ? <Check className="size-[18px]" strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium transition-colors duration-200",
              completed && "text-muted-foreground line-through decoration-1",
            )}
          >
            {task.title}
          </span>
          {overdue || task.due_time ? (
            <span
              className={cn(
                "block text-xs",
                overdue && !completed ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              {overdue ? `Venceu em ${formatDisplayDate(task.due_date)}` : null}
              {overdue && task.due_time ? " · " : null}
              {task.due_time ? task.due_time.slice(0, 5) : null}
            </span>
          ) : null}
        </span>
        <span className={cn("size-2.5 shrink-0 rounded-full", priority.dot)} aria-hidden />
        <span className="sr-only">{priority.label}</span>
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Editar tarefa ${task.title}`}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Excluir tarefa ${task.title}`}
      >
        <Trash2 className="size-4" />
      </button>
      {editing ? (
        <TaskDialog open={editing} onOpenChange={setEditing} today={today} task={task} />
      ) : null}
    </div>
  );
}
