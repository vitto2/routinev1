import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Superfície padrão do app. Todo card usa esta receita (raio, borda, sombra e respiro)
 * para que nenhum fique com cantos, profundidade ou espaçamento diferente dos outros.
 * Veja docs/DESIGN.md.
 *
 * - card: elevado (conteúdo principal)
 * - inset: rebaixado, sem sombra (dicas, avisos, fundos de grupo)
 * - success: estado de conclusão
 * - warning: aviso de situação (ex.: modo pausa)
 * - hero: resumo de destaque do topo de uma tela (um por tela)
 * - dashed: lugar vazio (estado vazio)
 */
export const surfaceVariants = cva("rounded-2xl border", {
  variants: {
    tone: {
      card: "border-border bg-card text-card-foreground shadow-sm",
      inset: "border-transparent bg-muted/60 text-foreground",
      success: "border-success/40 bg-success/10 text-card-foreground shadow-sm",
      warning: "border-warning/40 bg-warning/10 text-foreground",
      danger: "border-destructive/40 bg-destructive/10 text-foreground",
      hero: "border-border bg-gradient-to-br from-primary/15 via-card to-card text-card-foreground shadow-sm",
      dashed: "border-dashed border-border bg-transparent",
    },
    padding: {
      none: "",
      /** linha de lista: 16 px nas laterais, 12 px em cima e embaixo */
      row: "px-4 py-3",
      /** cartão de conteúdo: 16 px em tudo */
      md: "p-4",
    },
    interactive: {
      true: "transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      false: "",
    },
  },
  defaultVariants: { tone: "card", padding: "md", interactive: false },
});

export function Surface({
  className,
  tone,
  padding,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceVariants>) {
  return (
    <div
      data-ui="surface"
      className={cn(surfaceVariants({ tone, padding, interactive }), className)}
      {...props}
    />
  );
}
