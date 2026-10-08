export type CsvCell = string | number | boolean | null | undefined;

/** Excel/Sheets abrem UTF-8 corretamente (acentos) quando o arquivo começa com BOM. */
export const BOM = "﻿";

/** Linhas terminam em CRLF (RFC 4180); é o que o Excel espera. */
const EOL = "\r\n";

/**
 * Separador ponto e vírgula: o Excel em português (Brasil) usa ";" como separador de
 * lista; com vírgula o arquivo inteiro cairia numa única coluna. Google Planilhas e
 * LibreOffice detectam o separador sozinhos.
 */
const DELIMITER = ";";

/**
 * Texto que começa com = + - @ (ou tab/CR) seria interpretado como fórmula ao abrir
 * no Excel/Sheets ("CSV injection"). Prefixar com apóstrofo o torna texto puro.
 * Números de verdade não passam por aqui, então valores negativos continuam numéricos.
 */
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function formatCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "boolean") return cell ? "sim" : "não";
  // Decimal com vírgula, como o Excel em português espera ("2,5"; "2.5" viraria texto/data).
  if (typeof cell === "number") return Number.isFinite(cell) ? String(cell).replace(".", ",") : "";

  const text = neutralizeFormula(cell);
  // Aspas, vírgulas, ponto e vírgula e quebras de linha exigem campo entre aspas.
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(formatCell).join(DELIMITER));
  return BOM + lines.join(EOL) + EOL;
}

/** Nome de arquivo seguro: sem acentos, espaços ou caracteres especiais. */
export function safeFilename(base: string, extension: string): string {
  const clean = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${clean || "arquivo"}.${extension}`;
}
