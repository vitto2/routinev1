import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Título de seção padrão: pequeno, em caixa alta, com contagem ou ação opcional à direita. */
export function SectionTitle({
  children,
  icon: Icon,
  aside,
  tone = "muted",
  as: Tag = "h2",
  id,
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  aside?: ReactNode;
  tone?: "muted" | "danger";
  as?: "h2" | "h3";
  /** para `aria-labelledby` da seção */
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Tag
        id={id}
        className={cn(
          "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
        {children}
      </Tag>
      {aside}
    </div>
  );
}
