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
  type LucideIcon,
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
import type { IconBadgeTone } from "@/components/ui/icon-badge";
import { IconLink, IconLinkOff } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { SectionTitle } from "@/components/ui/section-title";
import { StatTile } from "@/components/ui/stat-tile";
import { surfaceVariants } from "@/components/ui/surface";

const MAX_WEEKS_BACK = 52;
const pct = (value: number) => `${Math.round(value * 100)}%`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const SUGGESTION_STYLE: Record<
  SuggestionKind,
  { icon: LucideIcon; tone: "success" | "warning" | "card"; badge: IconBadgeTone }
> = {
  praise: { icon: Sparkles, tone: "success", badge: "success" },
  tip: { icon: Lightbulb, tone: "warning", badge: "warning" },
  info: { icon: Info, tone: "card", badge: "muted" },
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

  const dayName = (date: string) => capitalize(WEEKDAY_NAMES[weekdayOf(date)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Revisão da semana" backHref="/progress" />

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <IconLink href={`/review?w=${previousWeek}`} icon={ChevronLeft} label="Semana anterior" />
        ) : (
          <IconLinkOff icon={ChevronLeft} />
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="font-bold">{describeWeek(review)}</p>
          <p className="text-xs text-muted-foreground">
            {review.ended ? "Semana encerrada" : "Semana em andamento"}
          </p>
        </div>
        {!isCurrent ? (
          <IconLink href={`/review?w=${nextWeek}`} icon={ChevronRight} label="Próxima semana" />
        ) : (
          <IconLinkOff icon={ChevronRight} />
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
            return (
              <Notice
                key={i}
                icon={style.icon}
                tone={style.tone}
                badge={style.badge}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-rise"
              >
                <p>{s.text}</p>
              </Notice>
            );
          })}
        </section>
      ) : null}

      {review.bestDay || review.perfectDays > 0 ? (
        <section className="grid grid-cols-3 gap-2">
          <StatTile
            icon={Trophy}
            iconClassName="text-warning"
            size="sm"
            label="Melhor dia"
            value={review.bestDay ? dayName(review.bestDay.date) : "—"}
            sub={review.bestDay ? pct(review.bestDay.percent) : undefined}
          />
          <StatTile
            icon={TrendingDown}
            iconClassName="text-muted-foreground"
            size="sm"
            label="Dia mais difícil"
            value={review.worstDay ? dayName(review.worstDay.date) : "—"}
            sub={review.worstDay ? pct(review.worstDay.percent) : undefined}
          />
          <StatTile
            icon={CalendarCheck}
            iconClassName="text-success"
            size="sm"
            label="Dias com 100%"
            value={String(review.perfectDays)}
          />
        </section>
      ) : null}

      {review.habits.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle>Por hábito</SectionTitle>
          <ul className="space-y-2">
            {review.habits.map((h) => (
              <li key={h.habitId} className={surfaceVariants()}>
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
