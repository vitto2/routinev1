import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { SeriesPoint, Trend } from "@/lib/progress/series";
import { cn } from "@/lib/utils";

const pct = (value: number) => Math.round(value * 100);

function TrendNote({ trend, period }: { trend: Trend; period: "semana" | "mês" }) {
  const per = period === "semana" ? "por semana" : "por mês";
  const abs = Math.abs(trend.pointsPerPeriod);
  const pointsWord = abs === 1 ? "ponto" : "pontos";

  if (trend.direction === "unknown") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Minus className="size-3.5 shrink-0" aria-hidden />
        Dados insuficientes para uma tendência
      </p>
    );
  }
  if (trend.direction === "flat") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Minus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        Estável
      </p>
    );
  }
  if (trend.direction === "up") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <TrendingUp className="size-3.5 shrink-0 text-success" aria-hidden />
        Em alta: +{abs} {pointsWord} {per}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <TrendingDown className="size-3.5 shrink-0 text-warning" aria-hidden />
      Em queda: -{abs} {pointsWord} {per}
    </p>
  );
}

/**
 * Barras de consistência por período. Os rótulos de % ficam visíveis (a barra
 * nunca é o único canal) e há uma tabela equivalente para leitores de tela.
 */
export function BarChart({
  title,
  points,
  trend,
  period,
  footnote,
}: {
  title: string;
  points: SeriesPoint[];
  trend?: Trend;
  period: "semana" | "mês";
  /** texto abaixo do gráfico no lugar da legenda padrão (ex.: o melhor dia) */
  footnote?: string;
}) {
  const hasData = points.some((p) => p.percent !== null);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {trend ? <TrendNote trend={trend} period={period} /> : null}
      </div>

      {hasData ? (
        <>
          <div aria-hidden className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-5 h-28 border-t border-dashed border-border" />
            <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] h-px border-t border-dashed border-border/60" />
            <div className="relative flex h-[8.5rem] items-end gap-1.5">
              {points.map((p) => (
                <div
                  key={p.key}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  title={`${p.detail}: ${p.percent === null ? "sem hábitos programados" : `${pct(p.percent)}%`}`}
                >
                  <span className="text-xs font-semibold tabular-nums leading-none">
                    {p.percent === null ? "—" : `${pct(p.percent)}%`}
                  </span>
                  <div className="flex h-28 w-full items-end">
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-[height] duration-500 ease-out",
                        p.percent === null
                          ? "h-1 rounded-none bg-muted"
                          : p.partial
                            ? "border-2 border-b-0 border-primary bg-primary/15"
                            : "bg-primary",
                      )}
                      style={
                        p.percent === null
                          ? undefined
                          : { height: `${Math.max(pct(p.percent), 3)}%` }
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {points.map((p) => (
                <span
                  key={p.key}
                  className={cn(
                    "min-w-0 flex-1 truncate text-center text-xs text-muted-foreground",
                    p.partial && "font-semibold text-foreground",
                  )}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
          {points.some((p) => p.partial) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Barra vazada: {period} em andamento (fora da tendência).
            </p>
          ) : null}
          {footnote ? <p className="mt-3 text-sm text-foreground">{footnote}</p> : null}

          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col">Concluídos</th>
                <th scope="col">Programados</th>
                <th scope="col">Consistência</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <th scope="row">
                    {p.detail}
                    {p.partial ? " (em andamento)" : ""}
                  </th>
                  <td>{p.completed}</td>
                  <td>{p.scheduled}</td>
                  <td>{p.percent === null ? "sem hábitos programados" : `${pct(p.percent)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Os gráficos aparecem assim que você registrar seus primeiros hábitos.
        </p>
      )}
    </section>
  );
}
