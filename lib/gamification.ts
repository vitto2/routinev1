/** Marcos de sequência que merecem um aviso. Poucos de propósito: sem excesso de comemoração. */
export const MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365] as const;

export type StreakUnit = "days" | "weeks";

/** Maior marco cruzado ao ir de `before` para `after` (ou null). */
export function milestoneCrossed(before: number, after: number): number | null {
  if (after <= before) return null;
  const crossed = MILESTONES.filter((m) => m > before && m <= after);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

const UNIT_LABEL: Record<StreakUnit, [string, string]> = {
  days: ["dia", "dias"],
  weeks: ["semana", "semanas"],
};

export function formatStreak(n: number, unit: StreakUnit): string {
  const [one, many] = UNIT_LABEL[unit];
  return `${n} ${n === 1 ? one : many}`;
}

export interface CelebrationMessage {
  title: string;
  description?: string;
}

/** Texto do aviso ao atingir um marco ou uma nova melhor sequência. */
export function celebrationMessage(
  habitName: string,
  current: number,
  unit: StreakUnit,
  { milestone, newBest }: { milestone: number | null; newBest: boolean },
): CelebrationMessage | null {
  if (milestone === null && !newBest) return null;

  const streak = formatStreak(current, unit);

  if (milestone !== null) {
    if (unit === "weeks") {
      return { title: `${streak} batendo a meta`, description: habitName };
    }
    const titles: Record<number, string> = {
      3: `${streak} seguidos. Bom começo!`,
      7: "Uma semana inteira sem falhar",
      14: "Duas semanas seguidas",
      21: "21 dias: já virou rotina",
      30: "Um mês de consistência",
      50: `${streak} seguidos`,
      100: "100 dias. Consistência de verdade",
      200: `${streak} seguidos`,
      365: "Um ano inteiro",
    };
    return { title: titles[milestone] ?? `${streak} seguidos`, description: habitName };
  }

  return { title: `Nova melhor sequência: ${streak}`, description: habitName };
}
