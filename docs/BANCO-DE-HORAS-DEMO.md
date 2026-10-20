# Formosa — Banco de horas: protótipo demonstrativo

## Conceito
Extrato de movimentações para os 63 colaboradores fictícios, com saldos positivos, negativos e pendências.
Não é registro oficial de jornada, folha de pagamento ou banco de horas legalmente autorizado.

## Telas
- Saldos e equipe: cards de saldo positivo, negativo, líquido e pendências; equação mensal; tabela integral com filtros e cabeçalho congelado.
- Novo lançamento: crédito, débito, compensação ou baixa informada, funcionário, competência, horas/minutos, responsável e justificativa. Fica pendente.
- Autorizações: aprovar para contabilizar ou recusar com justificativa. Decisões identificadas apenas como demonstração.
- Extrato individual: saldo anterior, créditos e débitos, saldo final, itens recusados/pendentes e opção de estorno.
- Movimentações e histórico: lançamentos e decisões; exportação CSV integral com TODAS as datas e situações.

## Integridade do saldo
- Valor numérico interno em minutos inteiros, não horas decimais.
- Crédito tem sinal positivo; débito, compensação e baixa informada são negativos.
- Apenas aprovados com data de competência até a referência entram no saldo.
- Saldo anterior é calculado até o último dia do mês anterior; movimentos do mês até a data; saldo final é a soma.
- Exibir total de saldos individuais positivos e negativos separadamente do líquido geral.
- Lançamento aprovado não é removido ou reeditado: estorno simétrico de igual valor e mesma competência preserva o original.
- Exportação CSV inclui os 13 registros ilustrativos iniciais, pendentes, recusados, estornos e novas movimentações.

## Normas e segurança
Referências: art. 59 CLT, FAQ do MTE publicado em 22/01/2026, Pontotel e Factorial.
Acordos podem prever compensação dentro do próprio mês, até seis meses por acordo individual escrito, ou um ano por acordo/convenção coletiva, sujeito a validação de RH/jurídico.
Nunca converter automaticamente registros de ponto, atestados, férias, feriados, saídas antecipadas ou atrasos em débito/crédito sem política autorizada.
Não se calcula quitação em folha, adicional, multa, horas extras devidas nem saldo rescisório.

## Isolamento
Armazenamento apenas no navegador em formosa:augusto-montenegro:banco-horas-demo:v1.
Nenhum módulo anterior é alterado, não há banco real, autenticação, acesso entre dispositivos ou histórico imutável.

## Validação recomendada
npm test -- src/domain/hour-bank.test.ts src/components/hours/HourBankWorkspace.test.tsx
npm run lint
npm run build
Preferir testes locais, evitando GitHub Actions desnecessários.