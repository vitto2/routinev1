# Plano da atualização V2 — 14 funcionalidades

Princípio: **nenhuma funcionalidade pode quebrar o que já funciona.** Cada uma entra com
testes, degrada com segurança se o banco ainda não tiver a migration, e só vai para o
GitHub depois de passar em `tsc`, `lint`, `npm test`, `npm run check:contrast` e `build`.

## 1. Decisões de arquitetura (valem para todas)

| Decisão | Por quê |
|---|---|
| **Ações idempotentes de estado absoluto** (`setHabitCompletion(id, data, true/false)`, `setHabitValue(id, data, valor)`) no lugar de "alternar" e "somar" | Desfazer, repetir uma chamada e a fila offline passam a ser seguros: reenviar nunca duplica nem inverte |
| **Validar data de registro no servidor** (formato, não-futura no fuso do perfil, hábito programado naquele dia, até 400 dias atrás) | Edição retroativa sem abrir brecha para dados inválidos |
| **Paginar leituras de logs** (`.range()` de 1000 em 1000, ordenado por `log_date, id`) | O PostgREST corta em 1000 linhas por requisição; sequências e gráficos leem meses de histórico |
| **Pausa = lacuna nas agendas temporais** (mesmo mecanismo do arquivamento) | Pontuação, streak, semana, Hoje e lembretes já consultam a agenda; nada precisa mudar nesses pontos e a sequência não quebra |
| **Tudo opcional no banco** (`add column if not exists`, colunas anuláveis) e **código que só envia colunas novas quando preenchidas** | Se a Vercel publicar antes da migration, o app continua funcionando; recursos novos ficam ocultos até a coluna existir (`hasSchemaV2`) |
| **Lógica de negócio em funções puras** (`lib/*`), com testes em `tests/` | Regras de streak, pausa, desafio, revisão e fila offline testáveis sem banco |
| **Sem bibliotecas novas** (gráficos e calendário em HTML/SVG com tabela alternativa para leitor de tela) | Menos peso e menos superfície de bug |

## 2. Modelo de dados — migration `0004` (única, idempotente)

- `habits`: `reminder_time time`, `last_reminded_date date`, `challenge_days int`, `challenge_start_date date`, `routine_id uuid` (FK `routines`, `on delete set null`)
- `routines`: `id, user_id, name, period ('morning'|'afternoon'|'evening'|'custom'), sort_order, created_at` + RLS "own routines"
- `profiles`: `last_review_date date` (também serve de marcador `hasSchemaV2`)
- Nada de tabela nova para pausa, nota, exportação ou offline.

## 3. As 14 funcionalidades

| # | Funcionalidade | Como funciona | Cuidado principal |
|---|---|---|---|
| 1 | **Editar dias passados** | `/day/[data]` vira editável com os mesmos componentes da tela Hoje; setas dia anterior/próximo; células da Semana levam ao dia | Validação de data no servidor; revalidar semana, progresso e streaks |
| 2 | **Sequências e gamificação leve** | 🔥 por hábito no Hoje e no Progresso; melhor sequência; mensagens de marco (3, 7, 14, 21, 30, 50, 100, 200, 365) ao concluir | A ação devolve a sequência já calculada; nunca punitivo (sem "perdeu tudo") |
| 3 | **Calendário mensal** | Grade do mês com % do dia, ícone e tom (nunca só cor); navegação por `?m=AAAA-MM`; toque abre o dia | Dias futuros desabilitados; tabela alternativa para leitor de tela |
| 4 | **Gráficos de evolução** | Barras das últimas 8 semanas e 6 meses com linha de tendência ("subindo/estável/caindo") | Períodos sem hábito programado aparecem vazios, não 0% |
| 5 | **Desfazer ao concluir** | Aviso "Concluído · Desfazer" por 5 s (hábitos e tarefas) | Usa a ação de estado absoluto, então não inverte se o usuário já tocou de novo |
| 6 | **Nota por registro** | Ícone de nota em cada hábito (Hoje e dia passado); aparece no histórico | Salvar nota não pode alterar `completed`/`value` |
| 7 | **Revisão semanal** | `/review`: nota da semana vs anterior, melhor e pior dia, hábito mais forte e mais negligenciado, sugestão com regras simples; push no domingo à noite | Tom encorajador; sugestão só com dados suficientes (3+ semanas) |
| 8 | **Lembrete por hábito** | Campo "Lembrete (horário)" no hábito; o cron avisa se o hábito está programado, não concluído e não pausado | `last_reminded_date` evita repetir; respeita fuso e pausa |
| 9 | **Pausa / férias** | Pausar um hábito ou todos, com data de retorno ou indefinida; faixa "Modo pausa" no Hoje com botão Retomar | Planejamento puro e testado (`planPause`); nunca apaga histórico |
| 10 | **Login com Google** | Botão no login/cadastro, rota `/auth/callback` com `exchangeCodeForSession` e `next` validado contra open redirect | Só aparece com `NEXT_PUBLIC_GOOGLE_AUTH=true`; exige configurar Google e Supabase |
| 11 | **Marcar offline** | Fila local (IndexedDB) de estados absolutos por chave, sincronizada ao voltar online/foco; página Hoje em cache | Não pode afetar o fluxo online; limpar cache e fila ao sair da conta |
| 12 | **Exportar CSV** | `/api/export?tipo=registros\|tarefas\|habitos` (UTF-8 com BOM) | Escape correto e proteção contra injeção de fórmula (`=`, `+`, `-`, `@`) |
| 13 | **Desafios 21/30/66/90 dias** | Opção no hábito; chip "Dia 12/30"; cartões no Progresso; encerramento com resumo | Mede sobre os dias **programados** da janela, com pausa respeitada |
| 14 | **Rotinas (manhã/noite)** | Hábitos agrupados e ordenados por rotina no Hoje; tela `/routines` com reordenar por botões | Sem biblioteca de arrastar: botões subir/descer acessíveis |

## 4. Fases (cada uma termina em commit + push com todos os portões verdes)

1. **Fundação:** ações idempotentes + validação de data, paginação, testes (feito: base de testes).
2. **Registro:** #1 dias passados, #5 desfazer, #6 notas, #2 sequências.
3. **Visão:** #3 calendário, #4 gráficos, #7 revisão.
4. **Banco novo (migration 0004):** #9 pausa, #8 lembretes por hábito, #13 desafios, #14 rotinas.
5. **Plataforma:** #10 Google, #12 exportar, #11 offline (por último, porque toca as chamadas de registro).

## 5. Portões de qualidade

`npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run check:contrast` · `npm run build` ·
verificação no navegador do que não depende de login (e do que depende, quando houver sessão de teste).

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Código publicado antes da migration | Colunas só enviadas quando preenchidas; recursos novos escondidos por `hasSchemaV2`; leituras de tabelas novas tolerantes a "tabela inexistente" |
| Regressão na pontuação | Testes de cenário (`tests/scoring.test.ts`) estendidos a cada mudança em `lib/scoring` |
| Fila offline duplicar ou perder registro | Estado absoluto por chave (última escrita vence), nunca delta; testes da fila pura |
| Dados de outra conta no cache após logout | Limpar caches do service worker e a fila no `signOut` |
| Excesso de dados nas telas | Paginação e janelas fixas (400 dias para sequência, 8 semanas / 6 meses para gráficos) |

## 7. O que depende de você (configuração externa)

- Rodar `supabase/migrations/0004_v2.sql` (uma vez).
- Google: criar credencial OAuth no Google Cloud, ativar o provedor no Supabase e definir `NEXT_PUBLIC_GOOGLE_AUTH=true` na Vercel.
