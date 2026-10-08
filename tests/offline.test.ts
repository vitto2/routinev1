import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngine } from "@/lib/offline/engine";
import { overlayHabitState, overlayTaskCompleted } from "@/lib/offline/overlay";
import {
  MAX_ATTEMPTS,
  MAX_PENDING,
  QueueFullError,
  RejectedError,
  bumpAttempts,
  classifyError,
  keyFor,
  parseStored,
  removeIfUnchanged,
  serialize,
  sortedEntries,
  upsertEntry,
  type PendingEntry,
  type PendingInput,
  type PendingMap,
} from "@/lib/offline/queue";

const completion = (habitId: string, completed: boolean, date = "2026-10-08"): PendingInput => ({
  kind: "habit-completion",
  habitId,
  date,
  completed,
});

describe("fila: estados absolutos por chave", () => {
  it("a última escrita na mesma chave vence", () => {
    let map: PendingMap = {};
    map = upsertEntry(map, completion("a", true), 1);
    map = upsertEntry(map, completion("a", false), 2);
    map = upsertEntry(map, completion("a", true), 3);

    const entries = sortedEntries(map);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].kind === "habit-completion" && entries[0].completed, true);
    assert.equal(entries[0].updatedAt, 3);
  });

  it("hábitos e dias diferentes não se misturam; marcar e valor compartilham a chave", () => {
    assert.notEqual(keyFor(completion("a", true)), keyFor(completion("b", true)));
    assert.notEqual(keyFor(completion("a", true, "2026-10-07")), keyFor(completion("a", true)));
    assert.equal(
      keyFor({ kind: "habit-value", habitId: "a", date: "2026-10-08", value: 5 }),
      keyFor(completion("a", true)),
    );
    assert.equal(keyFor({ kind: "task-completion", taskId: "t1", completed: true }), "t:t1");
  });

  it("ordena do mais antigo ao mais novo", () => {
    let map: PendingMap = {};
    map = upsertEntry(map, completion("b", true), 20);
    map = upsertEntry(map, completion("a", true), 10);
    assert.deepEqual(
      sortedEntries(map).map((e) => e.updatedAt),
      [10, 20],
    );
  });

  it("não aceita itens novos acima do limite, mas ainda atualiza os existentes", () => {
    let map: PendingMap = {};
    for (let i = 0; i < MAX_PENDING; i++) map = upsertEntry(map, completion(`h${i}`, true), i + 1);

    assert.throws(() => upsertEntry(map, completion("novo", true), 999), QueueFullError);
    assert.doesNotThrow(() => upsertEntry(map, completion("h0", false), 1000));
  });

  it("remove só se o item não mudou desde o envio", () => {
    const map = upsertEntry({}, completion("a", true), 5);
    assert.deepEqual(removeIfUnchanged(map, keyFor(completion("a", true)), 4), map);
    assert.deepEqual(removeIfUnchanged(map, keyFor(completion("a", true)), 5), {});
  });

  it("conta tentativas apenas do item certo", () => {
    const key = keyFor(completion("a", true));
    const map = upsertEntry({}, completion("a", true), 5);
    assert.equal(bumpAttempts(map, key, 5)[key].attempts, 1);
    assert.equal(bumpAttempts(map, key, 4)[key].attempts, 0);
  });
});

describe("fila: leitura do armazenamento", () => {
  it("ida e volta preserva os itens", () => {
    const map = upsertEntry({}, completion("a", true), 7);
    assert.deepEqual(parseStored(serialize(map)), map);
  });

  it("descarta lixo sem quebrar", () => {
    assert.deepEqual(parseStored(null), {});
    assert.deepEqual(parseStored("não é json"), {});
    assert.deepEqual(parseStored("[1,2,3]"), {});
    assert.deepEqual(parseStored('{"x":{"kind":"habit-completion"}}'), {});
  });

  it("mantém os válidos e descarta os inválidos", () => {
    const good = upsertEntry({}, completion("a", true), 1);
    const raw = JSON.parse(serialize(good)) as Record<string, unknown>;
    raw["h:x:2026-13-99"] = { kind: "habit-completion", key: "h:x:2026-13-99", habitId: "x", date: "13/99", completed: true, updatedAt: 1, attempts: 0 };
    raw["t:y"] = { kind: "task-completion", key: "chave-errada", taskId: "y", completed: true, updatedAt: 1, attempts: 0 };
    assert.deepEqual(Object.keys(parseStored(JSON.stringify(raw))), Object.keys(good));
  });
});

describe("classificação de erros", () => {
  it("sem conexão ou falha de fetch é rede (nunca descarta)", () => {
    assert.equal(classifyError(new Error("qualquer coisa"), false), "network");
    assert.equal(classifyError(new TypeError("Failed to fetch"), true), "network");
    assert.equal(classifyError(new Error("An unexpected response was received from the server."), true), "network");
    assert.equal(classifyError(new Error('Failed to find Server Action "abc"'), true), "network");
  });

  it("só a recusa explícita do servidor é definitiva", () => {
    assert.equal(classifyError(new RejectedError("Data inválida."), true), "permanent");
  });

  it("exceção no servidor (digest) não é recusa: pode ser o banco fora do ar", () => {
    const error = Object.assign(new Error("An error occurred in the Server Components render."), {
      digest: "123",
    });
    assert.equal(classifyError(error, true), "unknown");
  });

  it("o resto é desconhecido (tenta algumas vezes)", () => {
    assert.equal(classifyError(new Error("???"), true), "unknown");
    assert.equal(classifyError("texto solto", true), "unknown");
  });
});

// ---------------------------------------------------------------------------
// Motor de sincronização com dependências simuladas
// ---------------------------------------------------------------------------

function setup(options: { online?: boolean } = {}) {
  let map: PendingMap = {};
  let online = options.online ?? true;
  let clock = 1000;
  const sent: PendingEntry[] = [];
  const settled: PendingEntry[] = [];
  const failed: PendingEntry[] = [];
  const failures: unknown[] = [];
  let behavior: (entry: PendingEntry) => Promise<unknown> = async () => ({ ok: true });

  const store = {
    get: () => map,
    set: (next: PendingMap) => {
      map = next;
    },
  };

  const engine = createEngine({
    store,
    isOnline: () => online,
    now: () => clock++,
    send: async (entry) => {
      sent.push(entry);
      return behavior(entry);
    },
    onSettled: (entry) => settled.push(entry),
    onFailed: (entry, error) => {
      failed.push(entry);
      failures.push(error);
    },
  });

  return {
    engine,
    store,
    sent,
    settled,
    failed,
    failures,
    setOnline: (value: boolean) => {
      online = value;
    },
    setBehavior: (fn: typeof behavior) => {
      behavior = fn;
    },
  };
}

describe("motor: com internet", () => {
  it("envia na hora e deixa a fila vazia", async () => {
    const ctx = setup();
    const outcome = await ctx.engine.submit(completion("a", true));

    assert.equal(outcome.status, "saved");
    assert.equal(ctx.sent.length, 1);
    assert.deepEqual(ctx.store.get(), {});
  });

  it("devolve o resultado da ação (para avisos de sequência)", async () => {
    const ctx = setup();
    ctx.setBehavior(async () => ({ streak: 7 }));
    const outcome = await ctx.engine.submit(completion("a", true));
    assert.deepEqual(outcome.status === "saved" && outcome.result, { streak: 7 });
  });
});

describe("motor: sem internet", () => {
  it("guarda e envia depois, uma vez só (última escrita vence)", async () => {
    const ctx = setup({ online: false });

    const first = await ctx.engine.submit(completion("a", true));
    await ctx.engine.submit(completion("a", false));
    await ctx.engine.submit(completion("a", true));

    assert.equal(first.status, "queued");
    assert.equal(ctx.sent.length, 0);
    assert.equal(Object.keys(ctx.store.get()).length, 1);

    ctx.setOnline(true);
    const summary = await ctx.engine.flush();

    assert.equal(summary.sent, 1);
    assert.equal(summary.remaining, 0);
    assert.equal(ctx.sent.length, 1);
    assert.equal(ctx.sent[0].kind === "habit-completion" && ctx.sent[0].completed, true);
  });

  it("envia na ordem em que foram feitas", async () => {
    const ctx = setup({ online: false });
    await ctx.engine.submit(completion("b", true));
    await ctx.engine.submit(completion("a", true));
    await ctx.engine.submit({ kind: "task-completion", taskId: "t", completed: true });

    ctx.setOnline(true);
    await ctx.engine.flush();

    assert.deepEqual(
      ctx.sent.map((e) => e.key),
      ["h:b:2026-10-08", "h:a:2026-10-08", "t:t"],
    );
  });

  it("a conexão cair no meio mantém o que faltou, sem descartar nada", async () => {
    const ctx = setup({ online: false });
    await ctx.engine.submit(completion("a", true));
    await ctx.engine.submit(completion("b", true));
    await ctx.engine.submit(completion("c", true));
    ctx.setOnline(true);

    let calls = 0;
    ctx.setBehavior(async () => {
      calls += 1;
      if (calls === 2) throw new TypeError("Failed to fetch");
      return { ok: true };
    });

    const summary = await ctx.engine.flush();
    assert.equal(summary.sent, 1);
    assert.equal(summary.offline, true);
    assert.deepEqual(Object.keys(ctx.store.get()).sort(), ["h:b:2026-10-08", "h:c:2026-10-08"]);
    assert.equal(ctx.failed.length, 0);

    // volta a funcionar: o resto segue
    ctx.setBehavior(async () => ({ ok: true }));
    const retry = await ctx.engine.flush();
    assert.equal(retry.sent, 2);
    assert.deepEqual(ctx.store.get(), {});
  });

  it("queda de rede nunca esgota as tentativas, por mais longa que seja", async () => {
    const ctx = setup();
    ctx.setBehavior(async () => {
      throw new TypeError("Failed to fetch");
    });
    await ctx.engine.submit(completion("a", true));

    for (let i = 0; i < MAX_ATTEMPTS * 3; i++) await ctx.engine.flush();

    assert.equal(Object.keys(ctx.store.get()).length, 1);
    assert.equal(ctx.failed.length, 0);
  });
});

describe("motor: erros do servidor", () => {
  it("recusa explícita descarta o item e avisa com o motivo", async () => {
    const ctx = setup();
    ctx.setBehavior(async () => {
      throw new RejectedError("Este hábito não está programado para esse dia.");
    });

    const outcome = await ctx.engine.submit(completion("a", true));

    assert.equal(outcome.status, "failed");
    assert.equal(ctx.failed.length, 1);
    assert.equal((ctx.failures[0] as Error).message, "Este hábito não está programado para esse dia.");
    assert.deepEqual(ctx.store.get(), {});
  });

  it("exceção do servidor (banco fora do ar) não perde a marcação: guarda e envia quando voltar", async () => {
    const ctx = setup();
    ctx.setBehavior(async () => {
      throw Object.assign(new Error("An error occurred in the Server Components render."), {
        digest: "123",
      });
    });

    const outcome = await ctx.engine.submit(completion("a", true));
    assert.equal(outcome.status, "queued");
    assert.equal(ctx.failed.length, 0);
    assert.equal(Object.keys(ctx.store.get()).length, 1);

    ctx.setBehavior(async () => ({ ok: true }));
    const summary = await ctx.engine.flush();
    assert.equal(summary.sent, 1);
    assert.deepEqual(ctx.store.get(), {});
  });

  it("erro desconhecido tenta algumas vezes e então desiste", async () => {
    const ctx = setup();
    ctx.setBehavior(async () => {
      throw new Error("???");
    });

    const first = await ctx.engine.submit(completion("a", true));
    assert.equal(first.status, "queued");

    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await ctx.engine.flush();

    assert.deepEqual(ctx.store.get(), {});
    assert.equal(ctx.failed.length, 1);
    assert.equal(ctx.sent.length, MAX_ATTEMPTS);
  });

  it("um item com erro desconhecido não trava os outros", async () => {
    const ctx = setup({ online: false });
    await ctx.engine.submit(completion("ruim", true));
    await ctx.engine.submit(completion("bom", true));
    ctx.setOnline(true);

    ctx.setBehavior(async (entry) => {
      if (entry.key.includes("ruim")) throw new Error("???");
      return { ok: true };
    });

    await ctx.engine.flush();
    assert.deepEqual(Object.keys(ctx.store.get()), ["h:ruim:2026-10-08"]);
  });
});

describe("motor: alteração durante o envio", () => {
  it("não apaga o item mais novo; envia os dois, na ordem", async () => {
    const ctx = setup();
    let injected = false;

    ctx.setBehavior(async (entry) => {
      if (!injected) {
        injected = true;
        // O usuário toca de novo enquanto o primeiro envio está em andamento.
        ctx.store.set(upsertEntry(ctx.store.get(), completion("a", false), entry.updatedAt + 1));
      }
      return { ok: true };
    });

    await ctx.engine.submit(completion("a", true));

    assert.equal(ctx.sent.length, 2);
    assert.equal(ctx.sent[0].kind === "habit-completion" && ctx.sent[0].completed, true);
    assert.equal(ctx.sent[1].kind === "habit-completion" && ctx.sent[1].completed, false);
    assert.deepEqual(ctx.store.get(), {});
  });

  it("rodadas simultâneas nunca enviam em paralelo", async () => {
    const ctx = setup({ online: false });
    await ctx.engine.submit(completion("a", true));
    await ctx.engine.submit(completion("b", true));
    ctx.setOnline(true);

    let running = 0;
    let maxRunning = 0;
    ctx.setBehavior(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return { ok: true };
    });

    await Promise.all([ctx.engine.flush(), ctx.engine.flush(), ctx.engine.flush()]);

    assert.equal(maxRunning, 1);
    assert.equal(ctx.sent.length, 2);
  });
});

describe("sobreposição de estado na tela", () => {
  const server = { completed: false, value: 1000 };

  it("sem item pendente, vale o que veio do servidor", () => {
    assert.deepEqual(overlayHabitState(null, server, 3000), server);
    assert.equal(overlayTaskCompleted(null, true), true);
  });

  it("marcação pendente vale mais que o servidor e preserva o valor", () => {
    const entry = upsertEntry({}, completion("a", true), 1)["h:a:2026-10-08"];
    assert.deepEqual(overlayHabitState(entry, server, null), { completed: true, value: 1000 });
  });

  it("valor pendente recalcula a conclusão pela meta", () => {
    const below = upsertEntry({}, { kind: "habit-value", habitId: "a", date: "2026-10-08", value: 2500 }, 1)["h:a:2026-10-08"];
    const reached = upsertEntry({}, { kind: "habit-value", habitId: "a", date: "2026-10-08", value: 3000 }, 2)["h:a:2026-10-08"];
    assert.deepEqual(overlayHabitState(below, server, 3000), { completed: false, value: 2500 });
    assert.deepEqual(overlayHabitState(reached, server, 3000), { completed: true, value: 3000 });
  });

  it("tarefa pendente vale mais que o servidor", () => {
    const entry = upsertEntry({}, { kind: "task-completion", taskId: "t", completed: false }, 1)["t:t"];
    assert.equal(overlayTaskCompleted(entry, true), false);
  });
});

describe("motor: limites", () => {
  it("fila cheia rejeita novos itens com mensagem clara", async () => {
    const ctx = setup({ online: false });
    for (let i = 0; i < MAX_PENDING; i++) await ctx.engine.submit(completion(`h${i}`, true));
    await assert.rejects(() => ctx.engine.submit(completion("extra", true)), QueueFullError);
  });
});
