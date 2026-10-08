import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { IconLink } from "@/components/ui/icon-button";

/** Cabeçalho das telas internas: [voltar 40] [título] [ação opcional], tudo na mesma linha. */
export function PageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  /** botão ou link alinhado à direita (ex.: "Novo") */
  action?: ReactNode;
}) {
  return (
    <div data-ui="page-header" className="mb-6 flex min-h-10 items-center gap-2">
      {backHref ? <IconLink href={backHref} icon={ChevronLeft} label="Voltar" /> : null}
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
