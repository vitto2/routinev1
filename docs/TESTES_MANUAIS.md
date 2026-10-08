# Roteiro de testes manuais

Os testes automáticos cobrem as regras (pontuação, sequência, pausa, desafios, fila offline, CSV) e o
banco (`npm run check:db`). O que **só você consegue conferir** é o app publicado, com sua conta e seu
celular. Marque cada item; se algo não for como descrito, anote o passo e o que apareceu.

Use o app publicado no Chrome (PC e celular). Para testar isolamento de dados, uma segunda conta numa
janela anônima.

## 0. Preparação

- [ ] `supabase/migrations/0004_v2.sql` rodada no SQL Editor (pode rodar de novo sem problema).
- [ ] No formulário de hábito aparecem os campos **Rotina**, **Lembrete** e **Desafio**.

## 1. Conta

- [ ] Criar conta nova (email e senha): cai no onboarding; o modal pode ser pulado.
- [ ] Sair e entrar de novo: volta para **Hoje**.
- [ ] Tentar entrar com senha errada: mensagem clara, sem travar.
- [ ] (Se configurou) botão **Continuar com o Google** aparece e entra; o nome vem do Google.

## 2. Cadastros

- [ ] Pilar com nome vazio: mostra erro no campo e não salva. Com nome: aparece na lista.
- [ ] Hábito "Beber água" (quantidade, 3000 ml, todo dia): aparece em Hoje com botões +250/+500.
- [ ] Hábito só em seg/qua/sex: não aparece na terça.
- [ ] Hábito "3 vezes por semana": aparece como "0/3 nesta semana".
- [ ] Hábito de evitar: marcar significa "consegui evitar".
- [ ] Tarefa para hoje com horário daqui a ~20 min.
- [ ] Editar a frequência de um hábito antigo: o histórico dos dias passados não muda.

## 3. Hoje

- [ ] Tocar marca e desmarca na hora, com animação suave.
- [ ] Ao concluir aparece "Concluído · Desfazer" por ~6 s; Desfazer volta ao estado anterior.
- [ ] Quantidade: +250 ml três vezes soma; ao chegar na meta o hábito conclui; o "−" diminui.
- [ ] Ícone de **nota**: salvar um texto, fechar, reabrir (o texto continua).
- [ ] Tarefa: concluir e desfazer; editar e excluir pedem confirmação.

## 4. Dias passados, Semana e Progresso

- [ ] **Semana**: tocar na célula de ontem abre o dia; marcar um hábito lá atualiza a Semana.
- [ ] Dia futuro não permite marcar.
- [ ] Depois de marcar o mesmo hábito em dias seguidos, aparece a sequência 🔥 e, em marcos (3, 7...),
      uma mensagem de parabéns.
- [ ] **Progresso**: alternar **7 / 30 / 60 dias**; "vezes feito" de cada hábito bate com o que você marcou.
- [ ] **Calendário** (`Progresso → Calendário`): cada dia mostra %, ícone e tom; tocar abre o dia.
- [ ] **Revisão semanal** (`/review`): mostra a semana contra a anterior, melhor e pior dia.

## 5. Pausa (Perfil)

- [ ] Pausar um hábito até uma data: some de Hoje, aparece a faixa "Modo pausa" com **Retomar**.
- [ ] Retomar: o hábito volta e a sequência **não** foi zerada.
- [ ] Pausar todos os hábitos e retomar.

## 6. Rotinas, desafios e lembrete por hábito (depois da 0004)

- [ ] Perfil → Rotinas: criar "Manhã"; reordenar com os botões subir/descer.
- [ ] Atribuir um hábito à rotina: Hoje agrupa os hábitos sob o nome dela.
- [ ] Hábito com desafio de 21 dias: aparece "Desafio: dia 1/21" e um cartão em Progresso.
- [ ] Hábito com **Lembrete** ~10 min à frente (precisa do push ativo): chega a notificação (o cron roda
      a cada 5 min, então pode levar até 5 min a mais).

## 7. Notificações (Perfil)

- [ ] **Ativar lembretes**, permitir no Chrome, tocar **Enviar teste**: a notificação chega.
- [ ] Tocar na notificação abre o app em Hoje.
- [ ] **Sair** da conta e, em outra conta, **Enviar teste**: **não** deve chegar neste aparelho (a
      assinatura é cancelada ao sair).
- [ ] No iPhone só funciona com o app instalado na Tela de Início.

## 8. Exportar

- [ ] Perfil → **Exportar meus dados**: baixa `registros`, `tarefas` e `hábitos` (.csv).
- [ ] Abrir no Excel: acentos corretos, colunas separadas, números com vírgula decimal.

## 9. Instalar e offline

- [ ] Chrome → ícone de instalar na barra de endereço (PC) ou "Adicionar à tela inicial" (celular):
      abre em janela própria, com o ícone certo.
- [ ] Roteiro de `docs/OFFLINE.md` ("Como testar à mão"): marcar sem internet, ver a faixa, voltar a
      internet e ver "alterações sincronizadas".
- [ ] Sem internet, as telas Hoje, Semana, Progresso e Perfil abrem (última visita).

## 10. Segurança e isolamento

- [ ] Em janela anônima, criar uma **segunda conta**: ela não vê pilares, hábitos, tarefas nem registros da
      primeira.
- [ ] Sem estar logado, abrir `/today` e `/api/export?tipo=registros`: redireciona para o login.
- [ ] Depois de **Sair**, o botão Voltar do navegador não mostra dados da conta.

## Se algo falhar

1. Anote a tela, o que tocou e a mensagem exibida.
2. Abra o console do Chrome (F12) e copie erros em vermelho.
3. Se o erro mencionar "relation ... does not exist" ou "column ... does not exist", a migration
   correspondente ainda não foi rodada.
