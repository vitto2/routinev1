# Notificações, onboarding e instalação (PWA)

## O que o usuário recebe

| Lembrete | Quando (fuso do usuário) |
|---|---|
| Resumo do dia | Uma vez por dia, a partir das 09h: hábitos e tarefas de hoje + tarefas atrasadas |
| Lembrete da noite | Uma vez por dia, a partir das 18h, só se ainda houver tarefas pendentes |
| Aviso de tarefa com horário | 15 min antes do horário (e até 1h depois, se o cron atrasar), uma vez por tarefa |

As permissões são pedidas só quando o usuário toca em "Ativar lembretes" (final do onboarding ou Perfil).

## Como funciona

1. O navegador assina o Web Push (chaves VAPID) e a assinatura é salva em `push_subscriptions`.
2. O `pg_cron` do Supabase chama `POST /api/cron/reminders` a cada 5 minutos.
3. A rota valida o `CRON_SECRET`, lê os dados com a service role e envia os pushes.

O plano Hobby da Vercel só aceita cron diário, por isso o agendamento fica no Supabase.

## Configuração (uma vez)

### 1. Migration
No SQL Editor do Supabase, rode `supabase/migrations/0003_onboarding_push.sql`.
Sem ela o app continua funcionando, mas o onboarding e os lembretes ficam desligados.

### 2. Gerar as chaves VAPID
No seu computador:

```bash
npx web-push generate-vapid-keys
```

Guarde a **Private Key** só na Vercel. Nunca a coloque no repositório nem em chats.

### 3. Variáveis de ambiente na Vercel

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key gerada no passo 2 |
| `VAPID_PRIVATE_KEY` | Private Key gerada no passo 2 |
| `VAPID_SUBJECT` | `mailto:seu-email@exemplo.com` |
| `CRON_SECRET` | um texto aleatório longo (ex.: saída de `openssl rand -hex 32`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API Keys > secret / service_role |

A `SUPABASE_SERVICE_ROLE_KEY` ignora o RLS: use só na Vercel, sem prefixo `NEXT_PUBLIC_`.
Depois de salvar, faça um **Redeploy** (variáveis `NEXT_PUBLIC_*` entram no build).

### 4. Agendar o envio
Edite e rode `supabase/cron_reminders.sql` no SQL Editor (troque o domínio e o `CRON_SECRET`).

### 5. Testar
1. Abra o app publicado, vá em **Perfil > Ativar lembretes** e permita.
2. Toque em **Enviar teste**: a notificação deve chegar na hora.
3. Crie uma tarefa para daqui a ~20 min com horário; ela deve avisar 15 min antes.

## Instalar no celular e no computador

- **Chrome (computador):** ícone de instalar na barra de endereço, ou Perfil > Instalar app.
- **Chrome (Android):** Perfil > Instalar app, ou menu > Adicionar à tela inicial.
- **iPhone (Safari):** Compartilhar > Adicionar à Tela de Início. No iOS os lembretes só funcionam com o app instalado.

A instalação exige HTTPS (a Vercel já fornece) e funciona a partir do deploy, não do `npm run dev`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Notificações ainda não configuradas" | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ausente no build (faltou redeploy) |
| `/api/cron/reminders` responde 401 | `CRON_SECRET` diferente entre Vercel e o SQL do cron |
| Responde 503 | Faltam `VAPID_PRIVATE_KEY` ou `VAPID_SUBJECT` |
| Responde 500 | Falta `SUPABASE_SERVICE_ROLE_KEY` ou a migration 0003 |
| Teste não chega | Permissão bloqueada no navegador, ou iPhone sem o app instalado |
| Aviso no horário errado | Fuso do perfil diferente do dispositivo (Perfil > Fuso horário) |
