import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isScheduledOn } from "@/lib/scheduling";
import { pauseState, planPause, planResume, type ScheduleOp } from "@/lib/scheduling/pause";
import { computeStreak, scoreForDays } from "@/lib/scoring";
import { periodDays } from "@/lib/progress/period";
import type { HabitSchedule } from "@/types/domain";
import { habit, logsOn } from "./helpers";

const TODAY = "2026-10-08"; // quinta

function schedule(id: string, start: string, end: string | null = null): HabitSchedule {
  return {
    id,
    habit_id: "h",
    schedule_type: "daily",
    weekdays: null,
    frequency_target: null,
    interval_days: null,
    specific_date: null,
    start_date: start,
    end_date: end,
    created_at: "",
  };
}

/** Aplica as operações em memória, como o banco faria. */
function apply(schedules: HabitSchedule[], ops: ScheduleOp[]): HabitSchedule[] {
  let result = [...schedules];
  let next = 100;
  for (const op of ops) {
    if (op.type === "delete") result = result.filter((s) => s.id !== op.id);
    if (op.type === "update") {
      result = result.map((s) => (s.id === op.id ? { ...s, ...op.patch } : s));
    }
    if (op.type === "insert") {
      result.push({ ...op.row, id: `new${next++}`, habit_id: "h", created_at: "" });
    }
  }
  return result;
}

const scheduled = (list: HabitSchedule[], date: string) => isScheduledOn(list, date);

describe("planPause", () => {
  it("pausa indefinida encerra a agenda aberta na véspera", () => {
    const list = [schedule("a", "2026-09-01")];
    const ops = planPause(list, TODAY, null);
    assert.deepEqual(ops, [{ type: "update", id: "a", patch: { end_date: "2026-10-07" } }]);

    const after = apply(list, ops);
    assert.equal(scheduled(after, "2026-10-07"), true);
    assert.equal(scheduled(after, TODAY), false);
    assert.equal(scheduled(after, "2026-12-01"), false);
  });

  it("pausa com retorno recria a agenda a partir do dia seguinte ao fim", () => {
    const list = [schedule("a", "2026-09-01")];
    const after = apply(list, planPause(list, TODAY, "2026-10-12")); // pausado 08 a 12

    assert.equal(scheduled(after, "2026-10-07"), true);
    for (const d of ["2026-10-08", "2026-10-10", "2026-10-12"]) assert.equal(scheduled(after, d), false);
    assert.equal(scheduled(after, "2026-10-13"), true);
    assert.equal(scheduled(after, "2027-01-01"), true);
  });

  it("agenda que começa hoje some e volta depois (hábito criado hoje)", () => {
    const list = [schedule("a", TODAY)];
    const after = apply(list, planPause(list, TODAY, "2026-10-09"));
    assert.equal(scheduled(after, TODAY), false);
    assert.equal(scheduled(after, "2026-10-09"), false);
    assert.equal(scheduled(after, "2026-10-10"), true);
  });

  it("preserva o histórico: dias anteriores continuam agendados", () => {
    const list = [schedule("old", "2026-08-01", "2026-09-14"), schedule("a", "2026-09-15")];
    const after = apply(list, planPause(list, TODAY, "2026-10-10"));
    assert.equal(scheduled(after, "2026-08-20"), true);
    assert.equal(scheduled(after, "2026-09-20"), true);
    assert.equal(scheduled(after, "2026-10-08"), false);
  });

  it("pausa futura já marcada é substituída pela nova (sem sobrepor)", () => {
    // pausa antiga: 08 a 10 (retorno 11); nova pausa: 08 a 20
    const first = apply([schedule("a", "2026-09-01")], planPause([schedule("a", "2026-09-01")], TODAY, "2026-10-10"));
    const after = apply(first, planPause(first, TODAY, "2026-10-20"));
    assert.equal(scheduled(after, "2026-10-15"), false);
    assert.equal(scheduled(after, "2026-10-21"), true);
    // nunca duas agendas cobrindo o mesmo dia
    for (let day = 1; day <= 28; day++) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      const covering = after.filter(
        (s) => s.start_date <= date && (s.end_date === null || s.end_date >= date),
      );
      assert.ok(covering.length <= 1, `${date} coberto por ${covering.length} agendas`);
    }
  });

  it("intervalo invertido não faz nada", () => {
    assert.deepEqual(planPause([schedule("a", "2026-09-01")], TODAY, "2026-10-01"), []);
  });

  it("insere antes de alterar (falha parcial não deixa o hábito sem agenda)", () => {
    const ops = planPause([schedule("a", "2026-09-01")], TODAY, "2026-10-12");
    assert.equal(ops[0].type, "insert");
  });
});

describe("planResume e pauseState", () => {
  it("pausa indefinida: retomar recria a agenda a partir de hoje", () => {
    const paused = apply([schedule("a", "2026-09-01")], planPause([schedule("a", "2026-09-01")], TODAY, null));
    assert.deepEqual(pauseState(paused, TODAY, true), { paused: true, resumesOn: null });

    const resumed = apply(paused, planResume(paused, TODAY));
    assert.equal(scheduled(resumed, TODAY), true);
    assert.equal(scheduled(resumed, "2026-10-07"), true);
    assert.equal(pauseState(resumed, TODAY, true).paused, false);
  });

  it("pausa com retorno: retomar antecipa a volta", () => {
    const list = [schedule("a", "2026-09-01")];
    const paused = apply(list, planPause(list, TODAY, "2026-10-20"));
    assert.deepEqual(pauseState(paused, TODAY, true), { paused: true, resumesOn: "2026-10-21" });

    const resumed = apply(paused, planResume(paused, TODAY));
    assert.equal(scheduled(resumed, TODAY), true);
    assert.equal(resumed.length, paused.length);
  });

  it("sem pausa não há o que retomar; arquivado não conta como pausado", () => {
    const list = [schedule("a", "2026-09-01")];
    assert.deepEqual(planResume(list, TODAY), []);
    assert.equal(pauseState(list, TODAY, true).paused, false);
    assert.equal(pauseState([schedule("a", "2026-09-01", "2026-10-01")], TODAY, false).paused, false);
  });
});

describe("efeito da pausa em pontuação e sequência", () => {
  it("dias pausados não entram no score nem quebram a sequência", () => {
    // diário desde 20/09; feito de 20 a 27/09 e de 01 a 07/10; pausa de 28/09 a 30/09
    const base = habit("h", { schedule_type: "daily" }, "2026-09-20");
    const list = [schedule("a", "2026-09-20")];
    const paused = apply(list, planPause(list, "2026-09-28", "2026-09-30"));
    base.habit_schedules = paused;

    const done = [
      ...["20", "21", "22", "23", "24", "25", "26", "27"].map((d) => `2026-09-${d}`),
      ...["01", "02", "03", "04", "05", "06", "07"].map((d) => `2026-10-${d}`),
    ];
    const logs = logsOn("h", done);

    const days = periodDays("2026-10-07", 18); // 20/09 a 07/10
    const score = scoreForDays([base], logs, days, "2026-10-07");
    assert.deepEqual([score.scheduled, score.completed], [15, 15]);
    assert.equal(score.percent, 1);

    const streakLogs = new Map(done.map((d) => [d, logs.get(`h:${d}`)!] as const));
    assert.equal(computeStreak(base, streakLogs, "2026-10-07", 60).current, 15);
  });

  it("cota semanal: dias pausados reduzem a meta possível da semana", () => {
    // 3x por semana; semana de 28/09 a 04/10 com pausa de 29/09 a 04/10 (só segunda disponível)
    const quota = habit("q", { schedule_type: "x_per_week", frequency_target: 3 }, "2026-09-01");
    const list = [{ ...schedule("a", "2026-09-01"), schedule_type: "x_per_week" as const, frequency_target: 3 }];
    quota.habit_schedules = apply(list, planPause(list, "2026-09-29", "2026-10-04"));

    const week = periodDays("2026-10-04", 7);
    const score = scoreForDays([quota], logsOn("q", ["2026-09-28"]), week, "2026-10-05");
    // só 1 dia disponível: a meta efetiva é 1 e foi cumprida
    assert.deepEqual([score.scheduled, score.completed], [1, 1]);
  });
});
