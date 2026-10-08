import { CalendarClock, PartyPopper, Trophy } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { pluralize } from "@/lib/format";
import { CHALLENGE_SUCCESS_THRESHOLD, type ChallengeInfo } from "@/lib/challenges";
import { ChallengeActions } from "@/components/progress/ChallengeActions";

const pct = (value: number) => Math.round(value * 100);

/** Progresso de um desafio de 21/30/66/90 dias, com o desfecho quando termina. */
export function ChallengeCard({
  habitId,
  name,
  info,
  index = 0,
}: {
  habitId: string;
  name: string;
  info: ChallengeInfo;
  index?: number;
}) {
  const elapsed = info.status === "upcoming" ? 0 : (info.dayNumber / info.totalDays) * 100;
  const finished = info.status === "finished";

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      aria-label={`Desafio: ${name}`}
      className={
        finished && info.successful
          ? "animate-rise space-y-3 rounded-2xl border border-success/40 bg-success/10 p-4 shadow-sm"
          : "animate-rise space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {finished && info.successful ? (
            <PartyPopper className="size-5" aria-hidden />
          ) : info.status === "upcoming" ? (
            <CalendarClock className="size-5" aria-hidden />
          ) : (
            <Trophy className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {info.status === "upcoming"
              ? `Começa em ${formatDisplayDate(info.startDate)} (${info.totalDays} dias)`
              : finished
                ? info.successful
                  ? "Desafio concluído. Parabéns!"
                  : "Desafio encerrado"
                : `Dia ${info.dayNumber} de ${info.totalDays} · ${pluralize(info.daysLeft, "dia restante", "dias restantes")}`}
          </p>
        </div>
        {info.percent !== null ? (
          <p className="text-xl font-bold tabular-nums">{pct(info.percent)}%</p>
        ) : null}
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Tempo do desafio: ${name}`}
        aria-valuenow={Math.round(elapsed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={
            finished && info.successful
              ? "h-full rounded-full bg-success transition-[width] duration-500"
              : "h-full rounded-full bg-primary transition-[width] duration-500"
          }
          style={{ width: `${elapsed}%` }}
        />
      </div>

      {info.status !== "upcoming" ? (
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{info.completedDays}</span> de{" "}
          <span className="tabular-nums">{info.scheduledDays}</span>{" "}
          {info.scheduledDays === 1 ? "dia feito" : "dias feitos"} até agora
          {finished && !info.successful && info.percent !== null
            ? `. A meta de sucesso é ${pct(CHALLENGE_SUCCESS_THRESHOLD)}%: dá para tentar de novo.`
            : "."}
        </p>
      ) : null}

      <ChallengeActions habitId={habitId} finished={finished} />
    </article>
  );
}
