"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { habitSchema, type ScheduleInput } from "@/lib/validation/habit";
import { addDaysISO } from "@/lib/dates";
import { describeSchedule } from "@/lib/scheduling/summary";
import { ICONS_BY_NAME, accentStyles, DEFAULT_ACCENT } from "@/lib/constants/appearance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekdayPicker } from "@/components/habits/WeekdayPicker";
import { IconPicker, ColorPicker } from "@/components/pillars/IconColorPicker";
import type { HabitWithSchedules, Pillar } from "@/types/domain";

const NO_PILLAR = "none";

type ScheduleType = ScheduleInput["schedule_type"];
type Tracking = "checkbox" | "quantity" | "time";

const SCHEDULE_ITEMS: { value: ScheduleType; label: string }[] = [
  { value: "daily", label: "Todos os dias" },
  { value: "weekdays", label: "Dias específicos da semana" },
  { value: "x_per_week", label: "X vezes por semana" },
  { value: "interval", label: "A cada X dias" },
  { value: "specific_date", label: "Uma data específica" },
];

const GOAL_CHIPS: Record<"quantity" | "time", number[]> = {
  quantity: [250, 500, 1000, 2000, 3000],
  time: [10, 15, 30, 45, 60, 90],
};

const toNumber = (value: string) =>
  value.trim() === "" ? undefined : Number(value.replace(",", "."));

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:scale-95",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-card text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function HabitForm({
  habit,
  pillars,
  today,
}: {
  habit?: HabitWithSchedules;
  pillars: Pillar[];
  today: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const current = habit?.habit_schedules.find((s) => s.end_date === null);

  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [pillarId, setPillarId] = useState(habit?.pillar_id ?? NO_PILLAR);
  const [habitType, setHabitType] = useState<"build" | "avoid">(habit?.habit_type ?? "build");
  const [tracking, setTracking] = useState<Tracking>(habit?.tracking_type ?? "checkbox");
  const [target, setTarget] = useState(habit?.target_value?.toString() ?? "");
  const [icon, setIcon] = useState<string | null>(habit?.icon ?? null);
  const [color, setColor] = useState<string | null>(habit?.color ?? null);

  const [scheduleType, setScheduleType] = useState<ScheduleType>(current?.schedule_type ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? [1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(current?.frequency_target?.toString() ?? "3");
  const [intervalDays, setIntervalDays] = useState(current?.interval_days?.toString() ?? "2");
  const [specificDate, setSpecificDate] = useState(current?.specific_date ?? "");

  const [pending, startTransition] = useTransition();
  const { errors, validate, validateField, clear } = useFormErrors(habitSchema);

  const measured = habitType === "build" && tracking !== "checkbox";
  const unit = tracking === "time" ? "min" : "ml";

  const schedule = useMemo((): ScheduleInput => {
    switch (scheduleType) {
      case "weekdays":
        return { schedule_type: "weekdays", weekdays };
      case "x_per_week":
        return { schedule_type: "x_per_week", frequency_target: toNumber(timesPerWeek) as number };
      case "interval":
        return { schedule_type: "interval", interval_days: toNumber(intervalDays) as number };
      case "specific_date":
        return { schedule_type: "specific_date", specific_date: specificDate };
      default:
        return { schedule_type: "daily" };
    }
  }, [scheduleType, weekdays, timesPerWeek, intervalDays, specificDate]);

  const values = {
    name,
    description: description || null,
    pillar_id: pillarId === NO_PILLAR ? null : pillarId,
    habit_type: habitType,
    tracking_type: habitType === "avoid" ? "checkbox" : tracking,
    target_value: measured ? (toNumber(target) ?? null) : null,
    target_unit: measured ? unit : null,
    icon,
    color,
    schedule,
  };

  const pillar = pillars.find((p) => p.id === pillarId);
  const accent = accentStyles(color ?? pillar?.color);
  const iconName = icon ?? pillar?.icon ?? null;
  const PreviewIcon = (iconName && ICONS_BY_NAME[iconName]) || null;

  const pillarItems = [
    { value: NO_PILLAR, label: "Sem pilar" },
    ...pillars.map((p) => ({ value: p.id, label: p.name })),
  ];

  const summary = describeSchedule({
    schedule_type: schedule.schedule_type,
    weekdays: "weekdays" in schedule ? schedule.weekdays : null,
    frequency_target: "frequency_target" in schedule ? schedule.frequency_target : null,
    interval_days: "interval_days" in schedule ? schedule.interval_days : null,
    specific_date: "specific_date" in schedule ? schedule.specific_date : null,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data = validate(values);
    if (!data) {
      focusFirstInvalid(formRef.current);
      toast.error("Revise os campos destacados");
      return;
    }

    startTransition(async () => {
      try {
        if (habit) {
          await updateHabit(habit.id, data);
          toast.success("Hábito atualizado");
        } else {
          await createHabit(data);
          toast.success("Hábito criado");
        }
        router.push("/habits");
        router.refresh();
      } catch {
        toast.error("Não foi possível salvar o hábito. Tente novamente.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-7">
      <div
        className="flex items-center gap-3 rounded-2xl border border-border p-4 transition-colors duration-300"
        style={accent.soft}
        aria-hidden
      >
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300"
          style={accent.bubble}
        >
          {PreviewIcon ? <PreviewIcon className="size-6" /> : <span className="size-3 rounded-full bg-current" />}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold" style={accent.text}>
            {name.trim() || "Nome do hábito"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {summary}
            {measured && toNumber(target) ? ` · meta ${toNumber(target)} ${unit}` : ""}
          </p>
        </div>
      </div>

      <Field id="habit-name" label="Nome" required error={errors.name}>
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear("name");
            }}
            onBlur={() => validateField(values, "name")}
            placeholder="Ex: Estudar inglês"
            autoComplete="off"
            maxLength={80}
          />
        )}
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">O que você quer?</p>
        <Segmented
          label="Tipo de hábito"
          value={habitType}
          onChange={(v) => {
            setHabitType(v);
            if (v === "avoid") setTracking("checkbox");
            clear("target_value");
          }}
          options={[
            { value: "build", label: "Fazer", description: "Algo que preciso cumprir" },
            { value: "avoid", label: "Evitar", description: "Algo que quero não fazer" },
          ]}
        />
      </div>

      {habitType === "build" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Como medir</p>
          <Segmented
            label="Como medir"
            value={tracking}
            onChange={(v) => {
              setTracking(v);
              setTarget("");
              clear("target_value");
            }}
            options={[
              { value: "checkbox", label: "Marcar" },
              { value: "quantity", label: "Quantidade" },
              { value: "time", label: "Tempo" },
            ]}
          />
        </div>
      ) : null}

      {measured ? (
        <Field
          id="habit-target"
          label={`Meta diária (${unit === "ml" ? "ml" : "minutos"})`}
          required
          error={errors.target_value}
          hint={tracking === "quantity" ? "Ex: 3000 ml de água por dia" : "Ex: 60 minutos de estudo por dia"}
        >
          {(props) => (
            <div className="space-y-2.5">
              <div className="relative">
                <Input
                  {...props}
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value.replace(/[^\d.,]/g, ""));
                    clear("target_value");
                  }}
                  onBlur={() => validateField(values, "target_value")}
                  placeholder={tracking === "quantity" ? "3000" : "60"}
                  className="pr-14"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  {unit}
                </span>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Metas rápidas">
                {GOAL_CHIPS[tracking as "quantity" | "time"].map((n) => (
                  <Chip
                    key={n}
                    active={toNumber(target) === n}
                    onClick={() => {
                      setTarget(String(n));
                      clear("target_value");
                    }}
                  >
                    {n} {unit}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Field>
      ) : null}

      <div className="space-y-3">
        <Field id="habit-schedule" label="Frequência" required>
          {(props) => (
            <Select
              items={SCHEDULE_ITEMS}
              value={scheduleType}
              onValueChange={(v) => v && setScheduleType(v as ScheduleType)}
            >
              <SelectTrigger id={props.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        {scheduleType === "weekdays" ? (
          <div className="space-y-2">
            <WeekdayPicker
              value={weekdays}
              onChange={(days) => {
                setWeekdays(days);
                clear("schedule.weekdays");
              }}
              invalid={Boolean(errors["schedule.weekdays"])}
              describedBy={errors["schedule.weekdays"] ? "habit-weekdays-error" : undefined}
            />
            {errors["schedule.weekdays"] ? (
              <p id="habit-weekdays-error" role="alert" className="text-sm font-medium text-destructive">
                {errors["schedule.weekdays"]}
              </p>
            ) : null}
          </div>
        ) : null}

        {scheduleType === "x_per_week" ? (
          <Field
            id="habit-times"
            label="Quantas vezes por semana"
            error={errors["schedule.frequency_target"]}
            hint="Você escolhe em quais dias fazer; a meta é a semana."
          >
            {() => (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Vezes por semana">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Chip
                    key={n}
                    active={toNumber(timesPerWeek) === n}
                    onClick={() => {
                      setTimesPerWeek(String(n));
                      clear("schedule.frequency_target");
                    }}
                  >
                    {n}x
                  </Chip>
                ))}
              </div>
            )}
          </Field>
        ) : null}

        {scheduleType === "interval" ? (
          <Field id="habit-interval" label="A cada quantos dias" required error={errors["schedule.interval_days"]}>
            {(props) => (
              <div className="space-y-2.5">
                <Input
                  {...props}
                  inputMode="numeric"
                  value={intervalDays}
                  onChange={(e) => {
                    setIntervalDays(e.target.value.replace(/\D/g, ""));
                    clear("schedule.interval_days");
                  }}
                  onBlur={() => validateField(values, "schedule.interval_days")}
                  placeholder="2"
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Intervalos rápidos">
                  {[2, 3, 7, 14, 30].map((n) => (
                    <Chip
                      key={n}
                      active={toNumber(intervalDays) === n}
                      onClick={() => {
                        setIntervalDays(String(n));
                        clear("schedule.interval_days");
                      }}
                    >
                      {n} dias
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </Field>
        ) : null}

        {scheduleType === "specific_date" ? (
          <Field id="habit-date" label="Data" required error={errors["schedule.specific_date"]}>
            {(props) => (
              <div className="space-y-2.5">
                <Input
                  {...props}
                  type="date"
                  value={specificDate}
                  min={today}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    clear("schedule.specific_date");
                  }}
                />
                <div className="flex gap-2">
                  <Chip active={specificDate === today} onClick={() => setSpecificDate(today)}>
                    Hoje
                  </Chip>
                  <Chip
                    active={specificDate === addDaysISO(today, 1)}
                    onClick={() => setSpecificDate(addDaysISO(today, 1))}
                  >
                    Amanhã
                  </Chip>
                </div>
              </div>
            )}
          </Field>
        ) : null}

        <p aria-live="polite" className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Resumo: </span>
          {summary}
        </p>
      </div>

      <Field id="habit-pillar" label="Pilar" optionalHint>
        {(props) => (
          <Select
            items={pillarItems}
            value={pillarId}
            onValueChange={(v) => setPillarId(v ?? NO_PILLAR)}
          >
            <SelectTrigger id={props.id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pillarItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <details className="group rounded-2xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Mais opções
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-6 border-t border-border p-4">
          <Field id="habit-description" label="Descrição" optionalHint error={errors.description}>
            {(props) => (
              <Textarea
                {...props}
                value={description ?? ""}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clear("description");
                }}
                rows={2}
                maxLength={280}
              />
            )}
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ícone</p>
            <IconPicker value={icon} onChange={setIcon} color={color ?? pillar?.color ?? DEFAULT_ACCENT} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Cor</p>
            <div className="mb-2">
              <Chip active={color === null} onClick={() => setColor(null)}>
                Igual ao pilar
              </Chip>
            </div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </details>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : habit ? "Salvar alterações" : "Criar hábito"}
      </Button>
    </form>
  );
}
