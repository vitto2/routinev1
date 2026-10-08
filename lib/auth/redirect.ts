const BASE = "https://app.invalid";

/**
 * Valida o destino pós-login (parâmetro `next`). Só aceita caminhos do próprio
 * app: nada de "//dominio", "https://...", barras invertidas ou caracteres de
 * controle, que permitiriam redirecionar o usuário para um site externo.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/today"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
