import { CalendarClock, PartyPopper, Trophy } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import { pluralize } from "@/lib/format";
import { CHALLENGE_SUCCESS_THRESHOLD, type ChallengeInfo } from "@/lib/challenges";
import { cn } from "@/lib/utils";
import { ChallengeActions } from "@/components/progress/ChallengeActions";
import { CardHeading, HeadingValue } from "@/components/ui/panel";
import { surfaceVariants } from "@/components/ui/surface";

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
  const won = finished && info.successful;
  const Icon = won ? PartyPopper : info.status === "upcoming" ? CalendarClock : Trophy;

  return (
    <article
      data-ui="challenge-card"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      aria-label={`Desafio: ${name}`}
      className={cn(surfaceVariants({ tone: won ? "success" : "card" }), "animate-rise space-y-3")}
    >
      <CardHeading
        as="h3"
        align="center"
        icon={Icon}
        title={name}
        description={
          info.status === "upcoming"
            ? `Começa em ${formatDisplayDate(info.startDate)} (${info.totalDays} dias)`
            : finished
              ? info.successful
                ? "Desafio concluído. Parabéns!"
                : "Desafio encerrado"
              : `Dia ${info.dayNumber} de ${info.totalDays} · ${pluralize(info.daysLeft, "dia restante", "dias restantes")}`
        }
        aside={info.percent !== null ? <HeadingValue>{pct(info.percent)}%</HeadingValue> : undefined}
      />

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Tempo do desafio: ${name}`}
        aria-valuenow={Math.round(elapsed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            won ? "bg-success" : "bg-primary",
          )}
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
