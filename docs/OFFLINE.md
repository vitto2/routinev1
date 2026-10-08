# Marcar sem internet

O Routine deixa você marcar hábitos e tarefas sem conexão. As marcações ficam guardadas no
aparelho e são enviadas sozinhas quando a internet volta.

## O que funciona sem internet

- Marcar e desmarcar hábitos (check, quantidade, tempo, "evitar") e tarefas, inclusive **Desfazer**.
- Abrir **Hoje, Semana, Progresso e Perfil** (aparece a última versão que você visitou).

## O que exige internet

Criar, editar ou excluir hábitos, pilares, tarefas e rotinas; notas; pausa; exportar CSV; entrar ou
criar conta. Se você tentar offline, o app avisa que não foi possível.

## Como funciona

1. **Toda marcação passa por uma fila no aparelho** (`localStorage`, chave `routine:pending:v1`).
   Cada item é um **estado absoluto**, nunca uma operação:
   "este hábito está concluído em 2026-10-08", "o valor do dia é 1500", "esta tarefa está concluída".
2. A chave do item é `h:{hábito}:{data}` ou `t:{tarefa}`. Marcar e desmarcar várias vezes a mesma
   coisa vira **um único item** (a última escrita vence), e reenviar é **sempre seguro** (idempotente).
3. **Com internet**, o item é enviado na hora (a tela já mostra o resultado, e some da fila ao
   confirmar). **Sem internet**, ele fica guardado e aparece a faixa
   "Sem conexão · N alterações aguardando envio".
4. **Quando sincroniza:** ao abrir o app, quando a internet volta, quando você volta para a aba,
   a cada 30 s enquanto houver pendências, e no botão **Enviar agora** da faixa.
   O envio é em série, do mais antigo para o mais novo, então um item velho nunca sobrescreve um novo.
5. **Erros:**
   - *Rede* (sem conexão, servidor fora do ar, aba com versão antiga do app): o item **nunca é
     descartado**; fica para a próxima tentativa.
   - *Recusado pelo servidor* (data inválida, hábito removido): descartado, com aviso.
   - *Inesperado*: até 10 tentativas, depois descartado para não travar a fila.
6. **Limites:** 300 itens na fila. Se o navegador bloquear o armazenamento (aba anônima), a fila
   funciona só até fechar a aba.

## Service worker (`public/sw.js`, versão `routine-v2`)

- **Navegação:** sempre rede primeiro. Se falhar, serve a última cópia de `/today`, `/week`,
  `/progress` ou `/profile`; sem cópia, mostra `/offline.html`. Não guarda redirecionamentos
  (ex.: sessão expirada indo para o login) nem respostas de erro.
- **Arquivos estáticos** (`/_next/static/`, `/icons/`): servidos do cache e atualizados em segundo plano.
- **Push:** os mesmos handlers de notificação de antes.
- Só é registrado no app publicado (não em `npm run dev`).

## Privacidade

- Ao tocar em **Sair**: o app avisa se houver itens não enviados, apaga a fila e os caches de
  páginas (`*-pages`) e cancela a assinatura de notificações do aparelho.
- Trade-off consciente: o HTML das telas autenticadas fica no cache do navegador até você sair da
  conta. Se preferir ser mais conservador, troque o cache de navegação por "só rede + `/offline.html`"
  em `handleNavigation` (perde a leitura offline das telas).

## Limitações conhecidas

- **iPhone/Safari não têm sincronização em segundo plano:** o envio acontece quando o app está aberto.
- **Duas abas abertas** podem enviar o mesmo item; como é idempotente, só pode aparecer um aviso extra.
- Depois de uma sincronização tardia, a tela pode mostrar o estado antigo por até 3 s antes de
  receber o novo.
- Telas em cache podem estar desatualizadas (são a última visita).
- Depois de uma nova versão do app, uma aba antiga pode falhar ao enviar; o item fica na fila e vai
  quando a página for recarregada.
- Anotações, pausa e demais cadastros não entram na fila (decisão de simplicidade: conflitos de edição
  offline são mais arriscados que o ganho).

## Como testar à mão

1. Publique (ou rode `npm run build && npm start`) e abra o app no Chrome, logado. Visite Hoje, Semana,
   Progresso e Perfil uma vez.
2. DevTools → **Network** → marque **Offline** (ou ative o modo avião no celular).
3. Marque dois hábitos e uma tarefa: aparece a faixa com "3 alterações aguardando envio" e o aviso
   "salvo no aparelho". Recarregue a página: as marcações continuam e as telas abrem.
4. Desmarque **Offline**: em segundos aparece "3 alterações sincronizadas" e a faixa some.
5. Offline de novo, marque algo e toque em **Sair**: deve perguntar se quer descartar.
6. Confira em Application → Local Storage que `routine:pending:v1` some após sair.

## Arquivos

| Arquivo | Papel |
|---|---|
| `lib/offline/queue.ts` | Regras puras da fila (chaves, substituição, classificação de erro) |
| `lib/offline/engine.ts` | Motor: envio em série, tentativas, resumo |
| `lib/offline/overlay.ts` | O que a tela mostra enquanto há item pendente |
| `lib/offline/store.ts` | Armazenamento no aparelho e hooks do React |
| `lib/offline/client.ts` | Liga o motor às ações do servidor (`submitHabitCompletion` etc.) |
| `components/offline/OfflineStatus.tsx` | Faixa de status e gatilhos de sincronização |
| `public/sw.js` | Cache de páginas e estáticos, push |
| `tests/offline.test.ts` | Testes da fila e do motor |
