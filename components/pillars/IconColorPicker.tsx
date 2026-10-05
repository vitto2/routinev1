"use client";

import { cn } from "@/lib/utils";
import { PILLAR_ICONS, PALETTE } from "@/lib/constants/appearance";

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PILLAR_ICONS.map(({ name, icon: Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            "flex aspect-square items-center justify-center rounded-xl border transition-colors",
            value === name
              ? "border-primary bg-primary/10"
              : "border-border hover:bg-accent",
          )}
          aria-label={name}
        >
          <Icon className="size-4" />
        </button>
      ))}
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
    <div className="flex flex-wrap gap-2">
      {PALETTE.map(({ name, value: hex }) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          className={cn(
            "size-8 rounded-full border-2 transition-transform",
            value === hex ? "scale-110 border-foreground" : "border-transparent",
          )}
          style={{ backgroundColor: hex }}
          aria-label={name}
        />
      ))}
    </div>
  );
}
