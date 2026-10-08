import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { accentStyles } from "@/lib/constants/appearance";
import { cn } from "@/lib/utils";

/**
 * Caixa de ícone padrão. Só existem três medidas, e o desenho (glifo) acompanha a caixa:
 *   sm  32 px, glifo 16 px   (controles dentro de linhas, como o check do hábito)
 *   md  40 px, glifo 20 px   (ícone de item, de cartão, de configuração)
 *   lg  48 px, glifo 24 px   (estado vazio, destaque)
 *   xl  64 px, glifo 32 px   (só o selo de abertura e de conclusão do onboarding)
 * O glifo fica sempre centralizado. Veja docs/DESIGN.md.
 */
const SIZE = {
  sm: { box: "size-8", glyph: "size-4", dot: "size-1.5" },
  md: { box: "size-10", glyph: "size-5", dot: "size-2" },
  lg: { box: "size-12", glyph: "size-6", dot: "size-2.5" },
  xl: { box: "size-16", glyph: "size-8", dot: "size-3" },
} as const;

const TONE = {
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  solid: "bg-primary text-primary-foreground",
} as const;

export type IconBadgeSize = keyof typeof SIZE;
export type IconBadgeTone = keyof typeof TONE;

export function IconBadge({
  icon: Icon,
  size = "md",
  tone = "primary",
  accent,
  shape = "square",
  strokeWidth,
  className,
  style,
}: {
  /** sem ícone, mostra um ponto (hábito ou pilar sem ícone escolhido) */
  icon?: LucideIcon;
  size?: IconBadgeSize;
  tone?: IconBadgeTone;
  /** cor do hábito/pilar (#rrggbb); substitui o tom e mantém o contraste nos dois temas */
  accent?: string | null;
  shape?: "square" | "circle";
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const accentStyle = accent === undefined ? undefined : accentStyles(accent).bubble;
  const { box, glyph, dot } = SIZE[size];

  return (
    <span
      data-ui="icon-badge"
      data-size={size}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        box,
        shape === "circle" ? "rounded-full" : "rounded-xl",
        accent === undefined && TONE[tone],
        className,
      )}
      style={{ ...accentStyle, ...style }}
    >
      {Icon ? (
        <Icon className={glyph} strokeWidth={strokeWidth} />
      ) : (
        <span className={cn("rounded-full bg-current", dot)} />
      )}
    </span>
  );
}
