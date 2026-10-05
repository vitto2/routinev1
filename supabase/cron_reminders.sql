-- Agenda o envio de lembretes (NÃO é uma migration: contém valores seus).
-- Rode no SQL Editor do Supabase DEPOIS de:
--   1) rodar a migration 0003_onboarding_push.sql;
--   2) configurar as variáveis na Vercel e fazer o redeploy (veja docs/NOTIFICACOES.md).
--
-- Troque SEU-DOMINIO.vercel.app e SEU_CRON_SECRET (o mesmo valor da variável CRON_SECRET).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'routine-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-DOMINIO.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SEU_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Ver as últimas execuções:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- Ver as respostas HTTP:
--   select id, status_code, content from net._http_response order by created desc limit 10;
-- Remover o agendamento:
--   select cron.unschedule('routine-reminders');
