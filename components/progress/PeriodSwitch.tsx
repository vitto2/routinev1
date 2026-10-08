import Link from "next/link";
import { cn } from "@/lib/utils";

export const PERIODS = [7, 30, 60] as const;
export type PeriodDays = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: PeriodDays = 30;

export function parsePeriod(value: string | undefined): PeriodDays {
  const n = Number(value);
  return (PERIODS as readonly number[]).includes(n) ? (n as PeriodDays) : DEFAULT_PERIOD;
}

/** Seletor do período do resumo (links: a página é renderizada no servidor). */
export function PeriodSwitch({ active }: { active: PeriodDays }) {
  return (
    <nav
      aria-label="Período do resumo"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted p-1"
    >
      {PERIODS.map((days) => {
        const isActive = days === active;
        return (
          <Link
            key={days}
            href={days === DEFAULT_PERIOD ? "/progress" : `/progress?p=${days}`}
            aria-current={isActive ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] duration-200",
              isActive
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {days} dias
          </Link>
        );
      })}
    </nav>
  );
}
