import { Download } from "lucide-react";

const FILES = [
  { tipo: "registros", label: "Registros diários", hint: "Cada hábito, dia a dia, com valores e notas" },
  { tipo: "tarefas", label: "Tarefas", hint: "Todas as tarefas com data, prioridade e situação" },
  { tipo: "habitos", label: "Hábitos", hint: "Configuração de cada hábito" },
];

/** Cartão do Perfil: baixa os dados em CSV (abre no Excel e no Google Planilhas). */
export function ExportCard() {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">Exportar meus dados</h2>
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia em CSV (separado por ponto e vírgula), que abre direto no Excel em português e no Google Planilhas.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {FILES.map((file) => (
          <li key={file.tipo}>
            <a
              href={`/api/export?tipo=${file.tipo}`}
              download
              className="flex min-h-14 items-center gap-3 rounded-xl border border-input bg-card px-3 py-2 transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{file.label}</span>
                <span className="block text-xs text-muted-foreground">{file.hint}</span>
              </span>
              <Download className="size-4 text-muted-foreground" aria-hidden />
              <span className="sr-only">Baixar CSV</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
