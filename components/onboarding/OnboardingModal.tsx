"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Flame, ListChecks, Sparkles, TrendingUp } from "lucide-react";
import { completeOnboarding, skipOnboarding } from "@/lib/actions/onboarding";
import { LIFE_AREAS, type LifeArea } from "@/lib/constants/onboarding";
import { ICONS_BY_NAME, accentStyles, readableOn } from "@/lib/constants/appearance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EnableNotifications } from "@/components/notifications/EnableNotifications";

const STEPS = 4;

function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function OnboardingModal({ displayName }: { displayName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [habits, setHabits] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const selectedAreas = LIFE_AREAS.filter((a) => areas.includes(a.id));

  function toggleArea(id: string) {
    setAreas((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function toggleHabit(key: string) {
    setHabits((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function goToHabits() {
    // Mantém só hábitos de áreas ainda selecionadas e sugere 2 por área nova.
    const allowed = new Set(selectedAreas.flatMap((a) => a.habits.map((h) => h.key)));
    const kept = habits.filter((k) => allowed.has(k));
    const suggested = selectedAreas.flatMap((area) =>
      area.habits.some((h) => kept.includes(h.key))
        ? []
        : area.habits.slice(0, 2).map((h) => h.key),
    );
    setHabits([...kept, ...suggested]);
    setStep(2);
  }

  function finish() {
    startTransition(async () => {
      try {
        await completeOnboarding({ areas, habits, timezone: deviceTimezone() });
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Não foi possível concluir. Tente novamente.");
      }
    });
  }

  function skip() {
    startTransition(async () => {
      try {
        await skipOnboarding(deviceTimezone());
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Não foi possível pular. Tente novamente.");
      }
    });
  }

  const firstName = displayName?.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={() => undefined /* só fecha por Pular/Começar */}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-1.5" aria-label={`Etapa ${step + 1} de ${STEPS}`}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted-foreground/25",
                )}
              />
            ))}
          </div>
          {step < STEPS - 1 ? (
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Pular por enquanto
            </button>
          ) : null}
        </div>

        <div key={step} className="animate-sheet px-5 pb-2 pt-6">
          {step === 0 ? <Welcome firstName={firstName} /> : null}
          {step === 1 ? <AreasStep selected={areas} onToggle={toggleArea} /> : null}
          {step === 2 ? (
            <HabitsStep areas={selectedAreas} selected={habits} onToggle={toggleHabit} />
          ) : null}
          {step === 3 ? (
            <DoneStep areaCount={selectedAreas.length} habitCount={habits.length} />
          ) : null}
        </div>

        <div className="flex items-center gap-2 px-5 pb-5 pt-4">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStep(step - 1)}
              disabled={pending}
            >
              <ArrowLeft aria-hidden />
              Voltar
            </Button>
          ) : null}

          {step === 0 ? (
            <Button size="lg" className="flex-1" onClick={() => setStep(1)}>
              Vamos começar
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
          {step === 1 ? (
            <Button
              size="lg"
              className="flex-1"
              onClick={goToHabits}
              disabled={areas.length === 0}
            >
              Continuar
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
          {step === 2 ? (
            <Button size="lg" className="flex-1" onClick={() => setStep(3)}>
              {habits.length === 0 ? "Criar depois" : `Continuar (${habits.length})`}
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
          {step === 3 ? (
            <Button size="lg" className="flex-1" onClick={finish} disabled={pending}>
              {pending ? "Preparando seu painel..." : "Ir para o Hoje"}
              {!pending ? <Check aria-hidden /> : null}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Welcome({ firstName }: { firstName?: string }) {
  const items = [
    { icon: ListChecks, title: "Um toque para registrar", text: "Marque hábitos e tarefas do dia em segundos." },
    { icon: Flame, title: "Consistência, não perfeição", text: "Dias sem hábito programado nunca quebram sua sequência." },
    { icon: TrendingUp, title: "Veja sua evolução", text: "Semana, mês e histórico completos de cada hábito." },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <IconBadge
          icon={Sparkles}
          size="xl"
          tone="solid"
          className="animate-check mx-auto bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30"
        />
        <DialogTitle className="text-2xl font-semibold tracking-tight">
          {firstName ? `Bem-vindo, ${firstName}!` : "Bem-vindo ao Routine!"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Vamos montar seu painel em menos de um minuto.
        </DialogDescription>
      </div>
      <ul className="space-y-3">
        {items.map(({ icon: Icon, title, text }, i) => (
          <li
            key={title}
            style={{ animationDelay: `${120 + i * 90}ms` }}
            className={cn(surfaceVariants({ padding: "row" }), "animate-rise flex items-center gap-3")}
          >
            <IconBadge icon={Icon} />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreasStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <DialogTitle className="text-xl font-semibold tracking-tight">
          Quais áreas da sua vida você quer melhorar?
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Escolha quantas quiser. Cada uma vira um pilar.
        </DialogDescription>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {LIFE_AREAS.map((area, i) => (
          <AreaCard
            key={area.id}
            area={area}
            index={i}
            active={selected.includes(area.id)}
            onClick={() => onToggle(area.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AreaCard({
  area,
  active,
  index,
  onClick,
}: {
  area: LifeArea;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  const Icon = ICONS_BY_NAME[area.icon] ?? Sparkles;
  // Quando ativo, anel e fundo usam a cor da própria área.
  const style = {
    animationDelay: `${index * 50}ms`,
    ...(active ? { backgroundColor: `${area.color}14`, "--tw-ring-color": `color-mix(in oklab, ${area.color} 50%, var(--foreground))` } : {}),
  } as React.CSSProperties;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={cn(
        "animate-rise relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-[transform,border-color,background-color] duration-200 active:scale-[0.97]",
        active ? "border-transparent ring-2" : "border-border bg-card hover:bg-accent",
      )}
    >
      <IconBadge icon={Icon} accent={area.color} />
      <span>
        <span className="block font-medium leading-tight">{area.name}</span>
        <span className="block text-xs text-muted-foreground">{area.tagline}</span>
      </span>
      {active ? (
        <span
          className="animate-check absolute right-3 top-3 flex size-6 items-center justify-center rounded-full"
          style={{ backgroundColor: area.color, color: readableOn(area.color) }}
        >
          <Check className="size-4" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function HabitsStep({
  areas,
  selected,
  onToggle,
}: {
  areas: LifeArea[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <DialogTitle className="text-xl font-semibold tracking-tight">
          Vamos criar seus primeiros hábitos
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Sugerimos alguns. Você pode editar tudo depois.
        </DialogDescription>
      </div>
      <div className="space-y-5">
        {areas.map((area) => {
          const Icon = ICONS_BY_NAME[area.icon] ?? Sparkles;
          return (
            <section key={area.id} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold" style={accentStyles(area.color).text}>
                <Icon className="size-4" />
                {area.name}
              </h3>
              <div className="space-y-2">
                {area.habits.map((habit, i) => {
                  const active = selected.includes(habit.key);
                  return (
                    <button
                      key={habit.key}
                      type="button"
                      onClick={() => onToggle(habit.key)}
                      aria-pressed={active}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={cn(
                        "animate-rise flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[transform,border-color,background-color] duration-200 active:scale-[0.98]",
                        active ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
                          active
                            ? "animate-check border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {active ? <Check className="size-4" aria-hidden /> : null}
                      </span>
                      <span className="flex-1">
                        <span className="block font-medium leading-tight">{habit.name}</span>
                        <span className="block text-xs text-muted-foreground">{habit.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DoneStep({ areaCount, habitCount }: { areaCount: number; habitCount: number }) {
  return (
    <div className="space-y-5">
      <div className="space-y-3 text-center">
        <IconBadge
          icon={Check}
          size="xl"
          shape="circle"
          tone="solid"
          strokeWidth={3}
          className="animate-check mx-auto bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
        />
        <DialogTitle className="text-2xl font-semibold tracking-tight">Tudo pronto!</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {habitCount > 0
            ? `Criamos ${areaCount} ${areaCount === 1 ? "pilar" : "pilares"} e ${habitCount} ${habitCount === 1 ? "hábito" : "hábitos"} para você começar hoje.`
            : "Seu painel está vazio por enquanto. Use o botão + para criar hábitos e tarefas quando quiser."}
        </DialogDescription>
      </div>
      <EnableNotifications variant="onboarding" />
    </div>
  );
}
