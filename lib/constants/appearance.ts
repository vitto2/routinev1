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

export const PILLAR_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "Heart", icon: Heart },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Droplet", icon: Droplet },
  { name: "BookOpen", icon: BookOpen },
  { name: "Brain", icon: Brain },
  { name: "ShieldCheck", icon: ShieldCheck },
  { name: "Moon", icon: Moon },
  { name: "Sparkles", icon: Sparkles },
  { name: "Wallet", icon: Wallet },
  { name: "Briefcase", icon: Briefcase },
  { name: "Smartphone", icon: Smartphone },
  { name: "Utensils", icon: Utensils },
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
