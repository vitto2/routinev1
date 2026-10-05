import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {backHref ? (
        <Link
          href={backHref}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
