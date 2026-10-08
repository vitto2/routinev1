// Verifica o padrão visual do código (docs/DESIGN.md) sem abrir o app:
//  1. ícones do lucide só nos tamanhos da escala (14, 16, 20, 24 e 32 px);
//  2. nada de tamanhos soltos (text-[11px], size-[18px], rounded-[...]);
//  3. nada de rounded-3xl;
//  4. a receita de card (raio + borda + fundo) só existe em components/ui/surface.tsx.
// Uso: npm run check:ui
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["app", "components"];

/** size-3.5=14, 4=16, 5=20, 6=24, 8=32 */
const ICON_SIZES = new Set(["3.5", "4", "5", "6", "8"]);

/** Arquivos que podem ter valores soltos (primitivas do shadcn e a tira de dias, que desenha quadradinhos). */
const LOOSE_OK = [
  "components/ui/button.tsx",
  "components/ui/input.tsx",
  "components/ui/select.tsx",
  "components/ui/textarea.tsx",
  "components/ui/badge.tsx",
  "components/ui/card.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/switch.tsx",
  "components/ui/tabs.tsx",
  "components/ui/dropdown-menu.tsx",
  "components/progress/DayStrip.tsx",
  "components/progress/BarChart.tsx",
];

const CARD_RECIPE = /rounded-2xl[^"'`]*\bborder\b[^"'`]*\bbg-card\b|\bbg-card\b[^"'`]*rounded-2xl[^"'`]*\bborder\b/;

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.tsx$/.test(entry.name)) yield full;
  }
}

const problems = [];
const report = (file, line, message) => problems.push(`${file}:${line}  ${message}`);

for (const dir of DIRS) {
  for (const abs of files(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const source = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
    const lines = source.split("\n");

    // nomes importados do lucide-react neste arquivo
    const lucide = new Set();
    for (const m of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g)) {
      for (const part of m[1].split(",")) {
        const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
        if (name && /^[A-Z]/.test(name)) lucide.add(name);
      }
    }
    // ícones recebidos por props costumam se chamar Icon/PreviewIcon/...: contam também
    const iconish = (tag) => lucide.has(tag) || /Icon$/.test(tag);

    lines.forEach((text, i) => {
      const line = i + 1;

      // 1. escala de ícones
      for (const m of text.matchAll(/<([A-Z][A-Za-z0-9]*)\b([^>]*)>/g)) {
        if (!iconish(m[1])) continue;
        const cls = /className="([^"]*)"/.exec(m[2]);
        if (!cls) continue;
        for (const s of cls[1].matchAll(/(?:^|\s)size-(\d+(?:\.\d+)?)(?=\s|$)/g)) {
          if (!ICON_SIZES.has(s[1])) report(rel, line, `ícone <${m[1]}> com size-${s[1]} (escala: 3.5, 4, 5, 6, 8)`);
        }
      }

      if (LOOSE_OK.includes(rel)) return;

      // 2. valores soltos
      if (/\btext-\[[\d.]+(px|rem)\]/.test(text)) report(rel, line, "tamanho de texto solto (use text-xs/sm/base/...)");
      if (/\bsize-\[[\d.]+px\]/.test(text)) report(rel, line, "tamanho de ícone solto size-[Npx] (use size-4/5/6)");
      if (/\brounded-\[/.test(text)) report(rel, line, "raio solto rounded-[...] (use rounded-xl/2xl/full)");

      // 3. rounded-3xl
      if (/\brounded-3xl\b/.test(text)) report(rel, line, "rounded-3xl não faz parte da escala (cards usam rounded-2xl)");

      // 4. receita de card escrita à mão
      if (rel !== "components/ui/surface.tsx" && CARD_RECIPE.test(text)) {
        report(rel, line, "receita de card escrita à mão: use Surface/surfaceVariants/ListRow/Panel");
      }
    });
  }
}

if (problems.length) {
  console.log(`PADRÃO VISUAL: ${problems.length} problema(s)\n`);
  for (const p of problems) console.log("  " + p);
  console.log("\nRegras e componentes: docs/DESIGN.md");
  process.exit(1);
}
console.log("PADRÃO VISUAL OK: ícones na escala, sem tamanhos soltos e sem cards feitos à mão");
