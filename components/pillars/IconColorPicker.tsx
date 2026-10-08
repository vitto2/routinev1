"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PILLAR_ICONS, PALETTE, accentStyles, readableOn } from "@/lib/constants/appearance";

export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: string | null;
  onChange: (icon: string) => void;
  color?: string | null;
}) {
  const accent = accentStyles(color);

  return (
    <div role="group" aria-label="Ícone" className="grid grid-cols-6 justify-items-center gap-2">
      {PILLAR_ICONS.map(({ name, label, icon: Icon }) => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(name)}
            style={active ? accent.bubble : undefined}
            className={cn(
              "flex size-11 items-center justify-center rounded-xl border transition-[background-color,border-color,transform] duration-150 active:scale-90",
              active ? "border-current ring-1 ring-current" : "border-input bg-card hover:bg-accent",
            )}
          >
            <Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div role="group" aria-label="Cor" className="flex flex-wrap gap-2.5">
      {PALETTE.map(({ name, value: hex }) => {
        const active = value === hex;
        return (
          <button
            key={hex}
            type="button"
            aria-pressed={active}
            aria-label={name}
            title={name}
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex, color: readableOn(hex) }}
            className={cn(
              "flex size-11 items-center justify-center rounded-full shadow-sm ring-offset-2 ring-offset-background transition-[transform,box-shadow] duration-150 active:scale-90",
              active ? "scale-105 ring-2 ring-foreground" : "ring-0",
            )}
          >
            {active ? <Check className="size-5" strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}
