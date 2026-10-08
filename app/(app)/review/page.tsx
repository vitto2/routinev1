import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Lightbulb,
  Sparkles,
  Trophy,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pointsLabel } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import {
  WEEKDAY_NAMES,
  addDaysISO,
  compareISO,
  formatDisplayDate,
  todayISO,
  weekRangeOf,
  weekdayOf,
} from "@/lib/dates";
import { buildWeeklyReview, describeWeek, type SuggestionKind } from "@/lib/progress/review";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScoreCard } from "@/components/progress/ScoreCard";
import { cn } from "@/lib/utils";

const MAX_WEEKS_BACK = 52;
const pct = (value: number) => `${Math.round(value * 100)}%`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const SUGGESTION_STYLE: Record<
  SuggestionKind,
  { icon: typeof Sparkles; box: string; iconClass: string }
> = {
  praise: { icon: Sparkles, box: "border-success/30 bg-success/10", iconClass: "text-success" },
  tip: { icon: Lightbulb, box: "border-warning/30 bg-warning/10", iconClass: "text-warning" },
  info: { icon: Info, box: "border-border bg-card", iconClass: "text-muted-foreground" },
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const currentWeek = weekRangeOf(today).start;
  const oldestWeek = addDaysISO(currentWeek, -7 * MAX_WEEKS_BACK);

  // Formato e data real (descarta "2026-13-45"): senão volta para a semana atual.
  if (w !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(w) || addDaysISO(w, 0) !== w)) {
    redirect("/review");
  }
  const requested = w ? weekRangeOf(w).start : currentWeek;
  if (compareISO(requested, currentWeek) > 0) redirect("/review");
  if (compareISO(requested, oldestWeek) < 0) redirect(`/review?w=${oldestWeek}`);
  const weekStart = requested;

  const weekEnd = addDaysISO(weekStart, 6);
  const readTo = compareISO(weekEnd, today) > 0 ? today : weekEnd;

  const [habits, logs] = await Promise.all([
    getHabitsWithSchedules(supabase),
    // 3 semanas (para a sugestão de hábito difícil) + a semana anterior à primeira
    getLogsForRange(supabase, addDaysISO(weekStart, -14), readTo),
  ]);

  const review = buildWeeklyReview(habits, logs, weekStart, today);
  const isCurrent = weekStart === currentWeek;
  const previousWeek = addDaysISO(weekStart, -7);
  const nextWeek = addDaysISO(weekStart, 7);
  const hasPrevious = compareISO(previousWeek, oldestWeek) >= 0;

  const navClass =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors hover:bg-accent";
  const navOff =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground/50";

  const dayName = (date: string) => capitalize(WEEKDAY_NAMES[weekdayOf(date)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Revisão da semana" backHref="/progress" />

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link href={`/review?w=${previousWeek}`} className={navClass} aria-label="Semana anterior">
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <span className={navOff} aria-hidden>
            <ChevronLeft className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="font-bold">{describeWeek(review)}</p>
          <p className="text-xs text-muted-foreground">
            {review.ended ? "Semana encerrada" : "Semana em andamento"}
          </p>
        </div>
        {!isCurrent ? (
          <Link href={`/review?w=${nextWeek}`} className={navClass} aria-label="Próxima semana">
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className={navOff} aria-hidden>
            <ChevronRight className="size-5" />
          </span>
        )}
      </div>

      <div className="space-y-2">
        <ScoreCard
          percent={review.score.percent}
          label={
            review.score.percent === null
              ? "Nenhum hábito de dia fixo nesta semana"
              : `${review.score.completed} de ${review.score.scheduled} hábitos concluídos`
          }
        />
        {review.deltaPoints !== null ? (
          <p className="text-center text-sm text-muted-foreground">
            {review.deltaPoints === 0
              ? "Igual à semana anterior"
              : `${pointsLabel(review.deltaPoints)} em relação à semana anterior (${review.previous.percent !== null ? pct(review.previous.percent) : "—"})`}
          </p>
        ) : null}
      </div>

      {review.suggestions.length > 0 ? (
        <section className="space-y-2" aria-label="Sugestões">
          {review.suggestions.map((s, i) => {
            const style = SUGGESTION_STYLE[s.kind];
            const Icon = style.icon;
            return (
              <p
                key={i}
                style={{ animationDelay: `${i * 60}ms` }}
                className={cn(
                  "animate-rise flex items-start gap-3 rounded-2xl border p-4 text-sm",
                  style.box,
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", style.iconClass)} aria-hidden />
                <span>{s.text}</span>
              </p>
            );
          })}
        </section>
      ) : null}

      {review.bestDay || review.perfectDays > 0 ? (
        <section className="grid grid-cols-3 gap-2">
          <Tile
            icon={<Trophy className="size-4 text-warning" aria-hidden />}
            label="Melhor dia"
            value={review.bestDay ? dayName(review.bestDay.date) : "—"}
            sub={review.bestDay ? pct(review.bestDay.percent) : undefined}
          />
          <Tile
            icon={<TrendingDown className="size-4 text-muted-foreground" aria-hidden />}
            label="Dia mais difícil"
            value={review.worstDay ? dayName(review.worstDay.date) : "—"}
            sub={review.worstDay ? pct(review.worstDay.percent) : undefined}
          />
          <Tile
            icon={<CalendarCheck className="size-4 text-success" aria-hidden />}
            label="Dias com 100%"
            value={String(review.perfectDays)}
          />
        </section>
      ) : null}

      {review.habits.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Por hábito
          </h2>
          <ul className="space-y-2">
            {review.habits.map((h) => (
              <li
                key={h.habitId}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{h.name}</span>
                  <span className="font-bold tabular-nums">{pct(h.percent)}</span>
                </div>
                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`${h.name}: ${h.completed} de ${h.scheduled}`}
                  aria-valuenow={Math.round(h.percent * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(h.percent * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {h.completed} de {h.scheduled}
                  {review.strongest?.habitId === h.habitId && review.habits.length > 1
                    ? " · mais constante"
                    : ""}
                  {review.weakest?.habitId === h.habitId ? " · mais difícil" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Esqueceu de marcar algo? Abra o dia pela{" "}
        <Link href="/week" className="font-medium text-primary underline underline-offset-4">
          semana
        </Link>{" "}
        e corrija: {formatDisplayDate(weekStart)} em diante.
      </p>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
      {sub ? <p className="text-xs tabular-nums text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
