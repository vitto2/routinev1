/**
 * Ordem dos hábitos dentro de uma rotina. Os `sort_order` costumam estar todos
 * iguais (padrão 0), então mover um hábito renumera a lista inteira em sequência.
 */
export interface Orderable {
  id: string;
  sort_order: number;
  created_at: string;
}

/** Ordena como o app exibe: sort_order, depois criação, depois id (estável). */
export function sortHabits<T extends Orderable>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Move `id` uma posição para cima ou para baixo e devolve a numeração 0..n-1 de
 * toda a lista (somente o que mudou precisa ser gravado). Nos limites, não muda nada.
 */
export function moveInOrder<T extends Orderable>(
  items: T[],
  id: string,
  direction: "up" | "down",
): { id: string; sort_order: number }[] {
  const sorted = sortHabits(items);
  const from = sorted.findIndex((item) => item.id === id);
  const to = direction === "up" ? from - 1 : from + 1;

  if (from === -1 || to < 0 || to >= sorted.length) {
    return sorted.map((item, index) => ({ id: item.id, sort_order: index }));
  }

  [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
  return sorted.map((item, index) => ({ id: item.id, sort_order: index }));
}
