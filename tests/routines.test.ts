import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveInOrder, sortHabits } from "@/lib/routines/order";
import { groupByRoutine } from "@/lib/routines/group";
import type { Routine } from "@/types/domain";
import { PERIOD_BY_VALUE, ROUTINE_PERIODS, periodForHour } from "@/lib/constants/routines";

const item = (id: string, sort_order = 0, created_at = "2026-01-01T00:00:00Z") => ({
  id,
  sort_order,
  created_at,
});

describe("ordem dos hábitos na rotina", () => {
  it("ordena por sort_order, depois criação, depois id", () => {
    const sorted = sortHabits([
      item("c", 1),
      item("b", 0, "2026-02-01T00:00:00Z"),
      item("a", 0, "2026-01-01T00:00:00Z"),
    ]);
    assert.deepEqual(
      sorted.map((i) => i.id),
      ["a", "b", "c"],
    );
  });

  it("mover para baixo troca com o vizinho e renumera tudo", () => {
    const result = moveInOrder([item("a"), item("b", 0, "2026-01-02T00:00:00Z"), item("c", 0, "2026-01-03T00:00:00Z")], "a", "down");
    assert.deepEqual(result, [
      { id: "b", sort_order: 0 },
      { id: "a", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ]);
  });

  it("mover para cima troca com o anterior", () => {
    const result = moveInOrder([item("a", 0), item("b", 1), item("c", 2)], "c", "up");
    assert.deepEqual(
      result.map((r) => r.id),
      ["a", "c", "b"],
    );
  });

  it("nos limites mantém a ordem (e ainda normaliza os números)", () => {
    const result = moveInOrder([item("a", 5), item("b", 9)], "a", "up");
    assert.deepEqual(result, [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
    ]);
    assert.deepEqual(moveInOrder([item("a")], "zzz", "down"), [{ id: "a", sort_order: 0 }]);
  });
});

describe("agrupamento por rotina", () => {
  const routine = (id: string, period: Routine["period"], sort_order = 0): Routine => ({
    id,
    user_id: "u",
    name: id,
    period,
    sort_order,
    created_at: "",
  });
  const habitOf = (id: string, routine_id: string | null) => ({ id, routine_id });

  it("sem rotinas em uso mantém a lista simples", () => {
    const groups = groupByRoutine([habitOf("a", null), habitOf("b", null)], [routine("r", "morning")]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].routine, null);
    assert.equal(groups[0].habits.length, 2);
  });

  it("agrupa na ordem do dia e deixa os sem rotina por último", () => {
    const routines = [routine("noite", "evening"), routine("manha", "morning")];
    const groups = groupByRoutine(
      [habitOf("1", "noite"), habitOf("2", null), habitOf("3", "manha"), habitOf("4", "manha")],
      routines,
    );
    assert.deepEqual(
      groups.map((g) => g.routine?.id ?? "sem"),
      ["manha", "noite", "sem"],
    );
    assert.deepEqual(groups[0].habits.map((h) => h.id), ["3", "4"]);
  });

  it("rotina sem hábitos hoje não aparece e rotina apagada cai em 'sem rotina'", () => {
    const groups = groupByRoutine(
      [habitOf("1", "manha"), habitOf("2", "apagada")],
      [routine("manha", "morning"), routine("tarde", "afternoon")],
    );
    assert.deepEqual(
      groups.map((g) => g.routine?.id ?? "sem"),
      ["manha", "sem"],
    );
    assert.deepEqual(groups[1].habits.map((h) => h.id), ["2"]);
  });
});

describe("períodos do dia", () => {
  it("escolhe o período pela hora local", () => {
    assert.equal(periodForHour(6), "morning");
    assert.equal(periodForHour(11), "morning");
    assert.equal(periodForHour(12), "afternoon");
    assert.equal(periodForHour(17), "afternoon");
    assert.equal(periodForHour(18), "evening");
    assert.equal(periodForHour(23), "evening");
  });

  it("exibe manhã, tarde, noite e outra, nessa ordem", () => {
    const ordered = [...ROUTINE_PERIODS].sort((a, b) => a.order - b.order).map((p) => p.value);
    assert.deepEqual(ordered, ["morning", "afternoon", "evening", "custom"]);
    assert.equal(PERIOD_BY_VALUE.evening.label, "Noite");
  });
});
