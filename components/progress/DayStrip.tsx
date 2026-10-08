import { formatDisplayDate } from "@/lib/dates";
import type { StripCell, StripState } from "@/lib/progress/period";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<StripState, string> = {
  done: "feito",
  partial: "parcial (abaixo da meta)",
  missed: "não feito",
  open: "em aberto",
  pending: "ainda hoje",
  off: "sem programação",
};

/**
 * Uma célula por dia. O estado é dado pela FORMA (cheio, vazado, tracejado,
 * ponto) e não só pela cor; a legenda fica na seção e o resumo vai em aria-label.
 */
function Cell({ cell }: { cell: StripCell }) {
  const title = `${formatDisplayDate(cell.date)}: ${STATE_LABEL[cell.state]}`;

  if (cell.state === "off") {
    return (
      <span title={title} className="flex h-6 min-w-0 flex-1 items-center justify-center">
        <span className="size-1 rounded-full bg-muted-foreground/60" />
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn(
        "h-6 min-w-0 flex-1 rounded-[3px]",
        cell.state === "done" && "bg-primary",
        cell.state === "partial" &&
          "border-2 border-primary bg-[linear-gradient(to_top,var(--primary)_50%,transparent_50%)]",
        cell.state === "missed" && "border-2 border-destructive bg-destructive/10",
        cell.state === "open" && "border border-dashed border-muted-foreground/70",
        cell.state === "pending" && "border-2 border-dashed border-primary",
      )}
    />
  );
}

export function DayStrip({ cells, label }: { cells: StripCell[]; label: string }) {
  const count = (state: StripState) => cells.filter((c) => c.state === state).length;
  const partial = count("partial");
  const summary = `${label}: ${count("done")} feitos, ${count("missed")} não feitos${partial > 0 ? `, ${partial} parciais` : ""}, ${count("off")} sem programação`;

  return (
    <div role="img" aria-label={summary} className="flex items-center gap-px">
      {cells.map((cell) => (
        <Cell key={cell.date} cell={cell} />
      ))}
    </div>
  );
}

/** Legenda única, mostrada uma vez acima da lista de hábitos. */
export function DayStripLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-[3px] bg-primary" aria-hidden /> feito
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-[3px] border-2 border-primary bg-[linear-gradient(to_top,var(--primary)_50%,transparent_50%)]"
          aria-hidden
        />{" "}
        parcial
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-[3px] border-2 border-destructive bg-destructive/10"
          aria-hidden
        />{" "}
        não feito
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-3 w-3 rounded-[3px] border border-dashed border-muted-foreground/70"
          aria-hidden
        />{" "}
        em aberto
      </li>
      <li className="flex items-center gap-1.5">
        <span className="flex h-3 w-3 items-center justify-center" aria-hidden>
          <span className="size-1 rounded-full bg-muted-foreground/60" />
        </span>{" "}
        sem programação
      </li>
    </ul>
  );
}
