"use client";

import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, WEEKDAY_NAMES } from "@/lib/dates";

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Dias úteis", days: [1, 2, 3, 4, 5] },
  { label: "Fim de semana", days: [0, 6] },
  { label: "Todos", days: [0, 1, 2, 3, 4, 5, 6] },
];

// Segunda primeiro, como no resto do app.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  }

  const same = (a: number[], b: number[]) =>
    a.length === b.length && a.every((d) => b.includes(d));

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Dias da semana"
        aria-describedby={describedBy}
        className="grid grid-cols-7 gap-1.5"
      >
        {ORDER.map((day) => {
          const active = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={active}
              aria-label={WEEKDAY_NAMES[day]}
              onClick={() => toggle(day)}
              className={cn(
                "flex aspect-square min-h-11 items-center justify-center rounded-full border text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-90",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-card text-foreground hover:bg-accent",
                invalid && !active && "border-destructive",
              )}
            >
              {WEEKDAY_LABELS[day].charAt(0) + WEEKDAY_LABELS[day].slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={same(value, preset.days)}
            onClick={() => onChange(preset.days)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
              same(value, preset.days)
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-card text-foreground hover:bg-accent",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
