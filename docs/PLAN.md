# Routine v1 — App de Rotina, Hábitos e Consistência Pessoal

## Contexto

Repositório `vitto2/routinev1` está vazio (só README). O usuário quer um app mobile-first para construir **consistência** (não uma to-do list), com hábitos recorrentes (positivos e de evitação, com 3 tipos de tracking), tarefas pontuais, visão semanal, calendário, score diário/semanal, streaks e dashboard de progresso. Pediu explicitamente para validar a arquitetura antes de qualquer código. Este plano cobre os 14 pontos pedidos na seção 24 do briefing.

Princípio guia: **consistência > complexidade**. Tela "Hoje" é o coração do produto — qualquer coisa que burocratize o registro diário deve ser simplificada.

---

## 1. Arquitetura geral

- **Next.js 14+ (App Router) + TypeScript**, mobile-first, preparado para PWA (fase 3).
- **Supabase** como backend único: Postgres + Auth + RLS + (Realtime pontual). Sem backend custom — toda lógica de leitura/escrita via Supabase client (client components) e **Server Actions** para mutações (criar/editar hábito, logar progresso, criar tarefa), evitando API routes redundantes.
- **shadcn/ui + Tailwind** para componentes, **Lucide** para ícones.
- Cálculos de score/streak feitos em funções TypeScript puras em `lib/`, operando sobre dados já buscados — nada de lógica de negócio duplicada em SQL complexo no MVP (mantém o schema simples e testável). Views SQL só entram se performance exigir (fase 2/3).
- Toda data "de negócio" (log de hábito, vencimento de tarefa) é `date` pura (sem hora/timezone) calculada no cliente a partir do timezone do perfil — nunca derivada de `now()` do servidor (ver seção 9).

## 2. Mapa das telas

| Tela | Rota | Descrição |
|---|---|---|
| Login / Signup | `/login`, `/signup` | Email+senha (Supabase Auth) |
| Onboarding | `/onboarding` | Só no primeiro acesso: escolher áreas de vida → criar primeiros hábitos (templates ou manual) |
| **Hoje** | `/today` | Resumo do dia, lista de hábitos de hoje, lista de tarefas de hoje. Tela inicial pós-login. |
| Semana | `/week` | Grid SEG–DOM por hábito, consistência da semana vs anterior |
| Progresso | `/progress` | Dashboard: consistência semana/mês, streaks, desempenho por hábito, gráficos |
| Calendário | `/progress/calendar` | Visão mensal com indicador de desempenho por dia; toque abre detalhe do dia |
| Detalhe do dia | `/day/[date]` (ou modal) | Histórico: o que foi concluído naquela data específica |
| Gerenciar hábitos | `/habits`, `/habits/[id]` | Listar/criar/editar/arquivar hábitos |
| Gerenciar pilares | `/pillars` | Listar/criar/editar pilares (abre como sheet a partir de qualquer tela) |
| Perfil | `/profile` | Nome, timezone, tema, logout |

Bottom navigation fixo: **Hoje | Semana | (+) | Progresso | Perfil**. O "+" abre um bottom sheet: Tarefa / Hábito / Pilar.

## 3. Fluxo de navegação

```
login/signup ──(primeiro acesso)──> onboarding ──> /today
login/signup ──(já tem perfil)────────────────────> /today

/today ──toque num hábito──> marca/incrementa inline (sem navegação)
/today ──"+"──> bottom sheet (Tarefa | Hábito | Pilar) ──> form (sheet/rota) ──> volta pra /today
/week ──toque numa célula──> detalhe rápido (popover/sheet) daquele hábito+dia
/progress ──toque num dia do calendário──> /day/[date]
/habits ──toque num hábito──> /habits/[id] (editar/arquivar)
```

Regra de UX: qualquer ação de registro diário (check, +250ml, +15min) é **1 toque, sem navegação, sem modal bloqueante** — feedback visual imediato (microinteração), persistência otimista.

## 4. Componentes principais

- `AppShell` + `BottomNav`
- `HabitListItem` — renderiza conforme `tracking_type` (checkbox / quantity com botões rápidos +250ml / time com input rápido / avoidance com toggle cumpri-não cumpri)
- `QuickAddSheet` (bottom sheet do "+")
- `TaskListItem`, `TaskForm`
- `HabitForm` (nome, pilar, tipo, meta, frequência)
- `PillarForm`, `PillarBadge`
- `WeekGrid` (SEG–DOM × hábitos, símbolos ✓ ✕ ○ —)
- `MonthCalendar` (indicador por dia: cor + % + ícone, acessível)
- `ScoreRing` / `ProgressBar` (score do dia/semana)
- `StreakBadge` (🔥 N)
- `EmptyState` (hábitos/tarefas vazios, com CTA)
- `DayDetailView` (histórico de uma data)

## 5. Schema completo do Supabase

```sql
-- profiles: 1:1 com auth.users, criado via trigger no signup
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

create table pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  description text,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  name text not null,
  description text,
  habit_type text not null check (habit_type in ('build','avoid')),
  tracking_type text not null check (tracking_type in ('checkbox','quantity','time')),
  target_value numeric,              -- ex: 3000 (ml) ou 60 (min)
  target_unit text,                  -- 'ml' | 'min'
  icon text,
  color text,                        -- override da cor do pilar
  active boolean not null default true,  -- soft delete/arquivamento
  archived_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- avoid habits sempre usam tracking_type='checkbox' (semântica invertida na UI/cálculo)

create table habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  schedule_type text not null check (schedule_type in
    ('daily','weekdays','x_per_week','specific_date','interval')),
  weekdays int[],            -- 0=domingo..6=sábado, usado em 'weekdays'
  frequency_target int,      -- usado em 'x_per_week'
  interval_days int,         -- usado em 'interval'
  specific_date date,        -- usado em 'specific_date'
  start_date date not null default current_date,
  end_date date,             -- null = vigente; editar frequência fecha esta linha e cria outra
  created_at timestamptz not null default now()
);
-- preserva histórico: alterar frequência NUNCA faz update destrutivo, fecha (end_date) e insere nova linha

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,  -- denormalizado p/ RLS simples e queries rápidas
  log_date date not null,            -- dia local do usuário, nunca derivado de UTC
  value numeric,                     -- ml/min realizado; null p/ checkbox e avoid
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)        -- 1 registro válido por hábito/dia
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on habits (user_id, active);
create index on habit_logs (user_id, log_date);
create index on habit_schedules (habit_id, start_date, end_date);
create index on tasks (user_id, due_date);
```

Trigger `handle_new_user()` em `auth.users` (after insert) cria a linha em `profiles`. Trigger `set_updated_at` genérica em `habits`, `habit_logs`, `tasks`.

## 6. Relacionamentos entre tabelas

```
auth.users 1───1 profiles
profiles   1───N pillars
profiles   1───N habits          pillars 1───N habits (nullable)
habits     1───N habit_schedules (temporal: start_date/end_date)
habits     1───N habit_logs      (unique por habit_id+log_date)
profiles   1───N tasks           pillars 1───N tasks (nullable)
```

Nada de M:N — um hábito pertence a no máximo um pilar (conforme briefing). Arquivar pilar/hábito nunca deleta `habit_logs` (soft delete via `active`/`archived`, histórico é imutável mesmo se config mudar depois — por isso `habit_schedules` é temporal em vez de ser sobrescrito).

## 7. Estratégia de autenticação

- Supabase Auth, provider **email/senha** no MVP.
- `@supabase/ssr` com clients separados: `lib/supabase/client.ts` (browser) e `lib/supabase/server.ts` (server components/actions), + `middleware.ts` para refresh de sessão e proteção de rotas (`/today`, `/week`, etc. exigem sessão; redireciona para `/login`).
- Estrutura já pronta para Google/Apple: tela de login terá botões `signInWithOAuth({provider: 'google'|'apple'})` desde já, mas desabilitados/ocultos até os providers serem configurados no dashboard Supabase — não exige mudança de schema.
- Onboarding dispara apenas se `profiles` não tem nenhum `pillar`/`habit` ainda (checagem simples, sem flag extra).

## 8. Políticas de RLS necessárias

RLS habilitado em **todas** as tabelas de usuário. Padrão: dono só acessa o que é seu.

```sql
alter table profiles enable row level security;
alter table pillars enable row level security;
alter table habits enable row level security;
alter table habit_schedules enable row level security;
alter table habit_logs enable row level security;
alter table tasks enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid());

create policy "own pillars" on pillars for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own habits" on habits for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own habit_schedules" on habit_schedules for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()));

create policy "own habit_logs" on habit_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tasks" on tasks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Defesa extra: trigger em `habit_logs` que força `user_id = auth.uid()` e valida que `habit_id` pertence a esse usuário antes do insert/update (não confiar só no valor enviado pelo cliente, mesmo com RLS). Frontend nunca decide permissão — só reflete o que a policy permite.

## 9. Estratégia para datas/timezone

- `profiles.timezone` guarda a IANA tz (ex. `America/Sao_Paulo`), capturada via `Intl.DateTimeFormat().resolvedOptions().timeZone` no onboarding/signup e editável no perfil.
- `habit_logs.log_date`, `habit_schedules.*_date`, `tasks.due_date` são **`date` puro** (sem hora, sem tz) — representam o dia-calendário local do usuário. O cliente calcula "hoje" com `date-fns-tz` usando `profile.timezone` e manda a string `YYYY-MM-DD` explícita; nunca usa `now()` do Postgres pra decidir o dia.
- `created_at`/`updated_at` continuam `timestamptz` (UTC) só para auditoria/ordenação — nunca usados para decidir "qual dia" um log pertence.
- Isso resolve diretamente o caso do briefing: log às 23:50 não "pula" de dia por causa de UTC, porque o dia já chega pronto do cliente baseado no timezone do perfil.

## 10. Lógica de hábitos recorrentes

Função pura `isScheduledOn(habit, schedules, date): boolean`, resolve primeiro o `schedule` vigente para `date` (onde `start_date <= date <= end_date OR end_date IS NULL`), depois:

| `schedule_type` | Regra |
|---|---|
| `daily` | sempre `true` |
| `weekdays` | `true` se `weekday(date) ∈ weekdays[]` |
| `x_per_week` | aparece todo dia como "elegível"; conta como cumprido na semana quando `completions_na_semana >= frequency_target` (ver seção 11) |
| `specific_date` | `true` apenas se `date == specific_date` |
| `interval` | `true` se `(date - start_date) % interval_days == 0` |

Esse conjunto de "dias programados" é a base para score e streak — dias não programados nunca entram no denominador nem quebram sequência (resolve a regra da seção 11/12 do briefing).

## 11. Lógica do score diário/semanal

**Score diário** (por usuário/data D):
```
scheduled = hábitos ativos com isScheduledOn(habit, D) = true (e habit.created_at <= D)
completed = desses, quantos têm habit_logs.completed = true em D
score = completed / scheduled   (se scheduled = 0 → exibir "sem hábitos programados", não 0% nem 100%)
```
Tarefas **não** entram nesse score — progresso de tarefas (`done/total` do dia) é exibido separado, como pedido no briefing (item 12).

**Score semanal**: `soma(completed na semana) / soma(scheduled na semana)` (não é média simples de scores diários — mais robusto quando o nº de hábitos programados varia dia a dia). Exibido junto com o valor da semana anterior para comparação de tendência.

## 12. Lógica dos streaks

Para cada hábito, considerar apenas as datas onde `isScheduledOn = true` (gaps-and-islands sobre esse subconjunto, não sobre o calendário cheio):
- Percorrer as datas programadas em ordem decrescente a partir de hoje (ou ontem, se hoje ainda não foi marcado e o hábito está programado hoje — "hoje" fica pendente, não quebra streak ainda).
- Streak atual = nº de datas programadas consecutivas, a partir daí, com `completed = true`.
- Quebra no primeiro dia programado sem log ou com `completed = false`.
- Melhor streak = maior sequência desse tipo já observada no histórico do hábito.
- MVP: calculado on-demand em TS a partir dos `habit_logs` + `habit_schedules` já carregados (sem tabela de cache). Cache/coluna materializada só entra se houver problema de performance (fase 2/3).

## 13. Estrutura de pastas

```
app/
  (auth)/login/  (auth)/signup/
  onboarding/
  (app)/today/  (app)/week/
  (app)/progress/  (app)/progress/calendar/
  (app)/habits/  (app)/habits/[id]/
  (app)/pillars/
  (app)/profile/
  (app)/day/[date]/
  layout.tsx (AppShell + BottomNav para rotas autenticadas)
components/
  ui/            # shadcn
  layout/        # AppShell, BottomNav, QuickAddSheet
  habits/        # HabitListItem, HabitForm, StreakBadge
  tasks/         # TaskListItem, TaskForm
  pillars/       # PillarForm, PillarBadge
  progress/      # WeekGrid, MonthCalendar, ScoreRing, charts
lib/
  supabase/      # client.ts, server.ts
  dates/         # helpers timezone-aware (today(), weekRange(), ...)
  scheduling/    # isScheduledOn()
  scoring/       # dailyScore(), weeklyScore(), streaks()
  actions/       # server actions (habits, logs, tasks, pillars)
types/
  database.types.ts   # gerado via supabase gen types
  domain.ts
middleware.ts
supabase/
  migrations/
  seed.sql
```

## 14. Roadmap de implementação

**Fase 1 — MVP**
1. Setup do projeto (Next.js, Tailwind, shadcn, Supabase client) + deploy inicial
2. Migrations do schema completo + RLS + triggers
3. Auth (signup/login/logout) + middleware de sessão
4. CRUD de Pilares
5. CRUD de Hábitos (+ `habit_schedules`)
6. Registro diário (`habit_logs`) — checkbox, quantity, time, avoid
7. Tela **Hoje** (hábitos + tarefas, 1 toque)
8. CRUD de Tarefas + seção na tela Hoje + FAB "+"
9. Tela **Semana** (grid + score semanal)
10. Cálculo de score diário/semanal (`lib/scoring`)
11. Histórico básico (`/day/[date]`)
12. Responsividade mobile + revisão de UX de registro rápido

**Fase 2**
13. Onboarding (seleção de áreas + templates de hábitos)
14. Dashboard de Progresso avançado + gráficos
15. Streaks (atual/melhor, por hábito)
16. Calendário mensal com indicador de desempenho
17. Dark mode
18. Polimento de microinterações/animações

**Fase 3**
19. PWA (manifest, service worker)
20. Notificações/lembretes
21. Login social (Google/Apple)
22. Integração com calendário externo, widgets

---

## Verificação

- Migrations aplicadas via Supabase CLI (`supabase db push` ou migration files) contra um projeto Supabase de dev; checar `select * from pg_policies` para confirmar RLS ativo em todas as tabelas.
- Testar manualmente fluxo completo no navegador (mobile viewport): signup → onboarding → criar pilar/hábito → marcar no Hoje → ver refletido na Semana e no score.
- Teste de timezone: criar log próximo à virada do dia (23:50 no tz do perfil) e confirmar que `log_date` corresponde ao dia local, não ao UTC.
- Teste de streak: hábito com `weekdays` (ex. seg/ter/qui/sex) — confirmar que quarta-feira não quebra a sequência.
