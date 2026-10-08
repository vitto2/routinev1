import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeStreak, dailyScore, scoreForDays } from "@/lib/scoring";
import { isScheduledOn } from "@/lib/scheduling";
import { weekRangeOf } from "@/lib/dates";
import type { HabitLog } from "@/types/domain";
import { habit, log } from "./helpers";

// Semana de segunda 2026-09-28 a domingo 2026-10-04; "hoje" costuma ser quinta 2026-10-01.
const week = weekRangeOf("2026-10-01").days;

describe("score por período", () => {
  it("ignora dias futuros da semana corrente", () => {
    const daily = habit("agua", { schedule_type: "daily" });
    const logs = new Map([log("agua", "2026-09-28"), log("agua", "2026-09-29")]);
    const s = scoreForDays([daily], logs, week, "2026-10-01");
    assert.deepEqual([s.scheduled, s.completed], [4, 2]);
  });

  it("dias não programados não entram no denominador", () => {
    const gym = habit("gym", { schedule_type: "weekdays", weekdays: [1, 2, 4, 5] });
    const s = scoreForDays([gym], new Map([log("gym", "2026-09-28")]), week, "2026-10-01");
    assert.equal(s.scheduled, 3);
    assert.equal(isScheduledOn(gym.habit_schedules, "2026-09-30"), false);
  });

  it("hábito criado à noite (UTC já no dia seguinte) vale no dia local de início", () => {
    const late = habit("late", { schedule_type: "daily" }, "2026-09-30");
    assert.equal(dailyScore([late], new Map(), "2026-09-30").scheduled, 1);
    assert.equal(dailyScore([late], new Map(), "2026-09-29").scheduled, 0);
  });
});

describe("cota semanal (X vezes por semana)", () => {
  const quota = habit("run", { schedule_type: "x_per_week", frequency_target: 3 });

  it("semana em andamento com tempo de sobra não penaliza", () => {
    const s = scoreForDays([quota], new Map(), week, "2026-10-01");
    assert.deepEqual([s.scheduled, s.completed], [0, 0]);
  });

  it("conta só o que já é impossível de cumprir", () => {
    const s = scoreForDays([quota], new Map(), week, "2026-10-03");
    assert.deepEqual([s.scheduled, s.completed], [1, 0]);
  });

  it("semana encerrada usa a meta cheia", () => {
    const logs = new Map([log("run", "2026-09-28"), log("run", "2026-09-30")]);
    const s = scoreForDays([quota], logs, week, "2026-10-05");
    assert.deepEqual([s.scheduled, s.completed], [3, 2]);
  });

  it("não entra no score diário", () => {
    assert.equal(dailyScore([quota], new Map<string, HabitLog>(), "2026-10-01").scheduled, 0);
  });
});

describe("streaks", () => {
  it("hoje pendente não quebra a sequência em andamento", () => {
    const daily = habit("agua", { schedule_type: "daily" });
    const logs = new Map(
      ["2026-09-29", "2026-09-30"].map((d) => [d, log("agua", d)[1]] as [string, HabitLog]),
    );
    const s = computeStreak(daily, logs, "2026-10-01");
    assert.equal(s.current, 2);
    assert.equal(s.best, 2);
  });

  it("dia programado sem registro quebra", () => {
    const daily = habit("agua", { schedule_type: "daily" });
    const logs = new Map([["2026-09-28", log("agua", "2026-09-28")[1]] as [string, HabitLog]]);
    const s = computeStreak(daily, logs, "2026-10-01");
    assert.equal(s.current, 0);
    assert.equal(s.best, 1);
  });

  it("dia não programado não quebra (academia seg/ter/qui/sex)", () => {
    const gym = habit("gym", { schedule_type: "weekdays", weekdays: [1, 2, 4, 5] });
    const logs = new Map(
      ["2026-09-28", "2026-09-29", "2026-10-01"].map(
        (d) => [d, log("gym", d)[1]] as [string, HabitLog],
      ),
    );
    assert.equal(computeStreak(gym, logs, "2026-10-01").current, 3);
  });
});
