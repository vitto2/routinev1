import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { challengeOf } from "@/lib/challenges";
import { periodDays } from "@/lib/progress/period";
import { habit, logsOn } from "./helpers";

function withChallenge(start: string, days: number, schedule = { schedule_type: "daily" as const }) {
  const h = habit("c", schedule, "2026-08-01");
  h.challenge_days = days;
  h.challenge_start_date = start;
  return h;
}

describe("desafios", () => {
  it("hábito sem desafio devolve null", () => {
    assert.equal(challengeOf(habit("x", { schedule_type: "daily" }), new Map(), "2026-10-08"), null);
  });

  it("desafio em andamento: dia atual, dias restantes e progresso", () => {
    // 30 dias começando em 01/10; hoje é 08/10 (dia 8); 6 dias feitos de 8
    const h = withChallenge("2026-10-01", 30);
    const done = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07"];
    const info = challengeOf(h, logsOn("c", done), "2026-10-08");

    assert.equal(info?.status, "active");
    assert.equal(info?.dayNumber, 8);
    assert.equal(info?.daysLeft, 22);
    assert.equal(info?.endDate, "2026-10-30");
    assert.equal(info?.completedDays, 6);
    assert.equal(info?.scheduledDays, 8);
    assert.equal(Math.round((info?.percent ?? 0) * 100), 75);
    assert.equal(info?.successful, false);
  });

  it("ainda não começou", () => {
    const info = challengeOf(withChallenge("2026-10-15", 21), new Map(), "2026-10-08");
    assert.equal(info?.status, "upcoming");
    assert.equal(info?.dayNumber, 0);
    assert.equal(info?.daysLeft, 21);
    assert.equal(info?.completedDays, 0);
  });

  it("encerrado com 80% ou mais é sucesso", () => {
    // 21 dias de 01/09 a 21/09; 18 feitos (85,7%)
    const h = withChallenge("2026-09-01", 21);
    const done = periodDays("2026-09-21", 21).slice(0, 18);
    const info = challengeOf(h, logsOn("c", done), "2026-10-08");
    assert.equal(info?.status, "finished");
    assert.equal(info?.dayNumber, 21);
    assert.equal(info?.daysLeft, 0);
    assert.equal(info?.completedDays, 18);
    assert.equal(info?.successful, true);
  });

  it("encerrado abaixo de 80% não é sucesso", () => {
    const h = withChallenge("2026-09-01", 21);
    const done = periodDays("2026-09-21", 21).slice(0, 10);
    assert.equal(challengeOf(h, logsOn("c", done), "2026-10-08")?.successful, false);
  });

  it("dias programados só contam os dias do hábito (seg/qua/sex)", () => {
    // 14 dias a partir de segunda 28/09; seg/qua/sex = 6 dias programados na janela
    const h = withChallenge("2026-09-28", 14, { schedule_type: "weekdays" as never });
    h.habit_schedules[0].schedule_type = "weekdays";
    h.habit_schedules[0].weekdays = [1, 3, 5];
    const info = challengeOf(h, logsOn("c", ["2026-09-28", "2026-09-30", "2026-10-02"]), "2026-10-12");
    assert.equal(info?.status, "finished");
    assert.equal(info?.scheduledDays, 6);
    assert.equal(info?.completedDays, 3);
  });
});
