import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { monthlySeries, seriesTrend, weeklySeries, type SeriesPoint } from "@/lib/progress/series";
import { GREAT_FROM, buildMonthGrid, levelFor } from "@/lib/progress/calendar";
import { buildWeeklyReview } from "@/lib/progress/review";
import { routineStreak } from "@/lib/progress/routine";
import { habit, logsOn, mergeLogs } from "./helpers";

// Hoje: quinta 2026-10-08. Semana atual: 05/10 a 11/10.
const TODAY = "2026-10-08";

const point = (percent: number | null, partial = false): SeriesPoint => ({
  key: "k",
  label: "l",
  detail: "d",
  percent,
  scheduled: percent === null ? 0 : 10,
  completed: percent === null ? 0 : Math.round(percent * 10),
  partial,
});

describe("séries semanais e mensais", () => {
  const daily = habit("agua", { schedule_type: "daily" }, "2026-08-01");

  it("calcula cada semana e marca a atual como parcial", () => {
    const logs = mergeLogs(
      // semana 14/09 a 20/09: tudo feito
      logsOn("agua", [
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
        "2026-09-19",
        "2026-09-20",
      ]),
      // semana 21/09 a 27/09: 3 de 7
      logsOn("agua", ["2026-09-21", "2026-09-22", "2026-09-23"]),
    );
    const series = weeklySeries([daily], logs, TODAY, 4);

    assert.equal(series.length, 4);
    assert.deepEqual(
      series.map((p) => p.key),
      ["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"],
    );
    assert.equal(series[0].percent, 1);
    assert.equal(Math.round((series[1].percent ?? 0) * 100), 43);
    assert.equal(series[2].percent, 0);
    assert.equal(series[3].partial, true);
    assert.equal(series[0].partial, false);
  });

  it("período sem hábito programado vira null, não 0%", () => {
    const late = habit("novo", { schedule_type: "daily" }, "2026-10-06");
    const series = weeklySeries([late], new Map(), TODAY, 3);
    assert.equal(series[0].percent, null);
    assert.equal(series[1].percent, null);
    assert.notEqual(series[2].percent, null);
  });

  it("séries mensais usam o nome do mês", () => {
    const series = monthlySeries([daily], new Map(), TODAY, 3);
    assert.deepEqual(
      series.map((p) => p.label),
      ["ago", "set", "out"],
    );
    assert.equal(series[2].partial, true);
  });
});

describe("tendência", () => {
  it("detecta alta, queda e estabilidade", () => {
    assert.equal(seriesTrend([point(0.3), point(0.5), point(0.7), point(0.9)]).direction, "up");
    assert.equal(seriesTrend([point(0.9), point(0.7), point(0.5), point(0.3)]).direction, "down");
    assert.equal(seriesTrend([point(0.6), point(0.61), point(0.6), point(0.6)]).direction, "flat");
  });

  it("não afirma nada com poucos dados e ignora o período parcial", () => {
    assert.equal(seriesTrend([point(0.3), point(0.9)]).direction, "unknown");
    assert.equal(seriesTrend([point(null), point(null), point(0.5)]).direction, "unknown");
    // o último ponto (parcial, muito baixo) não deve virar "queda"
    assert.equal(
      seriesTrend([point(0.6), point(0.6), point(0.6), point(0.0, true)]).direction,
      "flat",
    );
  });

  it("informa a variação média em pontos percentuais", () => {
    assert.equal(seriesTrend([point(0.2), point(0.4), point(0.6)]).pointsPerPeriod, 20);
  });
});

describe("calendário mensal", () => {
  const daily = habit("agua", { schedule_type: "daily" }, "2026-09-01");

  it("faixas de desempenho", () => {
    assert.equal(levelFor(null), "none");
    assert.equal(levelFor(1), "great");
    assert.equal(levelFor(GREAT_FROM), "great");
    assert.equal(levelFor(0.79), "partial");
    assert.equal(levelFor(0.4), "partial");
    assert.equal(levelFor(0.39), "low");
    assert.equal(levelFor(0), "low");
  });

  it("monta a grade de outubro de 2026 (dia 1 é quinta)", () => {
    const grid = buildMonthGrid("2026-10", TODAY, [daily], new Map());
    assert.equal(grid.weeks.length, 5);
    assert.ok(grid.weeks.every((w) => w.length === 7));
    assert.deepEqual(grid.weeks[0].slice(0, 3), [null, null, null]);
    assert.equal(grid.weeks[0][3]?.day, 1);
    assert.equal(grid.weeks[4][5]?.day, 31);
    assert.equal(grid.weeks[4][6], null);
  });

  it("dias futuros ficam desabilitados e hoje é marcado", () => {
    const grid = buildMonthGrid("2026-10", TODAY, [daily], new Map());
    const cells = grid.weeks.flat().filter((c) => c !== null);
    assert.equal(cells.find((c) => c.date === "2026-10-09")?.level, "future");
    assert.equal(cells.find((c) => c.date === TODAY)?.isToday, true);
    assert.equal(cells.find((c) => c.date === "2026-10-02")?.level, "low");
  });

  it("conta dias perfeitos e o score do mês", () => {
    const logs = logsOn("agua", ["2026-10-01", "2026-10-02", "2026-10-03"]);
    const grid = buildMonthGrid("2026-10", TODAY, [daily], logs);
    assert.equal(grid.perfectDays, 3);
    assert.equal(grid.scoredDays, 8);
    assert.deepEqual([grid.month.scheduled, grid.month.completed], [8, 3]);
  });

  it("mês passado completo não tem células futuras", () => {
    const grid = buildMonthGrid("2026-09", TODAY, [daily], new Map());
    assert.equal(
      grid.weeks.flat().some((c) => c?.level === "future"),
      false,
    );
  });
});

describe("rotina em dia", () => {
  const a = habit("a", { schedule_type: "daily" }, "2026-09-01");
  const b = habit("b", { schedule_type: "daily" }, "2026-09-01");

  it("conta dias seguidos com 80% ou mais e hoje pendente não quebra", () => {
    // 05, 06 e 07/10 com os dois hábitos; hoje (08/10) ainda sem nada
    const days = ["2026-10-05", "2026-10-06", "2026-10-07"];
    const logs = mergeLogs(logsOn("a", days), logsOn("b", days));
    const streak = routineStreak([a, b], logs, TODAY, 60);
    assert.equal(streak.current, 3);
    assert.equal(streak.best, 3);
  });

  it("um dia abaixo de 80% quebra a sequência", () => {
    // 06/10 só com um dos dois hábitos (50%)
    const logs = mergeLogs(
      logsOn("a", ["2026-10-05", "2026-10-06", "2026-10-07"]),
      logsOn("b", ["2026-10-05", "2026-10-07"]),
    );
    const streak = routineStreak([a, b], logs, TODAY, 60);
    assert.equal(streak.current, 1);
    assert.equal(streak.best, 1);
  });

  it("dias sem hábito programado são neutros", () => {
    const gym = habit("gym", { schedule_type: "weekdays", weekdays: [1, 4] }, "2026-09-01");
    // segunda 05/10 e quinta 08/10 (hoje) são os dias programados; terça a quarta não contam
    const streak = routineStreak([gym], logsOn("gym", ["2026-10-05", "2026-10-08"]), TODAY, 30);
    assert.equal(streak.current >= 2, true);
  });
});

describe("revisão semanal", () => {
  // semana de 28/09 a 04/10, revisada na segunda 05/10
  const weekStart = "2026-09-28";
  const NEXT_DAY = "2026-10-05";

  it("resume score, melhor e pior dia e dias perfeitos", () => {
    const a = habit("a", { schedule_type: "daily" }, "2026-08-01");
    const b = habit("b", { schedule_type: "daily" }, "2026-08-01");
    const logs = mergeLogs(
      logsOn("a", ["2026-09-28", "2026-09-29", "2026-09-30"]),
      logsOn("b", ["2026-09-28", "2026-09-29"]),
    );
    const review = buildWeeklyReview([a, b], logs, weekStart, NEXT_DAY);

    assert.equal(review.ended, true);
    assert.deepEqual([review.score.scheduled, review.score.completed], [14, 5]);
    assert.equal(review.perfectDays, 2);
    assert.equal(review.bestDay?.percent, 1);
    assert.equal(review.worstDay?.percent, 0);
    assert.equal(review.strongest?.habitId, "a");
    assert.equal(review.weakest?.habitId, "b");
  });

  it("hábito com poucos dias programados não vira o 'mais difícil'", () => {
    const a = habit("a", { schedule_type: "daily" }, "2026-08-01");
    const b = habit("b", { schedule_type: "daily" }, "2026-08-01");
    // criado no último dia da semana: só 1 dia programado e nenhum registro (0%)
    const novo = habit("novo", { schedule_type: "daily" }, "2026-10-04");
    const logs = mergeLogs(
      logsOn("a", ["2026-09-28", "2026-09-29", "2026-09-30"]),
      logsOn("b", ["2026-09-28", "2026-09-29"]),
    );
    const review = buildWeeklyReview([a, b, novo], logs, weekStart, NEXT_DAY);

    assert.equal(review.strongest?.habitId, "a");
    assert.equal(review.weakest?.habitId, "b");
  });

  it("com empate entre os hábitos, ninguém é 'mais constante' nem 'mais difícil'", () => {
    const a = habit("a", { schedule_type: "daily" }, "2026-08-01");
    const b = habit("b", { schedule_type: "daily" }, "2026-08-01");
    const logs = mergeLogs(
      logsOn("a", ["2026-09-28", "2026-09-29"]),
      logsOn("b", ["2026-09-30", "2026-10-01"]),
    );
    const review = buildWeeklyReview([a, b], logs, weekStart, NEXT_DAY);

    assert.equal(review.strongest, null);
    assert.equal(review.weakest, null);
  });

  it("elogia uma semana excelente e a melhora sobre a anterior", () => {
    const a = habit("a", { schedule_type: "daily" }, "2026-08-01");
    const all = [
      "2026-09-21",
      "2026-09-22", // semana anterior: 2 de 7
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ];
    const review = buildWeeklyReview([a], logsOn("a", all), weekStart, NEXT_DAY);
    assert.equal(review.score.percent, 1);
    assert.equal(review.deltaPoints, 71);
    assert.ok(review.suggestions.some((s) => s.kind === "praise"));
  });

  it("sugere ajuste quando um hábito fica abaixo de 50% por 3 semanas", () => {
    const hard = habit("ingles", { schedule_type: "daily" }, "2026-08-01");
    const logs = logsOn("ingles", ["2026-09-14", "2026-09-21", "2026-09-28"]);
    const review = buildWeeklyReview([hard], logs, weekStart, NEXT_DAY);
    assert.ok(
      review.suggestions.some((s) => s.kind === "tip" && s.text.includes("3 semanas seguidas")),
    );
  });

  it("não inventa sugestão sem dados e limita a 3", () => {
    const review = buildWeeklyReview([], new Map(), weekStart, NEXT_DAY);
    assert.equal(review.score.percent, null);
    assert.equal(review.suggestions[0]?.kind, "info");
    assert.ok(review.suggestions.length <= 3);
  });
});
