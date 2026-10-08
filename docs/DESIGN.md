# Sistema de design do Routine (v2)

Objetivo: **cada coisa tem um único jeito de aparecer.** Todo card tem o mesmo raio, borda, sombra e
respiro; todo ícone vem numa caixa de tamanho fixo e fica centralizado; toda linha de lista tem a mesma
altura e as mesmas posições. Quem criar uma tela nova usa os componentes de `components/ui` e não escreve
estilo de card ou de ícone "na mão".

## Escalas (as únicas permitidas)

| Item | Valores | Observação |
|---|---|---|
| Espaçamento | 4 · 8 · 12 · 16 · 24 · 32 px (`1 · 2 · 3 · 4 · 6 · 8`) | 16 px nas laterais da página; 24 px entre seções; 8 px entre linhas de uma lista; 12 px entre ícone e texto |
| Raio | controles `rounded-xl` (20 px) · cards `rounded-2xl` (25 px) · pílulas e botões redondos `rounded-full` | não usar `rounded-3xl` nem valores soltos |
| Elevação | card: borda + `shadow-sm` · aviso e fundo de grupo: sem sombra | uma receita só: `surfaceVariants` |
| Texto | 12 · 14 · 16 · 18 · 20 · 24 · 30 px (`text-xs … text-3xl`) | nada de `text-[11px]` |
| Glifo do ícone | **14** (dentro de texto de 12 px) · **16** (em botões e meta) · **20** (botões de ícone, caixas md) · **24** (caixas lg, botão +) · 32 (só selos do onboarding) | `size-3.5 · 4 · 5 · 6 · 8` |
| Caixa do ícone | **32** (glifo 16) · **40** (glifo 20) · **48** (glifo 24) · 64 (glifo 32, onboarding) | o glifo fica sempre centralizado |
| Alvo de toque | botões e links com **40 px** ou mais; botão só de ícone = 40 × 40 | principais (criar, entrar, sair) com 48 px (`size="lg"`) |
| Seletores | células de ícone e de cor: 44 × 44 px · dias da semana: 40 px | tamanho fixo, nunca derivado da largura da tela |

## Componentes (`components/ui`)

| Componente | Para quê | Anatomia |
|---|---|---|
| `Surface` / `surfaceVariants` | qualquer card | `tone`: card, inset, success, warning, danger, hero, dashed · `padding`: md (16), row (16 × 12), none |
| `IconBadge` | ícone de item, de cartão, de estado | `size` sm/md/lg/xl · `tone` ou `accent` (cor do hábito/pilar, com contraste garantido) · sem ícone mostra um ponto |
| `ListRow` | linha de lista e de navegação | `[ícone] [título + detalhe] [ação ou seta]`, altura mínima 64, link inteiro quando tem `href` |
| `CardHeading` / `Panel` / `HeadingValue` | cabeçalho de cartão (Perfil, Progresso) | `[ícone 40] [título + descrição] [destaque à direita]` |
| `SectionTitle` | título de seção | 12 px, caixa alta, contagem ou ação opcional à direita |
| `StatTile` | número com legenda em grade | mesmo raio, respiro e tipografia; altura igualada pela grade |
| `Notice` | aviso, dica, erro e confirmação | `[ícone 32] [texto + ação]`; `role="alert"` para erro |
| `Chip` | opção em pílula | 40 px de altura |
| `IconButton` / `IconLink` | botão ou link só de ícone | 40 × 40, glifo 20, `label` obrigatório |
| `EmptyState` | lista vazia | selo 48 + título + ação |
| `PageHeader` | topo das telas internas | `[voltar 40] [título] [ação]` na mesma linha |

## Regras de alinhamento

- **Linhas de hábito e de tarefa** têm o mesmo cabeçalho: `[check 32] [nome + detalhes] [ícone 32] [ação 40]`.
  O check fica sempre a 16 px da borda esquerda e o último botão de ícone a 8 px da borda direita, então as
  colunas ficam alinhadas entre hábitos de marcar, de quantidade, de tempo e tarefas.
- **Cartões com ícone** (Perfil, Progresso, Revisão) usam `CardHeading`: o ícone fica alinhado à primeira
  linha do título (ou centralizado, quando só há uma linha) e o número de destaque sempre à direita.
- **Listas de navegação** (Perfil → Gerenciar, Progresso → Calendário) usam `ListRow` com `IconBadge` md e seta.
- **Grades** (`StatTile`, semana): colunas iguais, nada de largura mínima que estoure a tela; a página nunca
  rola na horizontal.
- **Botões com texto e ícone**: o ícone vem do próprio `Button` (16 px). Não passe `size-*` para ele.

## Como conferir

- `npm run check:ui`: varre o código atrás de ícones fora da escala, tamanhos soltos, `rounded-3xl` e
  receitas de card escritas à mão. Roda junto dos outros portões.
- `scripts/check-contrast.mjs` (`npm run check:contrast`): contraste AA das cores nos dois temas.
- No navegador: abra cada tela em 360, 390 e 430 px, nos temas claro e escuro. Os elementos têm
  `data-ui` (`icon-badge`, `icon-button`, `check`, `list-row`, `habit-row`, `task-row`) para facilitar a
  medição automática.

## Ao criar uma tela ou componente novo

1. Precisa de um card? `Surface` (ou `surfaceVariants` num link/botão).
2. Precisa de um ícone? `IconBadge`; em botão, `IconButton`.
3. É uma lista de itens? `ListRow`; um cartão de configuração? `Panel`.
4. Um aviso? `Notice`. Uma opção em pílula? `Chip`.
5. Rodou `npm run check:ui` e abriu a tela em 360 px? Pronto.
