import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCompletedByValue, validateLogDate, validateLogValue } from "@/lib/logging/rules";
import { celebrationMessage, formatStreak, milestoneCrossed } from "@/lib/gamification";

describe("validateLogDate", () => {
  const today = "2026-10-08";

  it("aceita hoje e dias passados", () => {
    assert.equal(validateLogDate("2026-10-08", today), null);
    assert.equal(validateLogDate("2026-10-01", today), null);
  });

  it("recusa futuro, formato inválido e datas inexistentes", () => {
    assert.ok(validateLogDate("2026-10-09", today));
    assert.ok(validateLogDate("08/10/2026", today));
    assert.ok(validateLogDate("2026-02-31", today));
    assert.ok(validateLogDate("", today));
  });

  it("recusa datas antigas demais (mais de 400 dias)", () => {
    assert.ok(validateLogDate("2025-01-01", today));
    assert.equal(validateLogDate("2025-09-10", today), null);
  });
});

describe("valores de registro", () => {
  it("valida números", () => {
    assert.equal(validateLogValue(0), null);
    assert.equal(validateLogValue(2500), null);
    assert.ok(validateLogValue(-1));
    assert.ok(validateLogValue(Number.NaN));
    assert.ok(validateLogValue(1e9));
  });

  it("conclui quando atinge a meta (ou qualquer valor sem meta)", () => {
    assert.equal(isCompletedByValue(2999, 3000), false);
    assert.equal(isCompletedByValue(3000, 3000), true);
    assert.equal(isCompletedByValue(1, null), true);
    assert.equal(isCompletedByValue(0, null), false);
  });
});

describe("marcos de sequência", () => {
  it("só avisa quando cruza um marco", () => {
    assert.equal(milestoneCrossed(6, 7), 7);
    assert.equal(milestoneCrossed(7, 8), null);
    assert.equal(milestoneCrossed(7, 7), null);
    assert.equal(milestoneCrossed(0, 3), 3);
  });

  it("retorna o maior marco quando vários são cruzados de uma vez", () => {
    assert.equal(milestoneCrossed(2, 21), 21);
  });

  it("mensagens em português e no singular/plural", () => {
    assert.equal(formatStreak(1, "days"), "1 dia");
    assert.equal(formatStreak(2, "weeks"), "2 semanas");
    const msg = celebrationMessage("Inglês", 7, "days", { milestone: 7, newBest: false });
    assert.equal(msg?.description, "Inglês");
    assert.match(msg?.title ?? "", /semana/);
    assert.equal(celebrationMessage("x", 5, "days", { milestone: null, newBest: false }), null);
    assert.match(
      celebrationMessage("x", 5, "days", { milestone: null, newBest: true })?.title ?? "",
      /melhor sequência/,
    );
  });
});
