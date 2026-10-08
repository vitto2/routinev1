import { Flame } from "lucide-react";
import type { StreakUnit } from "@/lib/gamification";

/** Sequência atual: ícone + número + unidade por extenso (nunca só cor ou só ícone). */
export function StreakBadge({
  current,
  unit,
  capped = false,
}: {
  current: number;
  unit: StreakUnit;
  /** a janela de cálculo acabou antes de a sequência terminar ("90+") */
  capped?: boolean;
}) {
  if (current <= 0) return null;

  const word =
    unit === "weeks"
      ? current === 1 ? "semana" : "semanas"
      : current === 1 ? "dia" : "dias";

  return (
    <span className="inline-flex items-center gap-1 font-medium text-foreground">
      <Flame className="size-3.5 text-warning" aria-hidden />
      {current}
      {capped ? "+" : ""} {word}
      <span className="sr-only">
        {unit === "weeks"
          ? current === 1 ? " seguida" : " seguidas"
          : current === 1 ? " seguido" : " seguidos"}
      </span>
    </span>
  );
}
