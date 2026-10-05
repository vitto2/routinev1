"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme = "system", setTheme } = useTheme();
  // O tema só é conhecido no navegador: evita marcar opção errada na hidratação.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Aparência</p>
      <div
        role="radiogroup"
        aria-label="Aparência"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted p-1"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
