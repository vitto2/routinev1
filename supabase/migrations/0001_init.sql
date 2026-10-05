-- Routine v1 — schema inicial (Fase 1: perfis, pilares, hábitos, agendas, logs, tarefas)

create extension if not exists "pgcrypto";

-- =========================================================
-- profiles
-- =========================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

-- =========================================================
-- pillars
-- =========================================================
create table pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  icon text,
  color text,
  description text,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index pillars_user_id_idx on pillars (user_id);

-- =========================================================
-- habits
-- =========================================================
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  pillar_id uuid references pillars (id) on delete set null,
  name text not null,
  description text,
  habit_type text not null check (habit_type in ('build', 'avoid')),
  tracking_type text not null check (tracking_type in ('checkbox', 'quantity', 'time')),
  target_value numeric,
  target_unit text,
  icon text,
  color text,
  active boolean not null default true,
  archived_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_id_active_idx on habits (user_id, active);
create index habits_pillar_id_idx on habits (pillar_id);

-- =========================================================
-- habit_schedules (temporal: cada alteração de frequência fecha a linha
-- anterior via end_date e insere uma nova, preservando histórico)
-- =========================================================
create table habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  schedule_type text not null check (
    schedule_type in ('daily', 'weekdays', 'x_per_week', 'specific_date', 'interval')
  ),
  weekdays int[],
  frequency_target int,
  interval_days int,
  specific_date date,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint habit_schedules_date_range check (end_date is null or end_date >= start_date)
);

create index habit_schedules_habit_id_idx on habit_schedules (habit_id, start_date, end_date);

-- =========================================================
-- habit_logs
-- =========================================================
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  log_date date not null,
  value numeric,
  completed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_user_date_idx on habit_logs (user_id, log_date);

-- =========================================================
-- tasks
-- =========================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  pillar_id uuid references pillars (id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_due_date_idx on tasks (user_id, due_date);

-- =========================================================
-- updated_at trigger genérico
-- =========================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger habits_set_updated_at
  before update on habits
  for each row execute function set_updated_at();

create trigger habit_logs_set_updated_at
  before update on habit_logs
  for each row execute function set_updated_at();

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- =========================================================
-- profile criado automaticamente no signup
-- =========================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'America/Sao_Paulo')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================
-- defesa extra em habit_logs: nunca confiar só no valor enviado
-- pelo cliente para user_id, mesmo com RLS habilitado
-- =========================================================
create or replace function enforce_habit_log_ownership()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from habits where id = new.habit_id;

  if owner is null then
    raise exception 'habit % not found', new.habit_id;
  end if;

  if owner <> auth.uid() then
    raise exception 'not allowed to log habit %', new.habit_id;
  end if;

  new.user_id := owner;
  return new;
end;
$$;

create trigger habit_logs_enforce_ownership
  before insert or update on habit_logs
  for each row execute function enforce_habit_log_ownership();
