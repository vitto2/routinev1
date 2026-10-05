-- Routine v1 — onboarding, notificações push e correção de RLS

-- Onboarding: preenchido quando o usuário conclui (ou pula) o modal inicial
alter table profiles add column if not exists onboarded_at timestamptz;

-- Notificações: dia (no fuso do usuário) em que o resumo da manhã e o lembrete
-- da noite já foram enviados
alter table profiles add column if not exists last_digest_date date;
alter table profiles add column if not exists last_evening_date date;

-- Notificações: evita avisar duas vezes a mesma tarefa com horário
alter table tasks add column if not exists reminded_at timestamptz;

-- Faltava policy de insert em profiles: o fallback getOrCreateProfile()
-- falhava por RLS quando a trigger handle_new_user não tinha rodado.
create policy "own profile insert" on profiles
  for insert with check (id = auth.uid());

-- =========================================================
-- push_subscriptions: uma linha por navegador/dispositivo inscrito
-- =========================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "own push_subscriptions" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
