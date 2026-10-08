import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBadge, type IconBadgeTone } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";

/**
 * Cabeçalho padrão de cartão: [ícone 40] [título + detalhe] [destaque à direita].
 * Todo cartão com ícone (Perfil, Progresso, Revisão) usa este mesmo desenho,
 * então o ícone, o título e o número ficam sempre nas mesmas posições.
 */
export function CardHeading({
  icon,
  tone = "primary",
  accent,
  title,
  description,
  aside,
  as: Tag = "h2",
  align = "start",
}: {
  icon?: LucideIcon;
  tone?: IconBadgeTone;
  /** cor do hábito/pilar (#rrggbb); substitui o tom */
  accent?: string | null;
  title: ReactNode;
  description?: ReactNode;
  /** destaque à direita (ex.: porcentagem ou etiqueta de estado) */
  aside?: ReactNode;
  as?: "h2" | "h3";
  /** "start": ícone alinhado à 1ª linha (descrição longa); "center": ícone e texto centralizados */
  align?: "start" | "center";
}) {
  return (
    <div
      data-ui="card-heading"
      className={cn("flex gap-3", align === "center" ? "items-center" : "items-start")}
    >
      <IconBadge icon={icon} tone={tone} accent={accent} />
      <div className="min-w-0 flex-1">
        <Tag className="truncate font-semibold leading-snug">{title}</Tag>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {aside}
    </div>
  );
}

/** Cartão de configuração/informação: cabeçalho padrão e o conteúdo logo abaixo, com o mesmo respiro em todos. */
export function Panel({
  icon,
  tone,
  title,
  description,
  aside,
  children,
  className,
  as,
  align,
}: {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
  align?: "start" | "center";
}) {
  return (
    <section data-ui="panel" className={cn(surfaceVariants({ padding: "md" }), "space-y-3", className)}>
      <CardHeading
        icon={icon}
        tone={tone}
        title={title}
        description={description}
        aside={aside}
        as={as}
        align={align}
      />
      {children}
    </section>
  );
}

/** Número grande à direita do cabeçalho (porcentagem, contagem). */
export function HeadingValue({ children }: { children: ReactNode }) {
  return <p className="shrink-0 text-xl font-bold tabular-nums">{children}</p>;
}
