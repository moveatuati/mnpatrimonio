# Confiabilidade operacional — Etapa 1

## Diagnóstico e escopo
Entrega em 20/10/2026, exclusivamente neste projeto Formosa. O ambiente disponibiliza o checkout gerenciado do projeto, não uma sessão GitHub que permita comprovar a entrega no repositório `moveatuati/rh-formosa-augusto-montenegro`. Nenhum merge, push ou GitHub Actions foi executado.

O gerador retirava os 13 escalados de domingo do sábado anterior, deixando 50 em vez de 63 pessoas. Isso contrariava o sábado integral e escondia a falta de uma escala nominal de folgas úteis confirmada. A base v1 contém regras demonstrativas, overrides, trocas e histórico, mas não uma referência homologada.

## Correção e preservação
- A partir de 20/10/2026, não se deduz folga de sábado a partir de domingo. O primeiro sábado regular seguinte, 24/10, tem A=4/B=29/C=30, salvo overrides explícitos ou feriado específico. Não se inventa folga útil.
- Datas anteriores mantêm a interpretação histórica do demo, inclusive 17/10 com 50 pessoas; não se corrige retroativamente um passado sem confirmação. Overrides explícitos continuam prioritários, mesmo uma folga de sábado já registrada.
- Mantidos schema v1, chaves, registros demonstrativos, solicitações e histórico. Nenhuma escrita ou migração foi acrescentada.
- O simulador mantém explicitamente a comparação antiga até a integração autorizada; Dashboard, Ponto e Relatórios não recebem a nova referência. Consultas futuras que já usam o gerador da escala refletem a correção, mas não equivalem a indicadores validados.

## Replanejamento atômico
`validateChanges` aceita várias datas e um destino por colaborador/data. Avalia o estado final, todas as datas afetadas, 11h entre jornadas e janelas de sete dias, inclusive bordas. Sem metas explícitas, conserva a regra de não agravar déficit do demo. Com metas diárias explícitas, exige atingir cada meta, sem compensar uma data com outra.

Conflitos de sete dias já existentes não impedem uma troca que não os altera; novos conflitos são bloqueados. A revisão integral da referência, por outro lado, exige ausência de todos os conflitos, mesmo preexistentes. O retorno `coverageBefore/After` preserva a primeira data para compatibilidade da tela atual; a validação verifica todo o lote.

## Referência de 28 dias
`src/domain/schedule-reference.ts` prepara snapshots independentes, com versão, revisão anterior, origem, horários congelados, 28 escalas nominais e conflitos. O arquivo `docs/REFERENCIA-6X1-28-DIAS-v1.json` é um **rascunho demonstrativo de 26/10 a 22/11/2026**, escolhido como primeiro ciclo completo futuro, não um período ou distribuição aprovado pela gerência. Não é gravado nem aplicado ao navegador e não substitui dados existentes.

A revisão técnica requer 28 dias completos e seis dias de contexto em cada extremidade, metas por data, limite semanal informado pelo RH/jurídico e parâmetros de jornada inalterados. Calcula minutos semanais líquidos dos turnos cadastrados e bloqueia ultrapassagem do limite informado. Não determina esse limite legalmente por conta própria. Domingo/feriado contabiliza a duração informada; seu intervalo permanece pendente. Estado permanece sempre `aguardando-homologacao`.

## Critérios de aprovação
1. Gerência fornece o período real, escala nominal completa, folgas úteis, domingos, feriados, exceções e disponibilidade; o rascunho não é confirmação.
2. Confirmar necessidade diária, distinta do quadro contratado; hoje A4/B29/C30 é alvo legado, não necessidade horária comprovada. Reduzir metas apenas para fazer o teste passar não é aprovação operacional.
3. Nenhum conflito de 11h ou sete dias; cumprir jornadas, limite semanal confirmado e descansos nas bordas.
4. Confirmar férias/afastamentos, disponibilidade real e intervalos especiais. Nesta etapa não há integração automática com ausências nem motor de cobertura cruzada por horários exatos (Etapa 2).
5. Registrar responsável, data, revisão e parecer de homologação fora deste protótipo. Testes aprovados não são homologação.
6. Só depois executar Etapas 2–4: cobertura compartilhada, comparação 63/83/personalizados sem mínimo presumido, indicadores e correção da hipótese antiga de 78 nos relatórios.

## Ressalvas jurídicas
A referência EC 141/2026, as datas 15/12/2026 e 15/12/2027 e os limites 42/40 presentes no simulador não foram confirmados em texto promulgado nesta entrega. A investigação não conseguiu verificar o texto primário citado. Não representam regra legal certificada. Confirmar existência, publicação, vigência, enquadramento do comércio, convenção coletiva, repouso semanal, domingo/feriado, intervalos, acordos e limites de jornada com RH/jurídico antes de homologar. Esta etapa não altera as regras do simulador.

## Verificações locais
Executar `bunx vitest run src/domain/schedule.test.ts src/domain/schedule-reference.test.ts src/components/schedule/ScheduleWorkspace.test.tsx src/domain/management-reports.test.ts src/domain/rh-settings.test.ts`. Testes cobrem sábado futuro integral, preservação histórica/overrides, replanejamento multidata, cobertura por data, 11h, sete dias, versão de 28 dias, rejeição de referência incompleta e limite semanal parametrizado. O harness verifica compilação; nenhum build manual ou Actions foi acionado.

A suíte completa também foi executada: 154/157 passaram antes do teste adicional semanal. Três falhas estão no simulador fora desta etapa (dois cenários com distribuição incompatível e um seletor antigo “Guia de implementação”). Não foram mascaradas nem alteradas nesta entrega. A aprovação operacional continua bloqueada pela escala confirmada e validação jurídica, não pelo fato de um rascunho conseguir renderizar.