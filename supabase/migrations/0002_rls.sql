-- Routine v1 — Row Level Security
-- Cada usuário só acessa os próprios dados. Nunca confiar só no frontend.

alter table profiles enable row level security;
alter table pillars enable row level security;
alter table habits enable row level security;
alter table habit_schedules enable row level security;
alter table habit_logs enable row level security;
alter table tasks enable row level security;

-- profiles: só o próprio usuário lê/edita seu perfil
create policy "own profile select" on profiles
  for select using (id = auth.uid());

create policy "own profile update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- pillars
create policy "own pillars" on pillars
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habits
create policy "own habits" on habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habit_schedules: não tem user_id direto, valida via habits
create policy "own habit_schedules" on habit_schedules
  for all using (
    exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  ) with check (
    exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  );

-- habit_logs
create policy "own habit_logs" on habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tasks
create policy "own tasks" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
