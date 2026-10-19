# PROJETO FORMOSA — GESTÃO DE PESSOAS
## Documento mestre de implantação e desenvolvimento

**Empresa:** Formosa  
**Unidade piloto:** Augusto Montenegro — Belém/PA  
**Sistema:** Formosa • Gestão de Pessoas  
**Versão de referência:** https://formosa-gestao-am.egatuati.chatgpt.site/  
**Data da especificação:** 19/10/2026

## 1. Objetivo do projeto

Construir uma plataforma profissional de gestão de pessoas, escalas e jornadas para a operação da Formosa.

Já existe uma versão demonstrativa criada no ChatGPT Sites. O objetivo é reconstruir e evoluir esse sistema no Lovable, manter o código no GitHub e transformá-lo progressivamente em uma solução gerencial confiável.

O sistema deve permitir:

- Administrar os colaboradores e as escalas atuais.
- Controlar horários de entrada, intervalo, retorno e saída.
- Administrar folgas, domingos e feriados.
- Registrar e validar trocas de horários.
- Acompanhar atrasos, faltas e pontualidade.
- Administrar férias e afastamentos.
- Controlar banco de horas.
- Emitir relatórios gerenciais.
- Simular a migração da jornada 6×1 para 5×2.
- Comparar a quantidade de funcionários necessária em cada cenário.
- Identificar conflitos de descanso e déficits de cobertura.

O principal objetivo é garantir que a operação continue funcionando com cobertura adequada durante todo o expediente.

**IMPORTANTE:** não alterar o projeto do CRM MoveAtuati. Este será um sistema independente, com repositório próprio.

---

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

### Cenário projetado — 76 colaboradores

| Grupo | Atual | Projeção | Acréscimo |
|---|---:|---:|---:|
| A | 4 | 5 | +1 |
| B | 29 | 35 | +6 |
| C | 30 | 36 | +6 |
| **Total** | **63** | **76** | **+13** |

O acréscimo de 13 colaboradores é apenas uma hipótese para análise. Não representa contratação aprovada.

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
3. Simulação 5×2 com 76 colaboradores.
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

Nunca apresentar a contratação de mais 13 colaboradores como solução comprovadamente suficiente sem executar os cálculos.

---

## 8. Cadastro de colaboradores

Criar um módulo completo de colaboradores, inicialmente com 63 registros fictícios para demonstração.

Informações básicas:

- Identificador interno.
- Nome completo.
- Grupo operacional A, B ou C.
- Horário-base.
- Situação cadastral.
- Data de admissão, quando informada.
- Histórico de escalas.
- Histórico de trocas.
- Histórico de ponto.
- Histórico de folgas.
- Férias e afastamentos.
- Saldo de banco de horas, quando existente.

Campos adicionais devem ser configuráveis conforme a necessidade da empresa.

Não utilizar dados pessoais verdadeiros sem autorização.

Permitir pesquisa, filtros, ordenação, edição e consulta individual.

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

## 12. Relatórios gerenciais

Disponibilizar relatórios semanais, mensais e personalizados.

Relatórios esperados:

- Escala dos colaboradores.
- Folgas programadas.
- Escala dos domingos.
- Escalas de feriados.
- Trocas de horários.
- Entradas e saídas.
- Atrasos e ocorrências.
- Ranking de pontualidade.
- Férias e afastamentos.
- Banco de horas.
- Cobertura dos grupos.
- Comparação 6×1 versus 5×2.
- Déficits operacionais.

Incluir filtros por colaborador, grupo, período e situação.

Permitir impressão em formato A4 e geração de PDF.

Os relatórios devem possuir cabeçalho institucional, período consultado, identificação da unidade, tabelas legíveis e paginação organizada.

---

## 13. Dashboard — Visão da operação

A página inicial deve funcionar como central de acompanhamento gerencial.

A versão demonstrativa possui os seguintes cartões:

- Escalados no dia.
- Entradas registradas.
- Acima do alerta interno.
- Sem entrada registrada.

Na referência visual de 19/10/2026, os valores demonstrativos exibidos eram respectivamente:

63, 63, 6 e 0.

Esses números são apenas dados demonstrativos e não devem ser fixados no código.

Outros elementos da página:

### Cobertura dos grupos

Mostrar quantidade de colaboradores escalados e necessidade operacional por grupo:

- A — Abertura.
- B — Intermediário.
- C — Fechamento.

Utilizar indicadores claros de cobertura, excedente ou déficit.

### Central de atenção

Concentrar alertas relativos a:

- Descanso entre jornadas.
- Conflitos de escala.
- Férias e afastamentos.
- Registros de ponto pendentes.
- Necessidade de cobertura.
- Alterações importantes.

### Ordem de chegada

Tabela dos colaboradores com seus horários, grupos e situação operacional.

### Cobertura ao longo do dia

Representação da quantidade de colaboradores disponíveis nos diferentes horários, considerando entradas, saídas, intervalos e trocas.

Permitir a seleção de uma data de referência.

---

## 14. Estrutura de navegação

Manter os seguintes módulos:

1. **Visão da operação**
2. **Colaboradores**
3. **Escala & trocas**
4. **Ponto simulado**
5. **Férias & afastamentos**
6. **Banco de horas**
7. **Relatórios**
8. **Simulador 5×2**
9. **Regras & histórico**

O menu lateral deve ser organizado, intuitivo e responsivo.

Não misturar operações reais da escala 6×1 com registros de teste do simulador 5×2.

---

## 15. Identidade visual premium

A primeira versão foi considerada visualmente simples pela administração.

A principal solicitação de melhoria foi reforçar o vermelho institucional da Formosa.

Criar um sistema corporativo premium, com identidade moderna, elegante e funcional.

### Paleta proposta

- Vermelho vinho principal: `#83283C`
- Vermelho de destaque: `#B63E50`
- Azul-marinho profundo: `#172B4D`
- Fundo neutro: `#F4F6F9`
- Branco para os cartões e superfícies principais.

Essas cores são uma proposta de evolução, não substituem uma eventual identidade oficial fornecida pela empresa.

### Diretrizes

- Utilizar a logomarca oficial da Formosa quando o arquivo original for disponibilizado.
- Não inventar uma nova logomarca.
- Destacar melhor a identificação da unidade Augusto Montenegro.
- Criar cabeçalho institucional elegante.
- Utilizar indicadores com números destacados.
- Adotar cartões gerenciais mais sofisticados.
- Evitar excesso de cores pastéis.
- Melhorar contraste e hierarquia visual.
- Adotar tabelas com cabeçalhos visíveis.
- Utilizar linhas alternadas.
- Aplicar tamanhos de fonte confortáveis.
- Reduzir barras de rolagem internas desnecessárias.
- Organizar melhor filtros e botões.
- Utilizar vermelho, amarelo, verde e azul conforme o significado de cada situação.
- Priorizar a facilidade de uso pelos gestores.

O resultado deve parecer uma plataforma empresarial profissional, e não apenas um protótipo de demonstração.

### Responsividade

O sistema deve funcionar em notebooks, computadores e dispositivos móveis.

A experiência principal será em computadores administrativos.

---

## 16. Tecnologia e arquitetura

Preparar o projeto utilizando:

- React.
- TypeScript.
- Tailwind CSS.
- Componentes reutilizáveis.
- Organização modular de código.
- Tipagem dos dados.
- Separação entre interface e regras de negócio.
- Validações automatizáveis.
- Estrutura preparada para integração futura com Supabase.

### Persistência inicial

A versão original utiliza dados demonstrativos armazenados apenas no navegador.

Nesta primeira fase, manter o projeto funcional em modo demonstração, com dados fictícios e persistência local quando apropriado.

Preparar a arquitetura para futura migração a um banco de dados centralizado, mas não conectar automaticamente o Supabase nem criar tabelas de produção sem autorização.

A futura migração não deve misturar dados fictícios com dados reais.

### Controle de versões

O projeto será integrado ao GitHub pelo Lovable.

Repositório sugerido: `formosa-gestao-am`.

Desenvolver alterações em branches e preservar a branch `main`.

Priorizar testes locais, evitando execuções desnecessárias de GitHub Actions. Manter as verificações essenciais, sem gerar workflows automáticos desnecessários.

Não realizar merges sem autorização.

---

## 17. Segurança e acessos futuros

A primeira versão não possui gestão completa de permissões individuais.

Preparar a arquitetura para perfis futuros, como:

- Administrador.
- Gerente.
- Operador autorizado.
- Consulta gerencial.

Não considerar autenticação, permissões individuais ou auditoria centralizada como funcionalidades já concluídas.

O controle efetivo de acesso deverá ser implementado antes do uso com dados reais.

---

## 18. WhatsApp e integrações futuras

A ideia original considera notificações futuras pelo WhatsApp.

Possíveis notificações:

- Conflitos de escala.
- Pendências.
- Alterações de horários.
- Avisos de folga.
- Situações que dependem de aprovação.

**Não implementar envio automático de mensagens nesta primeira etapa.**

A integração com WhatsApp e relógio real de ponto dependerá de definição técnica posterior.

---

## 19. Validações e testes obrigatórios

Preparar testes para as principais regras de negócio.

Cenários mínimos:

1. Colaborador do grupo C sai às 22h e tenta entrar às 08h no dia seguinte: identificar conflito.
2. O mesmo colaborador inicia às 09h: validar o intervalo de 11 horas.
3. Troca de horário preservando cobertura: permitir quando cumprir as regras.
4. Troca que provoca ausência de cobertura: alertar e exigir tratamento.
5. Funcionário em férias: não permitir escala regular sem tratar a inconsistência.
6. Tentativa de ultrapassar cinco dias consecutivos no modelo 5×2: identificar conflito.
7. Tentativa de atribuir folga no sábado: sinalizar incompatibilidade com a regra operacional estabelecida.
8. Simulação com 63 funcionários: calcular cobertura real.
9. Simulação com 76 funcionários: recalcular a cobertura, sem presumir suficiência.
10. Alteração de quantidade de funcionários por grupo: atualizar indicadores.
11. Programação de feriado: utilizar efetivo e horários específicos.
12. Registro de atraso superior a 10 minutos: gerar alerta operacional.
13. Relatórios: respeitar os filtros utilizados e apresentar os dados corretos.
14. Verificar a integridade do histórico de trocas e alterações.

Testar os cálculos em uma janela inicial de pelo menos 28 dias, verificando domingos, sequências de trabalho, folgas e cobertura.

As regras devem ser revisadas pelo setor responsável antes da utilização trabalhista oficial.

---

## 20. Diretrizes de implementação por etapas

**Nesta primeira solicitação, não tente desenvolver todo o sistema de uma só vez.**

### Etapa 1 — Fundação do projeto

- Criar a estrutura React, TypeScript e Tailwind.
- Criar a identidade visual premium.
- Criar o menu lateral.
- Criar a Visão da operação.
- Preparar os demais módulos.
- Utilizar os 63 colaboradores fictícios.
- Criar um modelo de dados tipado.
- Separar as regras de negócio da interface.
- Garantir que a aplicação abra sem erros.
- Preparar o repositório para desenvolvimento via GitHub.

### Etapa 2 — Escalas operacionais

- Escala atual 6×1.
- Calendário.
- Domingos.
- Feriados.
- Folgas.
- Trocas.
- Validações de descanso.

### Etapa 3 — Administração de pessoal

- Ponto demonstrativo.
- Férias e afastamentos.
- Banco de horas.
- Histórico e relatórios.

### Etapa 4 — Simulador 5×2

- Comparação de cenários.
- Projeção com 76 funcionários.
- Análise de cobertura.
- Detecção de conflitos.
- Relatórios comparativos.

### Etapa 5 — Preparação para produção

- Persistência centralizada.
- Autenticação e permissões.
- Auditoria.
- Integrações externas.
- Testes de segurança e operação real.

### Documentação obrigatória

Criar no projeto os arquivos:

- `README.md`
- `docs/FORMOSA-REQUISITOS.md`
- `docs/REGRAS-OPERACIONAIS.md`
- `docs/PLANO-DE-IMPLEMENTACAO.md`

Guardar nesses documentos as decisões desta especificação.

**Não eliminar requisitos apenas porque ainda não serão implementados.**

As informações sobre a empresa, os horários, os grupos, as folgas e os critérios de simulação devem permanecer documentadas para desenvolvimento posterior.

---

## 21. Restrições finais

- Não usar informações pessoais verdadeiras nesta demonstração.
- Não apresentar dados fictícios como registros reais.
- Não misturar o simulador 5×2 com a escala atual.
- Não considerar a projeção de 76 colaboradores uma contratação definida.
- Não afirmar conformidade trabalhista sem validação.
- Não modificar outros projetos da MoveAtuati.
- Não criar integrações externas sem autorização.
- Não executar migrações de banco de dados de produção.
- Não publicar automaticamente uma nova versão de produção.
- Não criar workflows GitHub Actions desnecessários.
- Não inventar detalhes operacionais ausentes da especificação.
- Preservar integralmente o histórico de decisões e regras.

**Resultado esperado:** uma estrutura inicial sólida, visualmente premium, funcional, documentada e pronta para continuarmos o desenvolvimento diretamente pelo GitHub, com segurança e sem perder as informações definidas no projeto original da Formosa.