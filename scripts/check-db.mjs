// Verifica as migrations do Routine em um Postgres em memória (PGlite):
// 1) executa 0001..0004 (e 0004 de novo, para provar idempotência);
// 2) testa triggers, RLS entre dois usuários e constraints;
// 3) compara types/database.types.ts (escrito à mão) com o schema real.
// Uso: npm run check:db   (não toca no seu Supabase: tudo roda em memória)
// Ao criar uma migration nova, acrescente o nome dela na lista MIGRATIONS abaixo.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = ["0001_init", "0002_rls", "0003_onboarding_push", "0004_v2"];

let pgcrypto = null;
try {
  ({ pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto"));
} catch {
  /* gen_random_uuid() já é nativo no PG13+; a extensão é só um create if not exists */
}

const db = new PGlite(pgcrypto ? { extensions: { pgcrypto } } : {});

let passed = 0;
const failures = [];
const notes = [];

function ok(name) {
  passed++;
  console.log(`  PASS  ${name}`);
}
function fail(name, detail) {
  failures.push(`${name}: ${detail}`);
  console.log(`  FAIL  ${name}\n        -> ${detail}`);
}
async function check(name, fn) {
  try {
    const result = await fn();
    if (result === false) fail(name, "condição falsa");
    else ok(name);
  } catch (e) {
    fail(name, e.message);
  }
}
async function expectError(name, pattern, fn) {
  try {
    await fn();
    fail(name, "deveria ter falhado, mas passou");
  } catch (e) {
    if (pattern.test(e.message)) ok(name);
    else fail(name, `erro inesperado: ${e.message}`);
  }
}

async function as(userId, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const q = (sql, params) => db.query(sql, params);

// ---------------------------------------------------------------- stubs do Supabase
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
`);

// ---------------------------------------------------------------- 1. migrations
console.log("\n[1] Migrations");
const migDir = path.join(repo, "supabase", "migrations");
async function runMigration(file, label = file) {
  const sql = fs.readFileSync(path.join(migDir, file + ".sql"), "utf8");
  try {
    await db.exec(sql);
    ok(`${label} executa sem erro`);
    return true;
  } catch (e) {
    fail(`${label} executa sem erro`, e.message);
    return false;
  }
}
for (const f of MIGRATIONS) {
  if (!(await runMigration(f))) {
    console.log("\nAbortando: migration falhou.");
    process.exit(1);
  }
}
// A última migration precisa poder rodar de novo sem erro (o SQL Editor costuma ser reexecutado).
const LAST = MIGRATIONS[MIGRATIONS.length - 1];
await runMigration(LAST, `${LAST} (2ª execução, idempotência)`);

await db.exec(`
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant all on all tables in schema public to authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);

const TABLES = ["profiles", "pillars", "habits", "habit_schedules", "habit_logs", "tasks", "routines", "push_subscriptions"];

await check("RLS ligado em todas as tabelas do app", async () => {
  const { rows } = await q(
    `select tablename from pg_tables where schemaname = 'public' and not rowsecurity`,
  );
  if (rows.length) throw new Error("sem RLS: " + rows.map((r) => r.tablename).join(", "));
});
await check("toda tabela tem ao menos uma policy", async () => {
  const { rows } = await q(
    `select t.tablename from pg_tables t where t.schemaname = 'public'
       and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)`,
  );
  if (rows.length) throw new Error("sem policy: " + rows.map((r) => r.tablename).join(", "));
});
await check("existe unique (habit_id, log_date) para o upsert dos registros", async () => {
  const { rows } = await q(
    `select 1 from pg_constraint where conrelid = 'public.habit_logs'::regclass and contype = 'u'
       and (select array_agg(attname order by attname) from pg_attribute
              where attrelid = conrelid and attnum = any(conkey)) = array['habit_id','log_date']::name[]`,
  );
  return rows.length === 1;
});
await check("existe unique (endpoint) para o upsert das assinaturas push", async () => {
  const { rows } = await q(
    `select 1 from pg_constraint where conrelid = 'public.push_subscriptions'::regclass and contype = 'u'`,
  );
  return rows.length >= 1;
});

// ---------------------------------------------------------------- 2. trigger handle_new_user
console.log("\n[2] Trigger handle_new_user (cadastro por email e Google)");
const ids = {};
async function newUser(key, meta, email = `${key}@teste.local`) {
  const { rows } = await q(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify(meta)],
  );
  ids[key] = rows[0].id;
}
await newUser("A", { display_name: "Ana", timezone: "America/Sao_Paulo" });
await newUser("B", { display_name: "Bia", timezone: "America/New_York" });
await newUser("G1", { full_name: "Gabi Google" });
await newUser("G2", { name: "Gil Name" });
await newUser("E", { display_name: "", full_name: "Eva Full" });
await newUser("N", {});

async function profile(key) {
  const { rows } = await q(`select display_name, timezone from profiles where id = $1`, [ids[key]]);
  return rows[0];
}
await check("email: usa display_name e timezone enviados", async () => {
  const p = await profile("A");
  return p.display_name === "Ana" && p.timezone === "America/Sao_Paulo";
});
await check("email: fuso diferente é preservado", async () => (await profile("B")).timezone === "America/New_York");
await check("Google: usa full_name quando não há display_name", async () => (await profile("G1")).display_name === "Gabi Google");
await check("Google: usa name como último recurso", async () => (await profile("G2")).display_name === "Gil Name");
await check("display_name vazio cai para full_name", async () => (await profile("E")).display_name === "Eva Full");
await check("sem metadados: nome nulo e fuso padrão", async () => {
  const p = await profile("N");
  return p.display_name === null && p.timezone === "America/Sao_Paulo";
});

// ---------------------------------------------------------------- 3. RLS entre dois usuários
console.log("\n[3] RLS: usuário A cria dados, usuário B não pode vê-los nem alterá-los");
const A = ids.A;
const B = ids.B;
const s = {};

await as(A, async () => {
  s.pillar = (await q(`insert into pillars (user_id, name) values ($1, 'Saúde') returning id`, [A])).rows[0].id;
  s.routine = (await q(`insert into routines (user_id, name, period) values ($1, 'Manhã', 'morning') returning id`, [A])).rows[0].id;
  s.habit = (
    await q(
      `insert into habits (user_id, pillar_id, name, habit_type, tracking_type, target_value, target_unit,
                           reminder_time, challenge_days, challenge_start_date, routine_id)
       values ($1, $2, 'Beber água', 'build', 'quantity', 3000, 'ml', '08:30', 21, '2026-10-01', $3) returning id`,
      [A, s.pillar, s.routine],
    )
  ).rows[0].id;
  await q(`insert into habit_schedules (habit_id, schedule_type, start_date) values ($1, 'daily', '2026-10-01')`, [s.habit]);
  await q(`insert into habit_logs (habit_id, user_id, log_date, value, completed) values ($1, $2, '2026-10-02', 500, false)`, [s.habit, A]);
  await q(`insert into tasks (user_id, title, due_date) values ($1, 'Pagar conta', '2026-10-05')`, [A]);
  await q(`insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/abc', 'k', 'a')`, [A]);
});
ok("A consegue criar pilar, rotina, hábito (com campos V2), agenda, registro, tarefa e assinatura");

for (const t of TABLES) {
  await check(`B não enxerga linhas de A em ${t}`, async () => {
    // confirma antes que a linha existe (como dono), para o "0" ter significado
    const where = t === "profiles" ? "id = $1" : t === "habit_schedules" ? "habit_id = $1" : "user_id = $1";
    const key = t === "habit_schedules" ? s.habit : A;
    const mine = await q(`select count(*)::int as n from ${t} where ${where}`, [key]);
    if (mine.rows[0].n === 0) throw new Error("dado de A não existe: teste inválido");
    const seen = await as(B, () => q(`select count(*)::int as n from ${t} where ${where}`, [key]));
    return seen.rows[0].n === 0;
  });
}
await check("B só enxerga o próprio perfil", async () => {
  const { rows } = await as(B, () => q(`select id from profiles`));
  return rows.length === 1 && rows[0].id === B;
});

await check("B não consegue editar o hábito de A (0 linhas)", async () => {
  const r = await as(B, () => q(`update habits set name = 'hack' where id = $1`, [s.habit]));
  return r.affectedRows === 0;
});
await check("B não consegue apagar registros de A (0 linhas)", async () => {
  const r = await as(B, () => q(`delete from habit_logs where habit_id = $1`, [s.habit]));
  return r.affectedRows === 0;
});
await check("B não consegue editar o perfil de A (0 linhas)", async () => {
  const r = await as(B, () => q(`update profiles set display_name = 'x' where id = $1`, [A]));
  return r.affectedRows === 0;
});
await expectError("B não pode criar rotina em nome de A", /row-level security/i, () =>
  as(B, () => q(`insert into routines (user_id, name) values ($1, 'x')`, [A])),
);
await expectError("B não pode criar pilar em nome de A", /row-level security/i, () =>
  as(B, () => q(`insert into pillars (user_id, name) values ($1, 'x')`, [A])),
);
await expectError("B não pode registrar progresso no hábito de A", /not allowed to log habit/i, () =>
  as(B, () => q(`insert into habit_logs (habit_id, user_id, log_date) values ($1, $2, '2026-10-03')`, [s.habit, B])),
);
await expectError("B não pode criar agenda em hábito de A", /row-level security/i, () =>
  as(B, () => q(`insert into habit_schedules (habit_id, schedule_type) values ($1, 'daily')`, [s.habit])),
);
await expectError("B não pode criar perfil com o id de A", /row-level security|duplicate key/i, () =>
  as(B, () => q(`insert into profiles (id) values ($1)`, [A])),
);

await check("A: user_id forjado no registro é corrigido pelo trigger", async () => {
  await as(A, () =>
    q(`insert into habit_logs (habit_id, user_id, log_date, completed) values ($1, $2, '2026-10-03', true)`, [s.habit, B]),
  );
  const { rows } = await q(`select user_id from habit_logs where habit_id = $1 and log_date = '2026-10-03'`, [s.habit]);
  return rows[0].user_id === A;
});

await check("upsert de registro (on conflict habit_id,log_date) atualiza a mesma linha", async () => {
  await as(A, () =>
    q(
      `insert into habit_logs (habit_id, user_id, log_date, value, completed) values ($1, $2, '2026-10-02', 3000, true)
       on conflict (habit_id, log_date) do update set value = excluded.value, completed = excluded.completed, user_id = excluded.user_id`,
      [s.habit, A],
    ),
  );
  const { rows } = await q(`select value::int as v, completed from habit_logs where habit_id = $1 and log_date = '2026-10-02'`, [s.habit]);
  return rows.length === 1 && rows[0].v === 3000 && rows[0].completed === true;
});
await check("upsert só de nota preserva value/completed existentes", async () => {
  await as(A, () =>
    q(
      `insert into habit_logs (habit_id, user_id, log_date, note) values ($1, $2, '2026-10-02', 'ótimo dia')
       on conflict (habit_id, log_date) do update set note = excluded.note`,
      [s.habit, A],
    ),
  );
  const { rows } = await q(`select value::int as v, completed, note from habit_logs where habit_id = $1 and log_date = '2026-10-02'`, [s.habit]);
  return rows[0].v === 3000 && rows[0].completed === true && rows[0].note === "ótimo dia";
});

// Push: o endpoint é único. Reaproveitar o de outra conta é bloqueado (protege contra
// sequestro); por isso o app cria uma assinatura nova a cada ativação e a revoga ao sair.
await expectError("push: não dá para tomar o endpoint de outra conta", /row-level security/i, () =>
  as(B, () =>
    q(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/abc', 'k2', 'a2')
       on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
      [B],
    ),
  ),
);
await check("push: outra conta com endpoint novo registra normalmente", async () => {
  await as(B, () =>
    q(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/novo', 'k3', 'a3')
       on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`,
      [B],
    ),
  );
  const { rows } = await as(B, () => q(`select count(*)::int as n from push_subscriptions`));
  return rows[0].n === 1; // só enxerga a própria
});
await check("push: remover por endpoint só afeta a própria assinatura", async () => {
  const r = await as(B, () => q(`delete from push_subscriptions where endpoint = 'https://push.example/abc'`));
  const still = await q(`select count(*)::int as n from push_subscriptions where endpoint = 'https://push.example/abc'`);
  return r.affectedRows === 0 && still.rows[0].n === 1;
});

// ---------------------------------------------------------------- 4. constraints e cascatas
console.log("\n[4] Constraints e cascatas");
await expectError("routines.period rejeita valor inválido", /check constraint/i, () =>
  as(A, () => q(`insert into routines (user_id, name, period) values ($1, 'x', 'weekly')`, [A])),
);
await expectError("habits rejeita habit_type inválido", /check constraint/i, () =>
  as(A, () => q(`insert into habits (user_id, name, habit_type, tracking_type) values ($1, 'x', 'foo', 'checkbox')`, [A])),
);
await check("apagar rotina zera habits.routine_id (on delete set null)", async () => {
  await q(`delete from routines where id = $1`, [s.routine]);
  const { rows } = await q(`select routine_id from habits where id = $1`, [s.habit]);
  return rows[0].routine_id === null;
});
await check("apagar usuário remove perfil e todos os dados dele (cascade)", async () => {
  await q(`delete from auth.users where id = $1`, [A]);
  for (const t of ["profiles", "pillars", "habits", "habit_logs", "tasks"]) {
    const col = t === "profiles" ? "id" : "user_id";
    const { rows } = await q(`select count(*)::int as n from ${t} where ${col} = $1`, [A]);
    if (rows[0].n !== 0) throw new Error(`sobrou linha em ${t}`);
  }
  const sched = await q(`select count(*)::int as n from habit_schedules where habit_id = $1`, [s.habit]);
  if (sched.rows[0].n !== 0) throw new Error("sobrou agenda");
});

// ---------------------------------------------------------------- 5. types vs schema
console.log("\n[5] types/database.types.ts x schema real");
const typesSrc = fs.readFileSync(path.join(repo, "types", "database.types.ts"), "utf8");

function block(src, startIdx) {
  // devolve o conteúdo entre a "{" na posição startIdx e a "}" correspondente
  let depth = 0;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(startIdx + 1, i);
    }
  }
  throw new Error("bloco não fechado");
}
function parseFields(body) {
  const out = {};
  for (const m of body.matchAll(/^\s*(\w+)(\?)?:\s*([^;]+);/gm)) {
    out[m[1]] = { optional: Boolean(m[2]), type: m[3].trim() };
  }
  return out;
}
const tablesStart = typesSrc.indexOf("Tables: {");
const tablesBody = block(typesSrc, typesSrc.indexOf("{", tablesStart));
const declared = {};
for (const m of tablesBody.matchAll(/^\s{6}(\w+): \{/gm)) {
  const open = tablesBody.indexOf("{", m.index);
  const body = block(tablesBody, open);
  const rowAt = body.indexOf("Row: {");
  const insAt = body.indexOf("Insert: {");
  declared[m[1]] = {
    row: parseFields(block(body, body.indexOf("{", rowAt))),
    insert: insAt >= 0 ? parseFields(block(body, body.indexOf("{", insAt))) : null,
  };
}

const tsKind = (udt) => {
  if (["int2", "int4", "int8", "numeric", "float4", "float8"].includes(udt)) return "number";
  if (udt === "bool") return "boolean";
  if (udt === "_int4" || udt === "_int2") return "number[]";
  return "string";
};
const baseKind = (t) => {
  const base = t.replace(/\|\s*null/g, "").trim();
  if (base === "number" || base === "boolean" || base === "number[]") return base;
  return "string"; // string ou union de literais (HabitType etc.)
};

for (const table of TABLES) {
  const { rows } = await q(
    `select column_name, udt_name, is_nullable, column_default
       from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  const dbCols = Object.fromEntries(rows.map((r) => [r.column_name, r]));
  const decl = declared[table];

  await check(`${table}: tipos declarados`, async () => {
    if (!decl) throw new Error("tabela ausente em database.types.ts");
  });
  if (!decl) continue;

  await check(`${table}: mesmas colunas no tipo Row e no banco`, async () => {
    const a = Object.keys(decl.row).sort().join(",");
    const b = Object.keys(dbCols).sort().join(",");
    if (a !== b) {
      const onlyType = Object.keys(decl.row).filter((c) => !dbCols[c]);
      const onlyDb = Object.keys(dbCols).filter((c) => !decl.row[c]);
      throw new Error(`só no tipo: [${onlyType}] | só no banco: [${onlyDb}]`);
    }
  });
  await check(`${table}: nulabilidade e tipo base de cada coluna`, async () => {
    const problems = [];
    for (const [col, info] of Object.entries(dbCols)) {
      const d = decl.row[col];
      if (!d) continue;
      const declNullable = /\|\s*null/.test(d.type);
      if (declNullable !== (info.is_nullable === "YES")) problems.push(`${col}: nulável banco=${info.is_nullable} tipo=${d.type}`);
      if (baseKind(d.type) !== tsKind(info.udt_name)) problems.push(`${col}: banco=${info.udt_name} tipo=${d.type}`);
    }
    if (problems.length) throw new Error(problems.join(" | "));
  });
  if (decl.insert) {
    await check(`${table}: campos obrigatórios do Insert = NOT NULL sem default`, async () => {
      const problems = [];
      for (const [col, info] of Object.entries(dbCols)) {
        const d = decl.insert[col];
        if (!d) {
          problems.push(`${col}: ausente no Insert`);
          continue;
        }
        const required = info.is_nullable === "NO" && info.column_default === null;
        if (required === d.optional) problems.push(`${col}: banco ${required ? "obriga" : "dispensa"}, tipo ${d.optional ? "dispensa" : "obriga"}`);
      }
      if (problems.length) throw new Error(problems.join(" | "));
    });
  }
}

// ---------------------------------------------------------------- resumo
console.log(`\n${passed} verificações OK, ${failures.length} falhas`);
for (const n of notes) console.log("NOTA:", n);
if (failures.length) {
  console.log("\nFALHAS:");
  for (const f of failures) console.log(" -", f);
  process.exit(1);
}
