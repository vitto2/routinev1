import { PauseCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import type { PausedHabit } from "@/lib/scheduling/pause";
import { cn } from "@/lib/utils";
import { ResumeButton } from "@/components/pause/ResumeButton";
import { IconBadge } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";

/** Faixa do Hoje enquanto houver hábitos em pausa. */
export function PauseBanner({ paused, total }: { paused: PausedHabit[]; total: number }) {
  const returns = [...new Set(paused.map((h) => h.resumesOn).filter(Boolean))].sort() as string[];
  const all = paused.length === total;

  return (
    <div
      data-ui="pause-banner"
      className={cn(
        surfaceVariants({ tone: "warning", padding: "row" }),
        "animate-rise flex min-h-16 items-center gap-3",
      )}
    >
      <IconBadge icon={PauseCircle} tone="warning" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold leading-snug">{all ? "Modo pausa" : "Hábitos em pausa"}</p>
        <p className="text-foreground/80">
          {all
            ? "Seus hábitos não contam nesses dias."
            : `${paused.length} ${paused.length === 1 ? "hábito" : "hábitos"} em pausa.`}{" "}
          {returns.length > 0
            ? `Volta em ${formatDisplayDate(returns[0])}.`
            : "Sem data de retorno."}
        </p>
      </div>
      <ResumeButton habitIds={null} label="Retomar" variant="outline" />
    </div>
  );
}
