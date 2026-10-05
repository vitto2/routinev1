"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PIECES = [
  { dx: -70, dy: -60, rot: 200, color: "#6366f1" },
  { dx: -40, dy: -85, rot: -160, color: "#10b981" },
  { dx: -10, dy: -95, rot: 120, color: "#f59e0b" },
  { dx: 25, dy: -90, rot: -220, color: "#ec4899" },
  { dx: 55, dy: -75, rot: 180, color: "#06b6d4" },
  { dx: 80, dy: -50, rot: -140, color: "#8b5cf6" },
  { dx: -85, dy: -25, rot: 260, color: "#f59e0b" },
  { dx: 90, dy: -20, rot: -250, color: "#10b981" },
  { dx: -60, dy: 10, rot: 140, color: "#ec4899" },
  { dx: 65, dy: 15, rot: -120, color: "#6366f1" },
  { dx: -25, dy: 25, rot: 210, color: "#06b6d4" },
  { dx: 30, dy: 30, rot: -190, color: "#f59e0b" },
];

export function ScoreCard({
  label,
  percent,
  celebrate = false,
}: {
  label: string;
  /** 0 a 1, ou null quando não há nada programado */
  percent: number | null;
  /** dispara a comemoração ao atingir 100% (tela Hoje) */
  celebrate?: boolean;
}) {
  const [previous, setPrevious] = useState(percent);
  const [burst, setBurst] = useState(0);

  // Padrão "ajustar estado durante o render": detecta a virada para 100%.
  if (percent !== previous) {
    setPrevious(percent);
    if (celebrate && percent === 1 && (previous ?? 0) < 1) {
      setBurst((b) => b + 1);
    }
  }

  const rounded = percent === null ? null : Math.round(percent * 100);
  const complete = percent === 1;

  return (
    <div
      key={burst > 0 ? `burst-${burst}` : "card"}
      className={cn(
        "relative rounded-2xl border border-border bg-card p-4 transition-colors duration-300",
        complete && "border-primary/40 bg-primary/5",
        burst > 0 && "animate-ring",
      )}
    >
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">
          {complete && celebrate ? "Dia completo. Ótimo trabalho!" : label}
        </p>
        {rounded !== null ? (
          <p className="text-2xl font-semibold tabular-nums">{rounded}%</p>
        ) : null}
      </div>
      {rounded !== null ? (
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={rounded}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${rounded}%` }}
          />
        </div>
      ) : null}
      {burst > 0 ? (
        <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          {PIECES.map((piece, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={
                {
                  backgroundColor: piece.color,
                  "--dx": `${piece.dx}px`,
                  "--dy": `${piece.dy}px`,
                  "--rot": `${piece.rot}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
