"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * Escolha única exibida como cartões/segmentos (radiogroup acessível).
 * Setas do teclado movem a seleção, como em um radio nativo.
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  columns,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = columns ?? (options.length as 2 | 3 | 4);
  const gridCols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    const group = event.currentTarget.parentElement;
    requestAnimationFrame(() =>
      group?.querySelectorAll<HTMLElement>('[role="radio"]')[
        options.findIndex((o) => o.value === next.value)
      ]?.focus(),
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", gridCols, className)}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex min-h-14 flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98]",
              option.description ? "" : "items-center text-center",
              active
                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                : "border-input bg-card hover:bg-accent",
            )}
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            {option.description ? (
              <span className="block text-xs text-muted-foreground">{option.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
