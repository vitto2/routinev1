import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeDays,
  bestAndWorstWeekday,
  daysSince,
  habitPeriodStats,
  periodDays,
  taskStats,
  weekdayPattern,
} from "@/lib/progress/period";
import {
  formatHabitValue,
  formatMinutes,
  formatVolume,
  pluralize,
  relativeDays,
} from "@/lib/format";
import { habit, logValue, logsOn, mergeLogs } from "./helpers";

const TODAY = "2026-10-08"; // quinta
const week = periodDays(TODAY, 7); // 02/10 (sex) a 08/10 (qui)

describe("período", () => {
  it("lista os dias do mais antigo até hoje", () => {
    assert.equal(week.length, 7);
    assert.equal(week[0], "2026-10-02");
    assert.equal(week[6], TODAY);
  });
});

describe("estatísticas de hábito de dia fixo", () => {
  const agua = habit("agua", { schedule_type: "daily" }, "2026-09-01");

  it("conta vezes feitas, perdidas, sequência e última vez", () => {
    const logs = logsOn("agua", ["2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"]);
    const stats = habitPeriodStats(agua, logs, week, TODAY);

    assert.equal(stats.kind, "fixed");
    assert.equal(stats.timesDone, 4);
    assert.equal(stats.scheduledDays, 7);
    assert.equal(stats.missed, 2); // 04/10 e 07/10 (hoje ainda não conta como perdido)
    assert.equal(stats.bestRun, 2);
    assert.equal(stats.lastDone, "2026-10-06");
    assert.equal(stats.perWeek, 4);
    assert.deepEqual(
      stats.strip.map((c) => c.state),
      ["done", "done", "missed", "done", "done", "missed", "pending"],
    );
    assert.equal(daysSince(stats.lastDone, TODAY), 2);
  });

  it("hoje concluído entra como feito e não como pendente", () => {
    const stats = habitPeriodStats(agua, logsOn("agua", [TODAY]), week, TODAY);
    assert.equal(stats.strip[6].state, "done");
    assert.equal(stats.timesDone, 1);
  });

  it("dias não programados ficam fora (academia seg/qui)", () => {
    const gym = habit("gym", { schedule_type: "weekdays", weekdays: [1, 4] }, "2026-09-01");
    const stats = habitPeriodStats(gym, logsOn("gym", ["2026-10-05"]), week, TODAY);
    // segunda 05/10 feita; quinta 08/10 é hoje (pendente)
    assert.equal(stats.timesDone, 1);
    assert.equal(stats.scheduledDays, 2);
    assert.equal(stats.missed, 0);
    assert.equal(stats.strip.filter((c) => c.state === "off").length, 5);
  });

  it("soma valores de quantidade e calcula a média por dia com registro", () => {
    const water = habit("water", { schedule_type: "daily" }, "2026-09-01");
    water.tracking_type = "quantity";
    water.target_value = 3000;
    water.target_unit = "ml";
    const logs = new Map([
      logValue("water", "2026-10-06", 2000, false),
      logValue("water", "2026-10-07", 3000, true),
    ]);
    const stats = habitPeriodStats(water, logs, week, TODAY);
    assert.equal(stats.totalValue, 5000);
    assert.equal(stats.averageValue, 2500);
    assert.equal(stats.timesDone, 1);
  });

  it("progresso abaixo da meta aparece como parcial, não como perdido", () => {
    const water = habit("water", { schedule_type: "daily" }, "2026-09-01");
    water.tracking_type = "quantity";
    water.target_value = 3000;
    water.target_unit = "ml";
    const logs = new Map([
      logValue("water", "2026-10-06", 2000, false),
      logValue("water", "2026-10-07", 3000, true),
    ]);
    const stats = habitPeriodStats(water, logs, week, TODAY);
    assert.equal(stats.strip[4].state, "partial"); // 06/10
    assert.equal(stats.partialDays, 1);
    assert.equal(stats.missed, 4); // 02, 03, 04 e 05/10 sem nenhum registro
    assert.equal(stats.strip[6].state, "pending"); // hoje, sem registro
  });

  it("hábito de marcar não tem total de valor", () => {
    assert.equal(habitPeriodStats(agua, new Map(), week, TODAY).totalValue, null);
  });
});

describe("estatísticas de cota semanal", () => {
  const quota = habit("run", { schedule_type: "x_per_week", frequency_target: 3 }, "2026-09-01");

  it("dias sem registro ficam em aberto, nunca perdidos", () => {
    const stats = habitPeriodStats(quota, logsOn("run", ["2026-10-03", "2026-10-06"]), week, TODAY);
    assert.equal(stats.kind, "quota");
    assert.equal(stats.weeklyTarget, 3);
    assert.equal(stats.timesDone, 2);
    assert.equal(stats.missed, 0);
    assert.equal(stats.strip.some((c) => c.state === "missed"), false);
    assert.equal(stats.strip.filter((c) => c.state === "open").length, 4);
    assert.equal(stats.strip[6].state, "pending");
  });
});

describe("padrão por dia da semana", () => {
  const daily = habit("d", { schedule_type: "daily" }, "2026-09-01");
  const days = periodDays(TODAY, 14); // 25/09 (sex) a 08/10 (qui)

  it("agrega por dia da semana e identifica melhor e pior", () => {
    // só as segundas (28/09 e 05/10) foram feitas
    const logs = logsOn("d", ["2026-09-28", "2026-10-05"]);
    const stats = weekdayPattern([daily], logs, days, TODAY);
    const monday = stats[1];
    const tuesday = stats[2];
    assert.equal(monday.scheduled, 2);
    assert.equal(monday.percent, 1);
    assert.equal(tuesday.percent, 0);

    const { best, worst } = bestAndWorstWeekday(stats, 2);
    assert.equal(best?.weekday, 1);
    assert.notEqual(worst?.weekday, 1);
  });

  it("sem dados suficientes não compara", () => {
    const stats = weekdayPattern([daily], new Map(), periodDays(TODAY, 3), TODAY);
    const { best, worst } = bestAndWorstWeekday(stats, 3);
    assert.equal(best, null);
    assert.equal(worst, null);
  });

  it("conta dias ativos", () => {
    const logs = mergeLogs(logsOn("d", ["2026-10-02", "2026-10-03"]));
    assert.equal(activeDays([daily], logs, week, TODAY), 2);
  });
});

describe("estatísticas de tarefas", () => {
  it("separa concluídas, atrasadas e abertas de hoje", () => {
    const stats = taskStats(
      [
        { due_date: "2026-10-01", completed: true, priority: "high" },
        { due_date: "2026-10-02", completed: false, priority: "high" },
        { due_date: "2026-10-05", completed: true, priority: "low" },
        { due_date: "2026-10-08", completed: false, priority: "medium" },
      ],
      TODAY,
    );
    assert.equal(stats.total, 4);
    assert.equal(stats.completed, 2);
    assert.equal(stats.overdue, 1);
    assert.equal(stats.openToday, 1);
    assert.equal(stats.rate, 0.5);
    assert.deepEqual(stats.byPriority.high, { total: 2, completed: 1 });
  });

  it("sem tarefas não há taxa", () => {
    assert.equal(taskStats([], TODAY).rate, null);
  });
});

describe("formatação", () => {
  it("tempo e volume", () => {
    assert.equal(formatMinutes(45), "45 min");
    assert.equal(formatMinutes(120), "2 h");
    assert.equal(formatMinutes(90), "1 h 30 min");
    assert.equal(formatVolume(250), "250 ml");
    assert.equal(formatVolume(2500), "2,5 L");
    assert.equal(formatHabitValue(60, "min"), "1 h");
    assert.equal(formatHabitValue(3000, "ml"), "3 L");
  });

  it("datas relativas e plural", () => {
    assert.equal(relativeDays(0), "hoje");
    assert.equal(relativeDays(1), "ontem");
    assert.equal(relativeDays(4), "há 4 dias");
    assert.equal(pluralize(1, "vez", "vezes"), "1 vez");
    assert.equal(pluralize(3, "vez", "vezes"), "3 vezes");
  });
});
