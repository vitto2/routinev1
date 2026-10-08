"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { taskSchema } from "@/lib/validation/task";
import { addDaysISO, formatDisplayDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/types/domain";

type Priority = "low" | "medium" | "high";

function TaskForm({
  task,
  today,
  onDone,
}: {
  task?: Task;
  today: string;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? today);
  const [dueTime, setDueTime] = useState(task?.due_time?.slice(0, 5) ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(taskSchema);

  const values = {
    title,
    description: description || null,
    due_date: dueDate,
    due_time: dueTime || null,
    priority,
  };

  const tomorrow = addDaysISO(today, 1);
  const nextWeek = addDaysISO(today, 7);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data = validate(values);
    if (!data) {
      focusFirstInvalid(formRef.current);
      return;
    }

    startTransition(async () => {
      try {
        if (task) {
          await updateTask(task.id, data);
          toast.success("Tarefa atualizada");
        } else {
          await createTask(data);
          toast.success("Tarefa criada");
        }
        onDone();
      } catch {
        toast.error("Não foi possível salvar a tarefa. Tente novamente.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field id="task-title" label="O que precisa ser feito?" required error={errors.title}>
        {(props) => (
          <Input
            {...props}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clear("title");
            }}
            onBlur={() => validateField(values, "title")}
            placeholder="Ex: Marcar dentista"
            autoComplete="off"
            maxLength={120}
            autoFocus
          />
        )}
      </Field>

      <Field id="task-date" label="Data" required error={errors.due_date}>
        {(props) => (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de data">
              <Chip active={dueDate === today} onClick={() => { setDueDate(today); clear("due_date"); }}>
                Hoje
              </Chip>
              <Chip active={dueDate === tomorrow} onClick={() => { setDueDate(tomorrow); clear("due_date"); }}>
                Amanhã
              </Chip>
              <Chip active={dueDate === nextWeek} onClick={() => { setDueDate(nextWeek); clear("due_date"); }}>
                Em 1 semana
              </Chip>
            </div>
            <Input
              {...props}
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                clear("due_date");
              }}
              onBlur={() => validateField(values, "due_date")}
            />
            {dueDate && dueDate < today ? (
              <p className="text-xs text-muted-foreground">
                {formatDisplayDate(dueDate)} já passou: a tarefa aparecerá como atrasada.
              </p>
            ) : null}
          </div>
        )}
      </Field>

      <Field
        id="task-time"
        label="Horário"
        optionalHint
        error={errors.due_time}
        hint="Com horário, você recebe um lembrete 15 minutos antes."
      >
        {(props) => (
          <div className="flex items-center gap-2">
            <Input
              {...props}
              type="time"
              value={dueTime}
              onChange={(e) => {
                setDueTime(e.target.value);
                clear("due_time");
              }}
            />
            {dueTime ? (
              <Button type="button" variant="ghost" onClick={() => setDueTime("")}>
                Limpar
              </Button>
            ) : null}
          </div>
        )}
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">Prioridade</p>
        <Segmented<Priority>
          label="Prioridade"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "low", label: "Baixa" },
            { value: "medium", label: "Média" },
            { value: "high", label: "Alta" },
          ]}
        />
      </div>

      <Field id="task-description" label="Detalhes" optionalHint error={errors.description}>
        {(props) => (
          <Textarea
            {...props}
            value={description ?? ""}
            onChange={(e) => {
              setDescription(e.target.value);
              clear("description");
            }}
            rows={2}
            maxLength={500}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : task ? "Salvar alterações" : "Adicionar tarefa"}
      </Button>
    </form>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  today,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  task?: Task;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {task ? "Editar tarefa" : "Nova tarefa"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preencha os dados da tarefa. Campos com asterisco são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <TaskForm task={task} today={today} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
