# Formosa — Escala & trocas (fase demonstrativa)

## Funções disponíveis nesta etapa
A aba `/escala` substitui o placeholder e oferece uma interface funcional de **planejamento simulado**, com a identidade visual aprovada em Colaboradores e Visão da operação.

- Selecionar datas, navegar por semana e visualizar escala e cobertura por grupo.
- Consultar todos os 63 funcionários fictícios, filtrar por grupo e pesquisar por nome/código.
- Registrar ajuste de turno A/B/C ou folga **com motivo obrigatório**, sujeito à validação de descanso/cobertura.
- Solicitar troca entre dois colaboradores na **mesma data** (também turno ↔ folga), informando motivo e preservando a escala enquanto a solicitação estiver pendente.
- Aprovar ou recusar a solicitação. O sistema revalida a escala na aprovação, registra justificativa/parecer e só então aplica a alteração.
- Consultar pendências e histórico de alterações **do navegador atual**.
- Configurar efetivos em domingos, efetivo-padrão de feriados e quantidade **individual por feriado cadastrado**, com data de referência.
- Conferir no quadro o impacto previsto na cobertura antes de efetivar um ajuste.
- Descanso entre jornadas: **11 horas mínimas**; bloqueio de sete dias consecutivos na simulação 6×1.

## Regras-base herdadas do projeto
- Segunda a sábado: grupos A 07:00–12:00 / 14:00–16:20, B 08:00–13:00 / 15:00–17:20, C 12:40–15:00 / 17:00–22:00.
- Domingo: turnos A 08:00–14:15, B 09:00–15:15, C 15:15–21:30.
- Contingente de domingo inicial **A=1, B=6, C=6**, configurável e demonstrativo; não há mais folga automática no sábado anterior. Folgas úteis dependem de escala nominal confirmada pela gerência.
- Contingente-padrão de feriados inicial **A=1, B=6, C=6**, configurável; metas específicas por data de feriado.
- Dias normais: alvo legado do cadastro A=4, B=29, C=30; sábados preservam o quadro disponível. Esses alvos não demonstram necessidade operacional. O rascunho sem folgas úteis confirmadas possui conflitos e não é homologado.
- Qualquer troca ou edição que agrave uma cobertura inferior à meta é bloqueada. A validação observa a jornada anterior e a seguinte; não altera registros oficiais de ponto.

## Como usar
1. Selecione uma data e a semana em **Escala semanal**.
2. Escolha **Ajustar** na linha de um funcionário para alterar seu turno ou colocar uma folga. Descreva o motivo; clique **Registrar ajuste** após os avisos indicarem que pode prosseguir.
3. Para uma troca, abra **Trocas & autorização**, selecione origem e colega, informe motivo e clique **Solicitar troca**. A solicitação permanece **pendente** sem mudar os turnos.
4. Em **Autorizações pendentes**, confira o efeito da troca, preencha o parecer quando necessário e escolha **Aprovar e aplicar** ou **Recusar**. A escala só se altera após aprovação.
5. Ajuste domingos e feriados em **Parâmetros e feriados**. É possível indicar a quantidade de profissionais por grupo em cada feriado específico.
6. Consulte **Histórico** para revisar decisões e intervenções.

## Limites e cuidados obrigatórios
Esta versão é **protótipo funcional local**, não operação empresarial compartilhada: `localStorage` armazena as configurações somente no navegador e perfil utilizados. Outros gestores/dispositivos não compartilham as mudanças. Não existe login do aprovador, trilha de auditoria confiável, controle de perfis, publicação da escala, aceite do empregado, notificação real, comunicação com relógio de ponto, folha de pagamento ou persistência Supabase.

O modelo 6×1 e a compensação dominical foram usados como **parâmetros de demonstração fornecidos pelo cliente**; **não há garantia de aderência à legislação de 2026, convenção coletiva aplicável, regras de domingo/feriado ou acordos específicos**. Antes de publicar escalas reais, confirmar com o RH/jurídico o regime vigente, limitações por gênero/idade quando pertinentes, períodos de descanso, jornada efetiva, repouso semanal e cobertura mínima por função, não apenas grupo.

## Validação
Os novos testes em `src/domain/schedule.test.ts` cobrem domingos, folga seguinte, feriados individualizados, trocas válidas, bloqueios de 11 horas/cobertura e restauração do estado. `src/components/schedule/ScheduleWorkspace.test.tsx` cobre a consulta sem paginação, filtros e fluxo de autorização. Executar **localmente** `npm test -- src/domain/schedule.test.ts src/components/schedule/ScheduleWorkspace.test.tsx`, `npm run lint` e `npm run build` ao disponibilizar ambiente de desenvolvimento; não executar GitHub Actions apenas para essa verificação.
