# Regras operacionais — Formosa Augusto Montenegro

Extraído da especificação mestre (docs/FORMOSA-REQUISITOS.md). Regras devem ser revisadas pelo setor responsável antes do uso trabalhista oficial.

## 2. Situação atual da empresa

A unidade piloto possui 63 colaboradores, distribuídos em três grupos operacionais.

| Grupo | Colaboradores | Primeiro período | Segundo período |
|---|---:|---|---|
| A — Abertura | 4 | 07h–12h | 14h–16h20 |
| B — Intermediário | 29 | 08h–13h | 15h–17h20 |
| C — Fechamento | 30 | 12h40–15h | 17h–22h |

**Total: 63 colaboradores.**

Os três grupos possuem jornada-base de 7 horas e 20 minutos de trabalho por dia, com períodos de intervalo distintos.

Os horários-base devem ser cadastrados e configuráveis. Os colaboradores pertencem a grupos operacionais, mas podem realizar trocas temporárias de horário.

### Escala atual

- Modelo 6×1.
- Operação de segunda-feira a sábado.
- Todos os colaboradores são normalmente escalados aos sábados.
- Domingos com revezamento.
- Folgas organizadas de acordo com a cobertura operacional.
- Feriados com escalas específicas.
- Intervalos intercalados para manter o funcionamento da empresa.

A escala 6×1 representa a operação atual e deve permanecer completamente separada do simulador 5×2.

---

## 3. Funcionamento aos domingos

Os turnos dominicais informados são:

| Turno | Entrada | Saída |
|---|---|---|
| Manhã 1 | 08h00 | 14h15 |
| Manhã 2 | 09h00 | 15h15 |
| Tarde/noite | 15h15 | 21h30 |

Os colaboradores devem trabalhar em sistema de revezamento, considerando:

1. Distribuição equilibrada dos domingos.
2. Histórico de domingos trabalhados e folgados.
3. Necessidade de cobertura por período.
4. Descanso mínimo entre jornadas.
5. Folgas compensatórias conforme as regras aplicáveis.
6. Férias e afastamentos.
7. Trocas de horários aprovadas.

O sistema deve permitir definir quantas pessoas são necessárias em cada turno.

A regra de alternância deve ser parametrizável, sem inventar uma proporção fixa que não tenha sido confirmada pela administração.

---

## 4. Funcionamento em feriados

Os feriados utilizam uma organização semelhante à dos domingos, mas a quantidade de colaboradores necessários pode variar conforme a demanda.

Referências operacionais informadas:

- Turnos iniciados às 08h e às 09h: aproximadamente 18 a 22 colaboradores no total.
- Período de tarde/noite: aproximadamente 18 colaboradores.
- Quantidades ajustáveis por feriado.
- Revezamento entre colaboradores.
- Preservação do descanso entre jornadas.
- Intervalos e saídas intercalados.

O administrador deve conseguir selecionar uma data, identificar o feriado e configurar o efetivo necessário para cada período.

O sistema não pode aplicar automaticamente uma quantidade fixa de funcionários a todos os feriados.

---

## 5. Regra obrigatória de 11 horas entre jornadas

Esta é uma das regras mais importantes do projeto.

Deve existir um intervalo mínimo de 11 horas consecutivas entre o encerramento de uma jornada e o início da jornada seguinte, observada a legislação e eventuais regras aplicáveis.

**Exemplo obrigatório:**

Um colaborador que encerra sua jornada às 22h somente poderá iniciar a próxima jornada a partir das 09h do dia seguinte.

A verificação deve ocorrer automaticamente ao:

- Criar uma escala.
- Modificar horários.
- Realizar trocas.
- Reorganizar domingos.
- Programar feriados.
- Aplicar uma simulação 5×2.

O cálculo precisa considerar datas diferentes e atravessar a meia-noite corretamente.

Sempre que uma alteração provocar descanso inferior a 11 horas, o sistema deve impedir sua confirmação regular e apresentar uma explicação clara do conflito.

Os conflitos precisam permanecer visíveis para a administração.

---

## 6. Trocas de horários — correção importante do gerente

Uma informação foi corrigida expressamente durante o desenvolvimento original.

**Os colaboradores realizam trocas de horários com frequência.**

Essas trocas ocorrem, por exemplo, quando um funcionário possui um compromisso pessoal e precisa trabalhar em outro horário.

Portanto, o sistema NÃO deve tratar os grupos ou os turnos como absolutamente rígidos.

Deve existir uma funcionalidade de troca contendo:

- Colaborador de origem.
- Colaborador envolvido na troca, quando aplicável.
- Data original.
- Horário original.
- Novo horário.
- Motivo da solicitação.
- Responsável pela autorização.
- Situação da troca.
- Data e horário do registro.
- Histórico da alteração.

Antes de confirmar uma troca, validar:

1. Descanso mínimo de 11 horas.
2. Compatibilidade com férias ou afastamentos.
3. Existência de conflito com outra escala.
4. Cobertura do horário original.
5. Cobertura do novo horário.
6. Regras de folga e sequência de dias trabalhados.

Uma troca temporária não deve alterar permanentemente o grupo de origem do colaborador.

O histórico precisa permitir identificar como estava a escala antes e depois da alteração.

---

## 7. Projeto de migração para jornada 5×2

A administração estuda a possibilidade de migrar para 5×2, inicialmente com intenção de implementação em dezembro de 2026.

**Não considerar essa migração aprovada ou já realizada.**

Precisamos de um simulador capaz de comparar o modelo atual com o modelo proposto.

### Cenário atual — 63 colaboradores

| Grupo | Quantidade |
|---|---:|
| A | 4 |
| B | 29 |
| C | 30 |
| Total | 63 |

### Cenário projetado — 78 colaboradores

| Grupo | Atual | Projeção | Acréscimo |
|---|---:|---:|---:|
| A | 4 | 5 | +1 |
| B | 29 | 36 | +7 |
| C | 30 | 37 | +7 |
| **Total** | **63** | **78** | **+15** |

O acréscimo de 15 colaboradores é apenas uma hipótese para análise. Não representa contratação aprovada.

As quantidades precisam ser editáveis.

### Condições da simulação 5×2

- Cinco dias de trabalho e dois dias de folga por ciclo semanal.
- Folgas preferencialmente separadas, conforme a exigência operacional informada.
- Não programar duas ou mais folgas consecutivas no cenário solicitado.
- Preservar o trabalho aos sábados.
- Realizar revezamento dos domingos.
- Respeitar o descanso de 11 horas.
- Não ultrapassar cinco dias consecutivos trabalhados nesse modelo.
- Considerar férias e afastamentos.
- Preservar a cobertura dos grupos.
- Permitir ajustes de horários e quantitativos.

As restrições devem ser tratadas como condições explícitas da simulação.

**Atenção:** determinadas combinações podem ser matematicamente inviáveis. Se isso acontecer, o sistema não deve apresentar uma escala artificialmente correta.

Deve explicar o conflito e mostrar quais condições precisam ser revistas.

### Comparações gerenciais

Comparar pelo menos:

1. Escala atual 6×1 com 63 colaboradores.
2. Simulação 5×2 mantendo 63 colaboradores.
3. Simulação 5×2 com 78 colaboradores.
4. Cenários personalizados.

Apresentar:

- Colaboradores disponíveis por dia.
- Colaboradores disponíveis por grupo.
- Necessidade de cobertura por horário.
- Déficits de funcionários.
- Excedentes de funcionários.
- Folgas programadas.
- Domingos trabalhados e folgados.
- Conflitos de descanso.
- Dias consecutivos trabalhados.
- Necessidade estimada de reforço do quadro.

Os testes da versão demonstrativa anterior apontaram déficits de cobertura mesmo em situações sem conflitos individuais de jornada. Essa informação precisa ser preservada.

Nunca apresentar a contratação de mais 15 colaboradores como solução comprovadamente suficiente sem executar os cálculos.

---

## 9. Controle de ponto demonstrativo

Criar um módulo de ponto com registros fictícios, destinado a demonstrações e testes.

Cada colaborador poderá registrar:

1. Entrada.
2. Saída para intervalo.
3. Retorno do intervalo.
4. Saída final.

O sistema deve comparar horários previstos e horários registrados.

### Tratamento operacional de atrasos

Foi definido inicialmente um limite de alerta de 10 minutos.

Esse limite deve ser configurável.

Exibir:

- Entradas registradas.
- Entradas pendentes.
- Atrasos dentro do limite de alerta.
- Atrasos acima do limite.
- Ausências sem registro.
- Ocorrências de saída antecipada.
- Inconsistências nos intervalos.

Importante: o alerta operacional de 10 minutos não deve ser confundido automaticamente com regras legais de tolerância de ponto ou descontos salariais.

O sistema demonstrativo não constitui registro eletrônico oficial de ponto.

Não afirmar integração com relógios reais enquanto ela não existir.

---

## 10. Férias e afastamentos

Criar controle de férias e afastamentos.

Cada registro deverá permitir:

- Selecionar colaborador.
- Informar período.
- Definir tipo de ausência.
- Registrar observação.
- Identificar responsável.
- Consultar histórico.
- Alterar ou cancelar um registro autorizado.

Durante uma simulação de escala, considerar a indisponibilidade do colaborador.

Gerar alertas quando férias ou afastamentos provocarem déficit na cobertura da operação.

---

## 11. Banco de horas

Criar inicialmente um banco de horas demonstrativo e configurável.

Registrar:

- Colaborador.
- Data.
- Horas positivas.
- Horas negativas.
- Justificativa.
- Responsável.
- Histórico de movimentações.
- Saldo acumulado.

Não realizar compensações definitivas automaticamente sem regras aprovadas pela administração.

As regras de validade, compensação e limites devem ser confirmadas conforme a legislação, o regime adotado e os instrumentos coletivos aplicáveis.

---
