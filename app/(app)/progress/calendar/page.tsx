import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getHabitsWithSchedules } from "@/lib/data/habits";
import { getLogsForRange } from "@/lib/data/logs";
import {
  addMonths,
  compareISO,
  isValidMonth,
  monthEnd,
  monthLabel,
  monthOf,
  monthStart,
  todayISO,
} from "@/lib/dates";
import { buildMonthGrid } from "@/lib/progress/calendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthCalendar } from "@/components/progress/MonthCalendar";
import { buttonVariants } from "@/components/ui/button";
import { IconLink, IconLinkOff } from "@/components/ui/icon-button";
import { StatTile } from "@/components/ui/stat-tile";

const MAX_MONTHS_BACK = 24;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const { user } = await requireUser();
  const supabase = await createClient();
  const profile = await getOrCreateProfile(supabase, user.id);
  const today = todayISO(profile.timezone);

  const currentMonth = monthOf(today);
  const oldestMonth = addMonths(currentMonth, -MAX_MONTHS_BACK);

  if (m !== undefined && !isValidMonth(m)) redirect("/progress/calendar");
  const month = m ?? currentMonth;
  // "AAAA-MM" ordena como texto; mês futuro volta para o atual.
  if (month > currentMonth) redirect("/progress/calendar");
  if (month < oldestMonth) redirect(`/progress/calendar?m=${oldestMonth}`);

  const lastDay = compareISO(monthEnd(month), today) > 0 ? today : monthEnd(month);
  const [habits, logs] = await Promise.all([
    getHabitsWithSchedules(supabase),
    getLogsForRange(supabase, monthStart(month), lastDay),
  ]);

  const grid = buildMonthGrid(month, today, habits, logs);
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);
  const hasPrevious = previous >= oldestMonth;
  const hasNext = month < currentMonth;

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário" backHref="/progress" />

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <IconLink
            href={`/progress/calendar?m=${previous}`}
            icon={ChevronLeft}
            label={`Mês anterior, ${monthLabel(previous)}`}
          />
        ) : (
          <IconLinkOff icon={ChevronLeft} />
        )}
        <h2 className="flex-1 text-center text-lg font-bold" aria-live="polite">
          {capitalize(monthLabel(month))}
        </h2>
        {hasNext ? (
          <IconLink
            href={`/progress/calendar?m=${next}`}
            icon={ChevronRight}
            label={`Próximo mês, ${monthLabel(next)}`}
          />
        ) : (
          <IconLinkOff icon={ChevronRight} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Consistência"
          value={grid.month.percent !== null ? `${Math.round(grid.month.percent * 100)}%` : "—"}
        />
        <StatTile label="Dias com 100%" value={String(grid.perfectDays)} />
        <StatTile label="Dias com hábitos" value={String(grid.scoredDays)} />
      </div>

      <MonthCalendar month={month} grid={grid} />

      {month !== currentMonth ? (
        <Link
          href="/progress/calendar"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ir para o mês atual
        </Link>
      ) : null}
    </div>
  );
}
