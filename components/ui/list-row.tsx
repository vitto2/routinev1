import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/surface";

/** Seta de navegação à direita de uma linha clicável. */
export function RowChevron() {
  return <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}

/**
 * Linha de lista padrão: [controle ou ícone] [título e detalhe] [ação ou seta].
 * Altura mínima de 64 px, 16 px nas laterais, 12 px entre as partes. Com `href`, a linha
 * inteira é um link. Veja docs/DESIGN.md.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  tone,
  className,
  style,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  tone?: VariantProps<typeof surfaceVariants>["tone"];
  className?: string;
  style?: CSSProperties;
}) {
  const classes = cn(
    surfaceVariants({ tone, padding: "row", interactive: Boolean(href) }),
    "flex min-h-16 items-center gap-3",
    className,
  );

  const content = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-snug">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </>
  );

  return href ? (
    <Link href={href} data-ui="list-row" className={classes} style={style}>
      {content}
    </Link>
  ) : (
    <div data-ui="list-row" className={classes} style={style}>
      {content}
    </div>
  );
}
