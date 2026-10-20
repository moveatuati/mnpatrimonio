# Plano de implementação

**Status:** Etapa 1 (Fundação) entregue — identidade visual, menu lateral, Visão da operação, 63 colaboradores fictícios, modelo tipado em `src/domain`, regras de 11h e alerta de atraso com testes.

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
9. Simulação com 78 funcionários: recalcular a cobertura, sem presumir suficiência.
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
- Projeção com 78 funcionários.
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
- Não considerar a projeção de 78 colaboradores uma contratação definida.
- Não afirmar conformidade trabalhista sem validação.
- Não modificar outros projetos da MoveAtuati.
- Não criar integrações externas sem autorização.
- Não executar migrações de banco de dados de produção.
- Não publicar automaticamente uma nova versão de produção.
- Não criar workflows GitHub Actions desnecessários.
- Não inventar detalhes operacionais ausentes da especificação.
- Preservar integralmente o histórico de decisões e regras.

**Resultado esperado:** uma estrutura inicial sólida, visualmente premium, funcional, documentada e pronta para continuarmos o desenvolvimento diretamente pelo GitHub, com segurança e sem perder as informações definidas no projeto original da Formosa.
