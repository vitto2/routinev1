import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Número (ou palavra) de destaque com legenda, usado em grades de 2 a 4 colunas
 * (Progresso, Revisão). Todos têm o mesmo raio, respiro e tipografia; a altura se iguala
 * pela grade (`h-full`).
 */
export function StatTile({
  icon: Icon,
  iconClassName = "text-primary",
  value,
  label,
  sub,
  tone = "default",
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  value: string;
  label: string;
  /** linha extra pequena abaixo da legenda (ex.: a porcentagem do melhor dia) */
  sub?: string;
  tone?: "default" | "danger";
  /** "md": número grande; "sm": palavra curta (ex.: nome do dia) */
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <div
      data-ui="stat-tile"
      className={cn(
        "flex h-full flex-col items-center rounded-xl bg-muted/60 px-2 py-3 text-center",
        className,
      )}
    >
      {Icon ? <Icon className={cn("mb-1.5 size-4", iconClassName)} aria-hidden /> : null}
      <p
        className={cn(
          "max-w-full truncate font-bold leading-none tabular-nums",
          size === "md" ? "text-lg" : "text-sm",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
      {sub ? <p className="text-xs font-medium tabular-nums text-foreground">{sub}</p> : null}
    </div>
  );
}
