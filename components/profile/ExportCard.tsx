import { Download } from "lucide-react";
import { Panel } from "@/components/ui/panel";

const FILES = [
  { tipo: "registros", label: "Registros diários", hint: "Cada hábito, dia a dia, com valores e notas" },
  { tipo: "tarefas", label: "Tarefas", hint: "Todas as tarefas com data, prioridade e situação" },
  { tipo: "habitos", label: "Hábitos", hint: "Configuração de cada hábito" },
];

/** Cartão do Perfil: baixa os dados em CSV (abre no Excel e no Google Planilhas). */
export function ExportCard() {
  return (
    <Panel
      icon={Download}
      title="Exportar meus dados"
      description="Baixe uma cópia em CSV (separado por ponto e vírgula), que abre direto no Excel em português e no Google Planilhas."
    >
      <ul className="space-y-2">
        {FILES.map((file) => (
          <li key={file.tipo}>
            <a
              href={`/api/export?tipo=${file.tipo}`}
              download
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">{file.label}</span>
                <span className="block text-xs text-muted-foreground">{file.hint}</span>
              </span>
              <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">Baixar CSV</span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
