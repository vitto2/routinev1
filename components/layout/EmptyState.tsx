import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        // Link com a aparência de botão: continua sendo um <a> (semântica de navegação).
        <Link href={actionHref} className={buttonVariants({ size: "sm", className: "mt-2" })}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
