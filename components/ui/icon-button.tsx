import Link from "next/link";
import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Botão só de ícone: sempre 40 x 40 px (alvo de toque) com glifo de 20 px.
 * `label` vira o nome acessível, porque não há texto visível.
 */
export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "size" | "children" | "aria-label"> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button
      type="button"
      data-ui="icon-button"
      size="icon"
      variant={variant}
      aria-label={label}
      className={cn("rounded-full", className)}
      {...props}
    >
      <Icon className="size-5" aria-hidden />
    </Button>
  );
}

/** Link com a aparência do IconButton (voltar, mês anterior, próxima semana...). */
export function IconLink({
  href,
  icon: Icon,
  label,
  className,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-ui="icon-button"
      className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-full", className)}
    >
      <Icon className="size-5" aria-hidden />
    </Link>
  );
}

/** Versão apagada do IconLink, no mesmo lugar e do mesmo tamanho (ex.: não há semana anterior). */
export function IconLinkOff({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      data-ui="icon-button"
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground/50"
    >
      <Icon className="size-5" />
    </span>
  );
}
