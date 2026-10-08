import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBadge, type IconBadgeTone } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";

/**
 * Aviso padrão: [ícone 32] [texto, com ação opcional]. Usado para avisos de contexto
 * (dia passado, fuso diferente), sugestões, dicas e mensagens de erro/sucesso de formulário,
 * sempre com o mesmo desenho. Para erros use `role="alert"`; para confirmações, `role="status"`.
 */
export function Notice({
  icon,
  tone = "inset",
  badge = "muted",
  role = "note",
  children,
  className,
  style,
}: {
  icon: LucideIcon;
  tone?: "inset" | "card" | "success" | "warning" | "danger";
  badge?: IconBadgeTone;
  role?: "note" | "alert" | "status";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Surface
      data-ui="notice"
      role={role}
      tone={tone}
      padding="row"
      style={style}
      className={cn("flex items-start gap-3 text-sm", className)}
    >
      <IconBadge icon={icon} size="sm" tone={badge} />
      <div className="min-w-0 flex-1 space-y-2 self-center">{children}</div>
    </Surface>
  );
}
