"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, PauseCircle } from "lucide-react";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import { focusFirstInvalid, useFormErrors } from "@/lib/forms";
import { habitSchema, type ScheduleInput } from "@/lib/validation/habit";
import { addDaysISO } from "@/lib/dates";
import { describeSchedule } from "@/lib/scheduling/summary";
import { ICONS_BY_NAME, accentStyles, DEFAULT_ACCENT } from "@/lib/constants/appearance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/form-field";
import { IconBadge } from "@/components/ui/icon-badge";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { surfaceVariants } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekdayPicker } from "@/components/habits/WeekdayPicker";
import { IconPicker, ColorPicker } from "@/components/pillars/IconColorPicker";
import type { HabitWithSchedules, Pillar, Routine } from "@/types/domain";

const NO_PILLAR = "none";
const NO_ROUTINE = "none";
const CHALLENGE_OPTIONS = [21, 30, 66, 90];

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

export function HabitForm({
  habit,
  pillars,
  today,
  frequencyLocked = false,
  schemaV2 = false,
  routines = [],
}: {
  habit?: HabitWithSchedules;
  pillars: Pillar[];
  today: string;
  /** migration 0004 aplicada: libera lembrete, rotina e desafio */
  schemaV2?: boolean;
  routines?: Routine[];
  /** hábito pausado por tempo indeterminado: a frequência só muda depois de retomar */
  frequencyLocked?: boolean;
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
  const [reminderTime, setReminderTime] = useState(habit?.reminder_time?.slice(0, 5) ?? "");
  const [routineId, setRoutineId] = useState(habit?.routine_id ?? NO_ROUTINE);
  const [challengeDays, setChallengeDays] = useState<number | null>(habit?.challenge_days ?? null);
  const [challengeStart, setChallengeStart] = useState(habit?.challenge_start_date ?? today);

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
    ...(schemaV2
      ? {
          reminder_time: reminderTime || null,
          routine_id: routineId === NO_ROUTINE ? null : routineId,
          challenge_days: challengeDays,
          challenge_start_date: challengeDays ? challengeStart || today : null,
        }
      : {}),
  };

  const pillar = pillars.find((p) => p.id === pillarId);
  const accent = accentStyles(color ?? pillar?.color);
  const iconName = icon ?? pillar?.icon ?? null;
  const PreviewIcon = (iconName && ICONS_BY_NAME[iconName]) || null;

  const routineItems = [
    { value: NO_ROUTINE, label: "Sem rotina" },
    ...routines.map((r) => ({ value: r.id, label: r.name })),
  ];

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
        data-ui="habit-preview"
        className={cn(surfaceVariants(), "flex items-center gap-3 transition-colors duration-300")}
        style={accent.soft}
        aria-hidden
      >
        <IconBadge icon={PreviewIcon ?? undefined} size="lg" accent={color ?? pillar?.color ?? null} />
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

      <div className={cn("space-y-3", frequencyLocked && "opacity-60")}>
        {frequencyLocked ? (
          <Notice icon={PauseCircle} tone="warning" badge="warning">
            <p>Este hábito está em pausa por tempo indeterminado. Retome-o para alterar a frequência.</p>
          </Notice>
        ) : null}
        <fieldset disabled={frequencyLocked} className="space-y-3 border-0 p-0">
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

        <p aria-live="polite" className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Resumo: </span>
          {summary}
        </p>
        </fieldset>
      </div>

      {schemaV2 ? (
        <Field
          id="habit-reminder"
          label="Lembrete"
          optionalHint
          error={errors.reminder_time}
          hint="Avisamos nesse horário se o hábito ainda não foi feito (ative as notificações no Perfil)."
        >
          {(props) => (
            <div className="flex items-center gap-2">
              <Input
                {...props}
                type="time"
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  clear("reminder_time");
                }}
              />
              {reminderTime ? (
                <Button type="button" variant="ghost" onClick={() => setReminderTime("")}>
                  Limpar
                </Button>
              ) : null}
            </div>
          )}
        </Field>
      ) : null}

      {schemaV2 && routines.length > 0 ? (
        <Field id="habit-routine" label="Rotina" optionalHint>
          {(props) => (
            <Select
              items={routineItems}
              value={routineId}
              onValueChange={(v) => setRoutineId(v ?? NO_ROUTINE)}
            >
              <SelectTrigger id={props.id}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {routineItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      ) : schemaV2 ? (
        <p className="text-sm text-muted-foreground">
          Quer agrupar hábitos em blocos como manhã e noite?{" "}
          <Link href="/routines" className="font-medium text-primary underline underline-offset-4">
            Criar rotinas
          </Link>
        </p>
      ) : null}

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

      <details className={cn(surfaceVariants({ padding: "none" }), "group")}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Mais opções
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
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
          {schemaV2 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Desafio</p>
              <p className="text-xs text-muted-foreground">
                Um período fechado para criar o hábito, com contagem de dias e resumo no fim.
              </p>
              <div role="group" aria-label="Duração do desafio" className="flex flex-wrap gap-2">
                <Chip active={challengeDays === null} onClick={() => setChallengeDays(null)}>
                  Sem desafio
                </Chip>
                {CHALLENGE_OPTIONS.map((n) => (
                  <Chip
                    key={n}
                    active={challengeDays === n}
                    onClick={() => {
                      setChallengeDays(n);
                      clear("challenge_days");
                    }}
                  >
                    {n} dias
                  </Chip>
                ))}
              </div>
              {challengeDays ? (
                <Field
                  id="habit-challenge-start"
                  label="Começa em"
                  error={errors.challenge_start_date}
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={challengeStart}
                      onChange={(e) => {
                        setChallengeStart(e.target.value);
                        clear("challenge_start_date");
                      }}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : habit ? "Salvar alterações" : "Criar hábito"}
      </Button>
    </form>
  );
}
