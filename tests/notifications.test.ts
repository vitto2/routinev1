import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIGEST_HOURS,
  EVENING_HOURS,
  inWindow,
  isHabitReminderDue,
  isTaskReminderDue,
  localMoment,
  timeToMinutes,
} from "@/lib/notifications/schedule";

describe("momento local", () => {
  it("23:50 em São Paulo continua no mesmo dia (UTC já virou)", () => {
    const m = localMoment(new Date("2026-10-02T02:50:00Z"), "America/Sao_Paulo");
    assert.equal(m.date, "2026-10-01");
    assert.equal(m.minutes, 23 * 60 + 50);
  });

  it("o mesmo instante em Tóquio já é outro dia", () => {
    assert.equal(localMoment(new Date("2026-10-02T02:50:00Z"), "Asia/Tokyo").date, "2026-10-02");
  });
});

describe("janelas de lembrete", () => {
  it("resumo da manhã 09h-20h e noite 18h-22h", () => {
    assert.equal(inWindow(8, DIGEST_HOURS), false);
    assert.equal(inWindow(9, DIGEST_HOURS), true);
    assert.equal(inWindow(20, DIGEST_HOURS), false);
    assert.equal(inWindow(17, EVENING_HOURS), false);
    assert.equal(inWindow(21, EVENING_HOURS), true);
  });

  it("tarefa às 15:00 avisa de 14:45 até 15:59", () => {
    const task = { due_date: "2026-10-01", due_time: "15:00:00" };
    const at = (iso: string) => localMoment(new Date(iso), "America/Sao_Paulo");
    assert.equal(isTaskReminderDue(task, at("2026-10-01T17:44:00Z")), false);
    assert.equal(isTaskReminderDue(task, at("2026-10-01T17:45:00Z")), true);
    assert.equal(isTaskReminderDue(task, at("2026-10-01T18:59:00Z")), true);
    assert.equal(isTaskReminderDue(task, at("2026-10-01T19:00:00Z")), false);
    assert.equal(
      isTaskReminderDue({ ...task, due_date: "2026-10-02" }, at("2026-10-01T18:00:00Z")),
      false,
    );
  });

  it("converte HH:MM em minutos", () => {
    assert.equal(timeToMinutes("07:05"), 425);
  });
});

describe("lembrete por hábito", () => {
  const at = (iso: string) => localMoment(new Date(iso), "America/Sao_Paulo");

  it("dispara no horário e até 1h depois, nunca antes", () => {
    // lembrete às 18:30 (hora de São Paulo = 21:30 UTC)
    assert.equal(isHabitReminderDue("18:30:00", at("2026-10-08T21:29:00Z")), false);
    assert.equal(isHabitReminderDue("18:30:00", at("2026-10-08T21:30:00Z")), true);
    assert.equal(isHabitReminderDue("18:30", at("2026-10-08T22:29:00Z")), true);
    assert.equal(isHabitReminderDue("18:30", at("2026-10-08T22:30:00Z")), false);
  });

  it("respeita o fuso do usuário", () => {
    // 21:30 UTC é 06:30 em Tóquio do dia seguinte: lembrete das 18:30 não dispara
    const tokyo = localMoment(new Date("2026-10-08T21:30:00Z"), "Asia/Tokyo");
    assert.equal(isHabitReminderDue("18:30", tokyo), false);
  });
});
