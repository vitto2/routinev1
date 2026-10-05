# routinev1

App de rotina, hábitos e consistência pessoal — mobile-first, Next.js + Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui + Lucide Icons
- Supabase (Postgres + Auth + RLS)

## Setup

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrations em `supabase/migrations/` (via SQL Editor do Supabase ou `supabase db push`, nessa ordem: `0001_init.sql`, `0002_rls.sql`).
3. Copie `.env.local.example` para `.env.local` e preencha com a URL e a anon key do projeto Supabase (Project Settings → API).
4. Instale as dependências e rode o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

5. Acesse `http://localhost:3000` — crie uma conta em `/signup`.

## Estrutura

- `app/(auth)` — login/signup
- `app/(app)` — área autenticada (Hoje, Semana, Progresso, Hábitos, Pilares, Perfil)
- `lib/actions` — Server Actions (mutações)
- `lib/data` — leitura de dados (Server Components)
- `lib/scheduling`, `lib/scoring`, `lib/dates` — regras de negócio (recorrência, score, streak, timezone)
- `supabase/migrations` — schema + RLS

Veja o plano técnico completo em `docs/PLAN.md`.
