"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Opção em forma de pílula (metas rápidas, atalhos de data, duração de pausa, desafio).
 * Sempre 40 px de altura e 14 px de padding lateral, com estado ativo em destaque.
 */
export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-ui="chip"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,transform] duration-150 active:scale-95",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-card text-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
