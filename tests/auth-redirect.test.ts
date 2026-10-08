import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath (proteção contra open redirect)", () => {
  it("aceita caminhos do próprio app", () => {
    assert.equal(safeNextPath("/today"), "/today");
    assert.equal(safeNextPath("/day/2026-10-08?x=1#a"), "/day/2026-10-08?x=1#a");
    assert.equal(safeNextPath("/progress/calendar?m=2026-09"), "/progress/calendar?m=2026-09");
  });

  it("usa o padrão quando vazio ou ausente", () => {
    assert.equal(safeNextPath(null), "/today");
    assert.equal(safeNextPath(undefined), "/today");
    assert.equal(safeNextPath(""), "/today");
    assert.equal(safeNextPath("", "/week"), "/week");
  });

  it("rejeita destinos externos e truques conhecidos", () => {
    const attacks = [
      "https://evil.com",
      "http://evil.com/x",
      "//evil.com",
      "///evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "evil.com",
      "javascript:alert(1)",
      "/\t/evil.com",
      "/\n/evil.com",
      "today",
    ];
    for (const attack of attacks) {
      assert.equal(safeNextPath(attack), "/today", JSON.stringify(attack));
    }
  });
});
