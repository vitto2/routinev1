import {
  Heart,
  BookOpen,
  ShieldCheck,
  Dumbbell,
  Droplet,
  Moon,
  Sparkles,
  Wallet,
  Briefcase,
  Brain,
  Smartphone,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export const PILLAR_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "Heart", label: "Coração", icon: Heart },
  { name: "Dumbbell", label: "Treino", icon: Dumbbell },
  { name: "Droplet", label: "Água", icon: Droplet },
  { name: "BookOpen", label: "Livro", icon: BookOpen },
  { name: "Brain", label: "Mente", icon: Brain },
  { name: "ShieldCheck", label: "Escudo", icon: ShieldCheck },
  { name: "Moon", label: "Lua", icon: Moon },
  { name: "Sparkles", label: "Brilho", icon: Sparkles },
  { name: "Wallet", label: "Carteira", icon: Wallet },
  { name: "Briefcase", label: "Maleta", icon: Briefcase },
  { name: "Smartphone", label: "Celular", icon: Smartphone },
  { name: "Utensils", label: "Alimentação", icon: Utensils },
];

export const ICONS_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  PILLAR_ICONS.map(({ name, icon }) => [name, icon]),
);

export const PALETTE: { name: string; value: string }[] = [
  { name: "Índigo", value: "#6366f1" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Violeta", value: "#8b5cf6" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Grafite", value: "#475569" },
];

export const DEFAULT_ACCENT = "#6366f1";

/**
 * Cores de pilar/hábito com contraste garantido nos dois temas (verificado em
 * scripts/check-contrast.mjs): fundo = cor a ~13%, ícone/título = cor misturada
 * 50% com o texto do tema (escurece no claro, clareia no escuro).
 */
export function accentStyles(color: string | null | undefined) {
  const c = color || DEFAULT_ACCENT;
  return {
    bubble: { backgroundColor: `${c}22`, color: `color-mix(in oklab, ${c} 50%, var(--foreground))` },
    text: { color: `color-mix(in oklab, ${c} 50%, var(--foreground))` },
    bar: { backgroundColor: c },
    soft: { backgroundColor: `${c}14` },
  };
}

/** Preto ou branco, o que tiver mais contraste sobre a cor `hex` (#rrggbb). */
export function readableOn(hex: string): "#111111" | "#ffffff" {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // contraste com branco = 1.05/(l+.05); com preto ~ (l+.05)/.05
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.0617 ? "#ffffff" : "#111111";
}
