import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOM, neutralizeFormula, safeFilename, toCsv } from "@/lib/export/csv";

describe("csv", () => {
  it("começa com BOM e termina linhas com CRLF", () => {
    const csv = toCsv(["a", "b"], [["1", "2"]]);
    assert.ok(csv.startsWith(BOM));
    assert.equal(csv, `${BOM}a;b\r\n1;2\r\n`);
  });

  it("escapa aspas, vírgulas, ponto e vírgula e quebras de linha", () => {
    const csv = toCsv(["nota"], [['disse "oi", ok'], ["linha1\nlinha2"], ["a;b"]]);
    assert.equal(csv, `${BOM}nota\r\n"disse ""oi"", ok"\r\n"linha1\nlinha2"\r\n"a;b"\r\n`);
  });

  it("converte boolean, null e números", () => {
    assert.equal(
      toCsv(["x", "y", "z", "w"], [[true, false, null, 2500]]),
      `${BOM}x;y;z;w\r\nsim;não;;2500\r\n`,
    );
    // decimal com vírgula, como o Excel em português espera
    assert.equal(toCsv(["n"], [[2.5]]), `${BOM}n\r\n2,5\r\n`);
    assert.equal(toCsv(["n"], [[-5]]), `${BOM}n\r\n-5\r\n`);
    assert.equal(toCsv(["n"], [[Number.NaN]]), `${BOM}n\r\n\r\n`);
  });

  it("neutraliza fórmulas em texto (injeção de CSV)", () => {
    for (const text of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tx", "\rx"]) {
      assert.equal(neutralizeFormula(text), `'${text}`, JSON.stringify(text));
    }
    assert.equal(neutralizeFormula("Beber água"), "Beber água");
    assert.equal(neutralizeFormula("2026-10-08"), "2026-10-08");
    assert.match(toCsv(["h"], [["=HYPERLINK(\"http://x\")"]]), /'=HYPERLINK/);
  });

  it("gera nomes de arquivo seguros", () => {
    assert.equal(safeFilename("routine registros 2026-10-08", "csv"), "routine-registros-2026-10-08.csv");
    assert.equal(safeFilename("ação/../etc", "csv"), "acao-.-etc.csv");
    assert.equal(safeFilename("???", "csv"), "arquivo.csv");
  });
});
