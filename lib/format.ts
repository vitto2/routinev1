/** Formatação de números e quantidades em português (vírgula decimal). */

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return number.format(value);
}

/** 45 -> "45 min"; 120 -> "2 h"; 90 -> "1 h 30 min" */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** 250 -> "250 ml"; 2500 -> "2,5 L" */
export function formatVolume(ml: number): string {
  const rounded = Math.round(ml);
  if (rounded < 1000) return `${rounded} ml`;
  return `${formatNumber(rounded / 1000)} L`;
}

/** Valor registrado de um hábito conforme a unidade (ml, min). */
export function formatHabitValue(value: number, unit: string | null): string {
  if (unit === "min") return formatMinutes(value);
  if (unit === "ml") return formatVolume(value);
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

/** Diferença em dias entre "hoje" e uma data passada -> "hoje", "ontem", "há 5 dias". */
export function relativeDays(daysAgo: number): string {
  if (daysAgo <= 0) return "hoje";
  if (daysAgo === 1) return "ontem";
  return `há ${daysAgo} dias`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** Variação em pontos percentuais com sinal: +8 pontos, -1 ponto, 0 pontos. */
export function pointsLabel(delta: number): string {
  const abs = Math.abs(delta);
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${formatNumber(abs)} ${abs === 1 ? "ponto" : "pontos"}`;
}
