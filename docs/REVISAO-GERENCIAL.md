# Revisão gerencial — Formosa · Augusto Montenegro

**Data:** 19/10/2026  
**Escopo:** revisão do código, da navegação, do painel inicial e das condições necessárias para evolução operacional.  
**Referência de requisitos:** [documento mestre](./FORMOSA-REQUISITOS.md), [regras operacionais](./REGRAS-OPERACIONAIS.md) e [plano por etapas](./PLANO-DE-IMPLEMENTACAO.md).

## Direção do produto

A primeira página deve ajudar o gestor a responder três perguntas: como está o quadro previsto, quais registros precisam de conferência e onde consultar o detalhe. A identidade da Formosa deve aparecer no bordô institucional, na logomarca existente e na identificação da unidade. Legibilidade, espaços e consistência têm prioridade sobre efeitos de vidro, brilhos e muitas cores concorrentes.

Esta revisão adapta práticas documentadas de plataformas empresariais ao porte e à fase do projeto. Não representa certificação, integração com esses fornecedores, comparação de desempenho ou promessa de funcionalidade equivalente.

## Referências pesquisadas

| Fonte primária                                                                                                                                                                                                                                                        | Prática observada                                                                                                               | Decisão para o Formosa                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Workday — Time & Attendance](https://www.workday.com/en-us/products/workforce-management/time.html)                                                                                                                                                                  | Painel gerencial que reúne exceções, revisão de registros e aprovações; histórico de quem alterou uma marcação, o quê e quando. | Dar prioridade às ocorrências que exigem conferência. Planejar autorização e trilha de alterações como requisitos próprios, sem apresentar esses fluxos como entregues.                                     |
| [SAP SuccessFactors — Workforce Analytics](https://help.sap.com/docs/SAP_SUCCESSFACTORS_WORKFORCE_ANALYTICS) e [ferramentas de análise](https://help.sap.com/docs/sap-successfactors-workforce-analytics/using-workforce-analytics/tools-used-in-workforce-analytics) | Métricas com definição comum, dimensões, filtros e consulta detalhada dos registros que compõem um indicador.                   | Explicar o significado de cada indicador, manter data e grupo visíveis, permitir consulta do detalhe e usar as mesmas regras de cálculo em cartões, tabelas e exportações.                                  |
| [UKG — HR Analytics](https://www.ukg.com/products/features/analytics)                                                                                                                                                                                                 | Painéis personalizáveis, indicadores úteis ao papel de cada gestor, relatórios e acesso conforme permissões.                    | Usar uma hierarquia gerencial simples e preparar perfis de acesso antes de dados reais. Personalização inicial significa consulta e apresentação; não implica permissões ou armazenamento já implementados. |

As decisões da última coluna são nossa interpretação de aplicação ao Formosa. Não foram transplantados benchmarks, metas de outras empresas, percentuais de produtividade ou regras trabalhistas desses fornecedores.

## Inventário da base revisada

| Área                        | Implementação existente na base                                                                                                       | Limite                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Visão da operação           | Indicadores derivados, consulta por data, entradas por grupo, classificação de atraso e histórico mensal fictício.                    | Dados determinísticos de demonstração, sem origem em marcações reais.                           |
| Modelo de colaboradores     | 63 pessoas fictícias tipadas; grupos A = 4, B = 29 e C = 30.                                                                          | Não há cadastro, edição, consulta individual ou histórico persistido.                           |
| Descanso entre jornadas     | Função isolada que calcula o intervalo e o horário mínimo da próxima entrada.                                                         | Não existe fluxo de escala/troca que aplique um bloqueio na interface.                          |
| Capacidade por horário      | Cálculo por horários-base, incluindo intervalos.                                                                                      | Não considera uma escala por data, trocas, domingos, feriados ou demanda por faixa horária.     |
| Navegação                   | Nove rotas acessíveis.                                                                                                                | As oito rotas além da home mostram o escopo futuro via `ModulePlaceholder`.                     |
| Autenticação e persistência | Não implementadas nesta fase.                                                                                                         | Não existem permissões, auditoria centralizada, integração com ponto ou banco de dados.         |
| Simulador 5×2               | Requisitos documentados e rota reservada.                                                                                             | Não existe motor de geração/comparação de cenários.                                             |
| Testes na base              | 17 casos unitários em quatro arquivos de domínio, cobrindo descanso, alerta, quadro fictício, ordem de chegada, entradas e histórico. | Não demonstram funcionamento de escalas, aprovações, relatórios, autenticação ou simulação 5×2. |

## Achados e decisões desta revisão

### 1. Informação confiável antes de aparência de controle

O painel original anunciava a regra de descanso como ativa e prometia bloquear trocas. A existência de uma função de validação não significa que o processo de aprovação esteja implantado. A apresentação deve identificar o parâmetro de 11 horas e explicar o estágio de implementação.

Um registro ausente não prova falta, e uma entrada registrada não prova permanência durante todo o turno. Esses limites devem continuar explícitos. O limite operacional de atraso de 10 minutos não é apresentado como desconto, tolerância legal ou decisão disciplinar.

Na base, todos os colaboradores ativos integram o quadro de qualquer data selecionada. A troca de data varia os registros fictícios; não aplica folgas, revezamento dominical ou escala de feriados. O histórico mensal também é uma sequência de demonstrações diárias. Não pode ser usado para avaliação real de pessoas.

### 2. Filtros e leitura do detalhe

Três tabelas simultâneas com seis colunas, fontes pequenas e rolagens internas dificultavam a leitura. A direção adotada é tornar a consulta nominal legível, com busca, recorte por grupo e situação, contagem de resultados e estado vazio compreensível. O significado dos filtros precisa ser explícito: totais da unidade e resultados filtrados não podem se confundir.

Um indicador com aparência de botão deve executar uma ação de consulta. Caso seja apenas informativo, não deve sugerir uma ação inexistente. A conferência deve chegar aos registros correspondentes sem simular aprovação ou gravação de alterações.

O ranking mensal existente é um cálculo operacional fictício. Sua interpretação não deve transformar antecipação em produtividade ou reincidência em prova de falta funcional. Em uma fase com dados reais, a consulta individual dependerá do papel e da responsabilidade do gestor.

### 3. Capacidade prevista com contexto

A série por horário representa pessoas previstas em atividade pelos horários-base. Ela não comprova presença e não mede se a demanda está atendida. Para falar em déficit por faixa horária, será necessário cadastrar a demanda de cada faixa e compará-la com uma escala efetiva, incluindo intervalos, trocas e indisponibilidades.

A distribuição A/B/C e o total de 63 permanecem referências da unidade piloto. Quantidades necessárias não devem ser inventadas para domingos, feriados ou para a projeção 5×2.

### 4. Datas, acessibilidade e impressão

A data de referência deve ser validada e aparecer no conteúdo, inclusive na impressão. O intervalo aceito pelo filtro precisa ser coerente com os cálculos mensais. A seleção de uma data futura não cria uma previsão real.

A navegação recebeu um caminho para pular diretamente ao conteúdo. No móvel, o menu possui botão identificável, estado expandido anunciado, fechamento ao navegar e retorno do foco ao botão ao pressionar Escape dentro do menu. Os módulos ainda não implementados ficam agrupados sob “Módulos em preparação”.

Além da navegação por teclado, a revisão visual deve conferir contraste, ampliação, leitura em notebook e celular, estados sem resultado e impressão sem corte das tabelas. Informação de situação deve ter texto, não apenas cor.

## Plano para implantação

### Próxima etapa: escala operacional demonstrativa

1. Criar entidades de escala por pessoa e data; separar grupo de origem e horário temporário.
2. Modelar folgas, domingos, feriados e indisponibilidades sem presumir proporções não aprovadas.
3. Definir demanda por faixa horária e por grupo com a administração.
4. Implementar solicitação, revisão e aprovação de trocas com motivo e histórico de antes/depois.
5. Aplicar validações de descanso, sobreposição e cobertura no ato de confirmar a mudança.

**Critério de conclusão:** cenários de pelo menos 28 dias, incluindo domingo, virada de mês, ausência, feriado configurado e troca que causa conflito. Uma regra deve ser demonstrada no fluxo que a utiliza, além do teste isolado.

### Administração de pessoal

Entregar cadastro e consulta individual; quatro marcações demonstrativas por jornada; tratamento de inconsistências; férias e afastamentos com período; banco de horas com lançamentos identificáveis; relatórios que respeitem filtros e mostrem unidade, período e origem dos dados. A ausência de uma marcação precisa permanecer distinta de uma ausência confirmada.

**Critério de conclusão:** o gestor consegue conferir a origem de um valor, registrar uma justificativa e consultar o histórico; alterações não desaparecem silenciosamente e relatórios reproduzem o recorte escolhido.

### Simulação 5×2

Construir o motor com estado separado da escala 6×1. Comparar quadro atual de 63, hipótese de 76 e quantidades editáveis por grupo. Considerar cinco dias consecutivos no máximo, folgas conforme a especificação, sábados, domingos, descanso, férias e demanda de cobertura.

**Critério de conclusão:** o resultado explica restrições inviáveis e déficits por data/horário. A hipótese de mais 13 pessoas só é considerada suficiente se o cálculo do cenário demonstrar isso. A simulação nunca altera a escala operacional.

### Uso com dados reais

Antes de inserir dados pessoais reais, entregar persistência centralizada, autenticação, autorização por perfil e unidade, trilha de auditoria, recuperação de dados e testes de acesso. Definir com os responsáveis os dados necessários, retenção, responsáveis pelas aprovações e regras aplicáveis. Conectar ponto, notificações e demais serviços apenas após definição e autorização específicas.

**Critério de conclusão:** piloto validado pelos responsáveis, com importação conferida, permissões testadas e procedimento de recuperação demonstrado. O acabamento visual não substitui essa etapa.

## Verificação e continuidade

Executar as verificações locais relevantes à mudança: testes de domínio (`bunx vitest run`), verificação TypeScript e build. Validar a interface em notebook e celular, consulta por data, filtros, navegação por teclado e impressão. Registrar resultados efetivamente executados na descrição da PR; não tratar comandos previstos como testes aprovados.

Preservar o histórico do GitHub e a sincronização do Lovable. Trabalhar em branch de revisão e submeter as mudanças para avaliação antes de integrar à `main`, conforme o documento mestre. Nenhum banco, integração, dado real ou publicação de produção faz parte desta revisão visual e gerencial.
