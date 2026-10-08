import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDaysISO,
  addMonths,
  daysInMonth,
  daysOfMonth,
  isValidMonth,
  monthEnd,
  monthLabel,
  monthOf,
  weekRangeOf,
} from "@/lib/dates";

describe("meses", () => {
  it("valida o formato AAAA-MM", () => {
    assert.equal(isValidMonth("2026-10"), true);
    assert.equal(isValidMonth("2026-13"), false);
    assert.equal(isValidMonth("2026-1"), false);
    assert.equal(isValidMonth("abc"), false);
  });

  it("conta dias, inclusive fevereiro bissexto", () => {
    assert.equal(daysInMonth("2026-10"), 31);
    assert.equal(daysInMonth("2026-02"), 28);
    assert.equal(daysInMonth("2028-02"), 29);
    assert.equal(monthEnd("2026-09"), "2026-09-30");
    assert.equal(daysOfMonth("2026-02").length, 28);
  });

  it("soma e subtrai meses atravessando o ano", () => {
    assert.equal(addMonths("2026-10", 1), "2026-11");
    assert.equal(addMonths("2026-12", 1), "2027-01");
    assert.equal(addMonths("2026-01", -1), "2025-12");
    assert.equal(addMonths("2026-03", -14), "2025-01");
    assert.equal(addMonths("2026-10", 0), "2026-10");
  });

  it("nome do mês em português", () => {
    assert.equal(monthLabel("2026-03"), "março de 2026");
    assert.equal(monthOf("2026-10-08"), "2026-10");
  });
});

describe("semana começa na segunda", () => {
  it("domingo pertence à semana que começou na segunda anterior", () => {
    const week = weekRangeOf("2026-10-04"); // domingo
    assert.equal(week.start, "2026-09-28");
    assert.equal(week.end, "2026-10-04");
    assert.equal(addDaysISO(week.end, 1), "2026-10-05");
  });
});
