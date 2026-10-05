"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import type { ScheduleInput } from "@/lib/validation/habit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS } from "@/lib/dates";
import type { HabitWithSchedules, Pillar } from "@/types/domain";

const NO_PILLAR = "none";

export function HabitForm({
  habit,
  pillars,
}: {
  habit?: HabitWithSchedules;
  pillars: Pillar[];
}) {
  const router = useRouter();
  const currentSchedule = habit?.habit_schedules.find((s) => s.end_date === null);

  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [pillarId, setPillarId] = useState(habit?.pillar_id ?? NO_PILLAR);
  const [habitType, setHabitType] = useState<"build" | "avoid">(
    habit?.habit_type ?? "build",
  );
  const [trackingType, setTrackingType] = useState<
    "checkbox" | "quantity" | "time"
  >(habit?.tracking_type ?? "checkbox");
  const [targetValue, setTargetValue] = useState(
    habit?.target_value?.toString() ?? "",
  );
  const [targetUnit, setTargetUnit] = useState<"ml" | "min">(
    (habit?.target_unit as "ml" | "min") ?? "ml",
  );

  const [scheduleType, setScheduleType] = useState<ScheduleInput["schedule_type"]>(
    currentSchedule?.schedule_type ?? "daily",
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    currentSchedule?.weekdays ?? [1, 2, 3, 4, 5],
  );
  const [frequencyTarget, setFrequencyTarget] = useState(
    currentSchedule?.frequency_target?.toString() ?? "3",
  );
  const [intervalDays, setIntervalDays] = useState(
    currentSchedule?.interval_days?.toString() ?? "2",
  );
  const [specificDate, setSpecificDate] = useState(
    currentSchedule?.specific_date ?? "",
  );

  const [pending, startTransition] = useTransition();

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function buildSchedule(): ScheduleInput {
    switch (scheduleType) {
      case "daily":
        return { schedule_type: "daily" };
      case "weekdays":
        return { schedule_type: "weekdays", weekdays };
      case "x_per_week":
        return {
          schedule_type: "x_per_week",
          frequency_target: Number(frequencyTarget) || 1,
        };
      case "specific_date":
        return { schedule_type: "specific_date", specific_date: specificDate };
      case "interval":
        return {
          schedule_type: "interval",
          interval_days: Number(intervalDays) || 2,
        };
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (scheduleType === "weekdays" && weekdays.length === 0) {
      toast.error("Selecione ao menos um dia da semana");
      return;
    }
    if (scheduleType === "specific_date" && !specificDate) {
      toast.error("Selecione a data");
      return;
    }

    const payload = {
      name,
      description: description || null,
      pillar_id: pillarId === NO_PILLAR ? null : pillarId,
      habit_type: habitType,
      tracking_type: trackingType,
      target_value:
        trackingType === "quantity" || trackingType === "time"
          ? Number(targetValue) || null
          : null,
      target_unit:
        trackingType === "quantity" || trackingType === "time" ? targetUnit : null,
      icon: habit?.icon ?? null,
      color: habit?.color ?? null,
      schedule: buildSchedule(),
    };

    startTransition(async () => {
      try {
        if (habit) {
          await updateHabit(habit.id, payload);
          toast.success("Hábito atualizado");
        } else {
          await createHabit(payload);
          toast.success("Hábito criado");
        }
        router.push("/habits");
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar o hábito");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="habit-name">Nome</Label>
        <Input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Estudar inglês"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="habit-description">Descrição (opcional)</Label>
        <Textarea
          id="habit-description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Pilar</Label>
        <Select value={pillarId} onValueChange={(v) => setPillarId(v ?? NO_PILLAR)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PILLAR}>Sem pilar</SelectItem>
            {pillars.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          <ToggleCard
            active={habitType === "build"}
            title="Fazer"
            description="Algo que preciso cumprir"
            onClick={() => setHabitType("build")}
          />
          <ToggleCard
            active={habitType === "avoid"}
            title="Evitar"
            description="Algo que quero não fazer"
            onClick={() => {
              setHabitType("avoid");
              setTrackingType("checkbox");
            }}
          />
        </div>
      </div>

      {habitType === "build" ? (
        <div className="space-y-2">
          <Label>Como medir</Label>
          <div className="grid grid-cols-3 gap-2">
            <ToggleCard
              compact
              active={trackingType === "checkbox"}
              title="Checkbox"
              onClick={() => setTrackingType("checkbox")}
            />
            <ToggleCard
              compact
              active={trackingType === "quantity"}
              title="Quantidade"
              onClick={() => setTrackingType("quantity")}
            />
            <ToggleCard
              compact
              active={trackingType === "time"}
              title="Tempo"
              onClick={() => setTrackingType("time")}
            />
          </div>
        </div>
      ) : null}

      {habitType === "build" && (trackingType === "quantity" || trackingType === "time") ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="target-value">Meta</Label>
            <Input
              id="target-value"
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={trackingType === "quantity" ? "3000" : "60"}
            />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select
              value={targetUnit}
              onValueChange={(v) => setTargetUnit(v as "ml" | "min")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trackingType === "quantity" ? (
                  <SelectItem value="ml">ml</SelectItem>
                ) : (
                  <SelectItem value="min">min</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <Label>Frequência</Label>
        <Select
          value={scheduleType}
          onValueChange={(v) => setScheduleType(v as ScheduleInput["schedule_type"])}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Todos os dias</SelectItem>
            <SelectItem value="weekdays">Dias específicos da semana</SelectItem>
            <SelectItem value="x_per_week">X vezes por semana</SelectItem>
            <SelectItem value="specific_date">Data específica</SelectItem>
            <SelectItem value="interval">Intervalo personalizado</SelectItem>
          </SelectContent>
        </Select>

        {scheduleType === "weekdays" ? (
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={cn(
                  "size-10 rounded-full border text-xs font-medium transition-colors",
                  weekdays.includes(index)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {label[0]}
              </button>
            ))}
          </div>
        ) : null}

        {scheduleType === "x_per_week" ? (
          <div className="space-y-2">
            <Label htmlFor="frequency-target">Vezes por semana</Label>
            <Input
              id="frequency-target"
              type="number"
              min={1}
              max={7}
              value={frequencyTarget}
              onChange={(e) => setFrequencyTarget(e.target.value)}
            />
          </div>
        ) : null}

        {scheduleType === "specific_date" ? (
          <div className="space-y-2">
            <Label htmlFor="specific-date">Data</Label>
            <Input
              id="specific-date"
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
            />
          </div>
        ) : null}

        {scheduleType === "interval" ? (
          <div className="space-y-2">
            <Label htmlFor="interval-days">A cada quantos dias</Label>
            <Input
              id="interval-days"
              type="number"
              min={2}
              max={90}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : habit ? "Salvar alterações" : "Criar hábito"}
      </Button>
    </form>
  );
}

function ToggleCard({
  active,
  title,
  description,
  onClick,
  compact,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors",
        compact && "text-center text-sm",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
      )}
    >
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </button>
  );
}
