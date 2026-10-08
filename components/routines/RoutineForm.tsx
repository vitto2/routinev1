"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createRoutine, deleteRoutine, updateRoutine } from "@/lib/actions/routines";
import { ROUTINE_PERIODS } from "@/lib/constants/routines";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { routineSchema } from "@/lib/validation/routine";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { RoutinePeriod } from "@/types/database.types";
import type { Routine } from "@/types/domain";

export function RoutineForm({ routine }: { routine?: Routine }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(routine?.name ?? "");
  const [period, setPeriod] = useState<RoutinePeriod>(routine?.period ?? "morning");
  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(routineSchema);

  const values = { name, period };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data = validate(values);
    if (!data) {
      focusFirstInvalid(formRef.current);
      return;
    }

    startTransition(async () => {
      try {
        if (routine) {
          await updateRoutine(routine.id, data);
          toast.success("Rotina atualizada");
          router.refresh();
        } else {
          const created = await createRoutine(data);
          toast.success("Rotina criada. Agora escolha os hábitos dela.");
          router.push(`/routines/${created.id}`);
        }
      } catch {
        toast.error("Não foi possível salvar a rotina. Tente novamente.");
      }
    });
  }

  function handleDelete() {
    if (!routine) return;
    if (!confirm(`Excluir a rotina "${routine.name}"? Os hábitos dela continuam existindo.`)) return;

    startTransition(async () => {
      try {
        await deleteRoutine(routine.id);
        toast.success("Rotina excluída");
        router.push("/routines");
        router.refresh();
      } catch {
        toast.error("Não foi possível excluir a rotina.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <Field id="routine-name" label="Nome" required error={errors.name}>
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
            onBlur={() => validateField(values, "name")}
            placeholder="Ex: Rotina da manhã"
            autoComplete="off"
            maxLength={40}
          />
        )}
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">Período do dia</p>
        <Segmented<RoutinePeriod>
          label="Período do dia"
          value={period}
          onChange={setPeriod}
          columns={2}
          options={ROUTINE_PERIODS.map((p) => ({
            value: p.value,
            label: p.label,
            description: p.hint,
          }))}
        />
        <p className="text-xs text-muted-foreground">
          As rotinas aparecem no Hoje na ordem do dia: manhã, tarde, noite e outras.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Salvando..." : routine ? "Salvar alterações" : "Criar rotina"}
        </Button>
        {routine ? (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 className="size-4" />
            Excluir rotina
          </Button>
        ) : null}
      </div>
    </form>
  );
}
