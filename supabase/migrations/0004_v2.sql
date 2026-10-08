-- Routine v1 — V2: rotinas, lembrete por hábito, desafios e revisão semanal
-- Idempotente: pode ser executada mais de uma vez sem erro.
-- O app continua funcionando sem esta migration; os recursos novos só aparecem depois dela.

-- Revisão semanal: dia (no fuso do usuário) em que o aviso de domingo já foi enviado.
-- Também serve de marcador de que o schema V2 existe.
alter table profiles add column if not exists last_review_date date;

-- =========================================================
-- routines: blocos como "Manhã" e "Noite" que agrupam hábitos
-- =========================================================
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  period text not null default 'custom'
    check (period in ('morning', 'afternoon', 'evening', 'custom')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on routines (user_id);

alter table routines enable row level security;

drop policy if exists "own routines" on routines;
create policy "own routines" on routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- habits: lembrete individual, desafio e rotina
-- =========================================================
alter table habits add column if not exists reminder_time time;
alter table habits add column if not exists last_reminded_date date;
alter table habits add column if not exists challenge_days int;
alter table habits add column if not exists challenge_start_date date;
alter table habits add column if not exists routine_id uuid
  references routines (id) on delete set null;

create index if not exists habits_routine_id_idx on habits (routine_id);
