# Routine

App de rotina, hábitos e consistência pessoal. Mobile-first, instalável (PWA), em português.
Feito para você manter a **consistência**, não para acumular uma lista de tarefas.

## O que o app faz

- **Hábitos** de marcar, de quantidade (ml, páginas...), de tempo (min) e de evitar, com frequência
  flexível: todo dia, dias da semana, X vezes por semana, data específica ou a cada N dias.
- **Pilares** (áreas da vida), **tarefas** com data, hora e prioridade, e **rotinas** (manhã, tarde, noite).
- **Hoje** (o coração do app, tudo em 1 toque), **Semana**, **Progresso** (7, 30 ou 60 dias, quantas vezes
  cada hábito foi feito, padrão por dia da semana), **calendário mensal** e **revisão semanal**.
- **Sequências** 🔥 e mensagens de marco, **desafios** de 21/30/66/90 dias, **pausa/férias** que não
  quebra a sequência, notas por dia, edição de dias passados e **Desfazer**.
- **Notificações push** (resumo do dia, lembrete da noite, tarefas com horário, lembrete por hábito,
  revisão de domingo), **marcar offline**, **exportar CSV**, tema claro/escuro.
- Login com **email e senha** e, opcionalmente, com **Google**.

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript · Tailwind v4 · shadcn/ui sobre Base UI ·
Supabase (Postgres, Auth, RLS) · Vercel · Web Push.

## Como rodar

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode as migrations de `supabase/migrations/`, **nesta ordem**:
   `0001_init.sql`, `0002_rls.sql`, `0003_onboarding_push.sql`, `0004_v2.sql`.
   O app abre sem a `0004`, mas rotinas, desafios, lembrete por hábito e revisão semanal só aparecem depois dela.
3. Copie `.env.local.example` para `.env.local` e preencha (veja a tabela abaixo).
4. Instale e rode:

```bash
npm install
npm run dev
```

5. Abra `http://localhost:3000` e crie uma conta em `/signup`.

Passo a passo ilustrado do Supabase: `docs/TUTORIAL_SUPABASE.pdf`.

## Variáveis de ambiente

| Variável | Onde | Obrigatória | Para quê |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | local e Vercel | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local e Vercel | sim | chave pública ("publishable") do Supabase |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | local e Vercel | para push | chave pública das notificações |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | só Vercel | para push | chave privada e contato (`mailto:`) |
| `CRON_SECRET` | só Vercel | para push | protege `/api/cron/reminders` |
| `SUPABASE_SERVICE_ROLE_KEY` | só Vercel | para push | o cron lê todos os usuários; **ignora RLS, nunca commitar** |
| `NEXT_PUBLIC_GOOGLE_AUTH` | Vercel | para Google | `true` mostra o botão do Google |

Variáveis `NEXT_PUBLIC_*` entram no build: depois de mudar, faça um novo deploy.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | desenvolvimento, build de produção, servidor de produção |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (regras de pontuação, sequência, pausa, desafios, fila offline, CSV...) |
| `npm run check:contrast` | confere o contraste (WCAG AA) de todas as cores nos temas claro e escuro |
| `npm run check:ui` | confere o padrão visual do código (ícones na escala 14/16/20/24, sem tamanhos soltos, sem cards escritos à mão). Regras em `docs/DESIGN.md` |
| `npm run check:db` | roda as migrations num Postgres em memória e testa triggers, RLS entre dois usuários e se `types/database.types.ts` bate com o banco. **Não toca no seu Supabase.** |

Antes de subir mudanças: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run check:contrast`,
`npm run check:ui`, `npm run check:db` e `npm run build`.

## Documentação

| Arquivo | Assunto |
|---|---|
| `docs/PLAN.md` | plano técnico original (arquitetura, schema, regras) |
| `docs/PLANO_V2.md` | as 14 funcionalidades da V2, decisões e limitações |
| `docs/DESIGN.md` | sistema de design: escalas de ícone, card e espaçamento e os componentes de `components/ui` |
| `docs/NOTIFICACOES.md` | configurar o push (VAPID, cron no Supabase) |
| `docs/GOOGLE_LOGIN.md` | configurar o login com Google |
| `docs/OFFLINE.md` | como funciona a marcação offline e como testar |
| `docs/TESTES_MANUAIS.md` | roteiro para validar tudo com sua conta e seu celular |

## Estrutura

- `app/(auth)` login e cadastro · `app/(app)` área logada (Hoje, Semana, Progresso, Perfil, Hábitos, Pilares, Rotinas, Revisão) · `app/api` cron de lembretes e exportação
- `components/ui` sistema de design (Surface, IconBadge, ListRow, Panel, Notice, Chip...) · `lib/actions` mutações (Server Actions) · `lib/data` leituras · `lib/offline` fila de marcações offline
- `lib/scheduling`, `lib/scoring`, `lib/dates`, `lib/progress` regras de negócio (funções puras, testadas)
- `supabase/migrations` schema, RLS e evoluções · `scripts` verificações · `tests` testes · `public/sw.js` service worker

## Regras que não podem ser quebradas

- **Datas de negócio são `AAAA-MM-DD` no fuso do perfil**, nunca derivadas do `now()` do servidor.
- **Agendas são temporais** (`habit_schedules` com `start_date`/`end_date`): editar a frequência fecha a
  linha antiga e cria outra; arquivar e pausar são "buracos" na agenda. O histórico nunca é reescrito.
- **Registros são estados absolutos** ("concluído = sim"), nunca "alternar" ou "somar": é o que torna
  desfazer, reenviar e a fila offline seguros.
- **RLS ligado em todas as tabelas.** Nova tabela = nova policy + teste em `scripts/check-db.mjs`.
- **Segredos** (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`) só no servidor/Vercel.
  Nunca em código, commit ou conversa. `.env.local` está no `.gitignore`.
