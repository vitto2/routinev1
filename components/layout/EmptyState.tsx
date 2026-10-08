import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { surfaceVariants } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div
      data-ui="empty-state"
      className={cn(
        surfaceVariants({ tone: "dashed", padding: "none" }),
        "flex flex-col items-center gap-2 px-6 py-8 text-center",
      )}
    >
      <IconBadge icon={icon} size="lg" tone="muted" shape="circle" />
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && actionHref ? (
        // Link com a aparência de botão: continua sendo um <a> (semântica de navegação).
        <Link href={actionHref} className={buttonVariants({ size: "sm", className: "mt-2" })}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
