import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(selector + " {");
  const end = css.indexOf("\n}", start);
  const body = css.slice(start, end);
  const tokens = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(oklch\([^)]*\));/g)) tokens[m[1]] = m[2];
  return tokens;
}

// ---------- conversões ----------
const clamp = (x) => Math.min(1, Math.max(0, x));
function oklchToLinear(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  return oklabToLinear(L, C * Math.cos(h), C * Math.sin(h));
}
function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255));
}
function parse(token) {
  const m = token.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  return oklchToLinear(+m[1], +m[2], +m[3]);
}
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// O navegador compõe transparência em sRGB (com gama), não em luz linear.
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const fromSrgb = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const over = (fg, bg, alpha) =>
  fg.map((c, i) => fromSrgb(toSrgb(c) * alpha + toSrgb(bg[i]) * (1 - alpha)));
function mixOklab(c1, c2, w1) {
  const a = linearToOklab(c1);
  const b = linearToOklab(c2);
  return oklabToLinear(...a.map((v, i) => v * w1 + b[i] * (1 - w1)));
}

// ---------- verificações ----------
const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444", "#475569"];
let failures = 0;

for (const [theme, selector] of [["CLARO", ":root"], ["ESCURO", ".dark"]]) {
  const t = Object.fromEntries(Object.entries(block(selector)).map(([k, v]) => [k, parse(v)]));
  console.log(`\n=== ${theme} ===`);

  const check = (label, fg, bg, min) => {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`${ok ? "ok  " : "FALHA"} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${label}`);
  };

  check("texto / fundo", t.foreground, t.background, 4.5);
  check("texto / card", t["card-foreground"], t.card, 4.5);
  check("texto secundário / fundo", t["muted-foreground"], t.background, 4.5);
  check("texto secundário / card", t["muted-foreground"], t.card, 4.5);
  check("texto secundário / muted", t["muted-foreground"], t.muted, 4.5);
  check("botão primário (texto / fundo)", t["primary-foreground"], t.primary, 4.5);
  check("primary como texto/ícone / fundo", t.primary, t.background, 4.5);
  check("primary como texto / card", t.primary, t.card, 4.5);
  check("secondary-foreground / secondary", t["secondary-foreground"], t.secondary, 4.5);
  check("accent-foreground / accent", t["accent-foreground"], t.accent, 4.5);
  check("destructive texto / fundo", t.destructive, t.background, 4.5);
  check("destructive texto / card", t.destructive, t.card, 4.5);
  check("success texto / fundo", t.success, t.background, 4.5);
  check("success texto / card", t.success, t.card, 4.5);
  check("success-foreground / success (badge)", t["success-foreground"], t.success, 4.5);
  check("borda de campo / fundo (UI 3:1)", t.input, t.background, 3);
  check("borda de campo / card (UI 3:1)", t.input, t.card, 3);
  check("anel de foco / fundo (UI 3:1)", t.ring, t.background, 3);
  check("anel de foco / card (UI 3:1)", t.ring, t.card, 3);
  check("warning (ícone) / card (UI 3:1)", t.warning, t.card, 3);
  check("primary (ícone/barra) / muted (trilho) (UI 3:1)", t.primary, t.muted, 3);

  // Texto colorido sobre o próprio tom translúcido: chips e itens concluídos usam 10%.
  // O tom de 15% só aparece atrás de ícones (aba ativa), onde o mínimo é 3:1.
  for (const name of ["primary", "success", "destructive"]) {
    check(`${name} texto sobre ${name}/10% (card)`, t[name], over(t[name], t.card, 0.1), 4.5);
    check(`${name} texto sobre ${name}/10% (fundo)`, t[name], over(t[name], t.background, 0.1), 4.5);
    check(`${name} ícone sobre ${name}/15% (card, UI 3:1)`, t[name], over(t[name], t.card, 0.15), 3);
  }
  check("texto secundário sobre primary/10%", t["muted-foreground"], over(t.primary, t.card, 0.1), 4.5);
  check("texto sobre success/10% (item concluído)", t.foreground, over(t.success, t.card, 0.1), 4.5);
  check("texto secundário sobre success/10%", t["muted-foreground"], over(t.success, t.card, 0.1), 4.5);

  // Calendário mensal: número e % em texto normal sobre o tom do dia; ícone (UI 3:1) na cor do nível.
  for (const name of ["success", "warning", "destructive"]) {
    const tint = over(t[name], t.card, 0.12);
    check(`calendário ${name}: texto sobre tom 12%`, t.foreground, tint, 4.5);
    check(`calendário ${name}: texto secundário sobre tom 12%`, t["muted-foreground"], tint, 4.5);
    check(`calendário ${name}: ícone sobre tom 12% (UI 3:1)`, t[name], tint, 3);
  }
  // Faixa de pausa no Hoje: texto a 80% e ícone sobre warning/10% (sobre o fundo da página).
  const pauseTint = over(t.warning, t.background, 0.1);
  check("faixa de pausa: texto (80%) sobre tom 10%", over(t.foreground, pauseTint, 0.8), pauseTint, 4.5);
  check("faixa de pausa: ícone sobre tom 10% (UI 3:1)", t.warning, pauseTint, 3);
  // Cartão de pausa no Perfil: ícone warning sobre warning/15% do card.
  check("cartão de pausa: ícone sobre tom 15% (UI 3:1)", t.warning, over(t.warning, t.card, 0.15), 3);

  // Componentes do sistema de design v2 (docs/DESIGN.md).
  // Notice: texto sobre o tom do aviso (sobre a página ou sobre um card) e ícone na caixa de 32 px.
  for (const [name, boxAlpha] of [["success", 0.15], ["warning", 0.15], ["destructive", 0.1]]) {
    for (const [baseLabel, base] of [["fundo", t.background], ["card", t.card]]) {
      const surface = over(t[name], base, 0.1);
      check(`aviso ${name} (${baseLabel}): texto sobre o tom 10%`, t.foreground, surface, 4.5);
      check(`aviso ${name} (${baseLabel}): texto secundário sobre o tom 10%`, t["muted-foreground"], surface, 4.5);
      check(`aviso ${name} (${baseLabel}): ícone na caixa (UI 3:1)`, t[name], over(t[name], surface, boxAlpha), 3);
    }
  }
  // Aviso neutro (inset) e StatTile: bg-muted/60 sobre a página, o card e o destaque do Progresso.
  const heroSurface = over(t.primary, t.card, 0.15);
  for (const [baseLabel, base] of [["fundo", t.background], ["card", t.card], ["destaque", heroSurface]]) {
    const tile = over(t.muted, base, 0.6);
    check(`tile/aviso neutro (${baseLabel}): texto`, t.foreground, tile, 4.5);
    check(`tile/aviso neutro (${baseLabel}): legenda`, t["muted-foreground"], tile, 4.5);
    check(`tile/aviso neutro (${baseLabel}): ícone primary (UI 3:1)`, t.primary, tile, 3);
  }
  // Grade da semana: ícones de estado sobre o card e sobre a coluna de hoje (primary/10%).
  for (const [baseLabel, base] of [["card", t.card], ["hoje", over(t.primary, t.card, 0.1)]]) {
    check(`semana (${baseLabel}): feito (UI 3:1)`, t.success, base, 3);
    check(`semana (${baseLabel}): não feito (UI 3:1)`, t.destructive, base, 3);
    check(`semana (${baseLabel}): em aberto (UI 3:1)`, t["muted-foreground"], base, 3);
    check(`semana (${baseLabel}): não programado a 70% (UI 3:1)`, over(t["muted-foreground"], base, 0.7), base, 3);
  }

  // Barras dos gráficos: preenchida e contorno do período em andamento sobre o card.
  check("gráfico: barra primary / card (UI 3:1)", t.primary, t.card, 3);
  check("gráfico: contorno primary / card (UI 3:1)", t.primary, t.card, 3);
  check("gráfico: texto do rótulo / card", t["muted-foreground"], t.card, 4.5);

  // cor de pilar: ícone/título = mistura com o texto; fundo = cor a 13% sobre o card
  for (const hex of PALETTE) {
    const base = hexToLinear(hex);
    const tint = over(base, t.card, 0.13);
    const fg = mixOklab(base, t.foreground, 0.5);
    check(`pilar ${hex} ícone / tint (UI 3:1)`, fg, tint, 3);
    check(`pilar ${hex} título / card (4.5)`, fg, t.card, 4.5);
  }
}

console.log(failures === 0 ? "\nTODOS OS CONTRASTES OK" : `\n${failures} FALHA(S)`);
process.exit(failures === 0 ? 0 : 1);
