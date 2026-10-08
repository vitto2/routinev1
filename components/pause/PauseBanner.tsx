import { PauseCircle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";
import type { PausedHabit } from "@/lib/scheduling/pause";
import { ResumeButton } from "@/components/pause/ResumeButton";

/** Faixa do Hoje enquanto houver hábitos em pausa. */
export function PauseBanner({ paused, total }: { paused: PausedHabit[]; total: number }) {
  const returns = [...new Set(paused.map((h) => h.resumesOn).filter(Boolean))].sort() as string[];
  const all = paused.length === total;

  return (
    <div className="animate-rise flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
      <PauseCircle className="size-6 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{all ? "Modo pausa" : "Hábitos em pausa"}</p>
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
