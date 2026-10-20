# Formosa · Central de regras e histórico

## Objetivo

Substitui o placeholder `/regras` por central de configurações operacionais da demonstração. São três áreas: horários A/B/C, domingos/feriados, alertas e histórico. Os **63 cadastros originais** permanecem intactos.

### Editáveis e integrados

- Entradas, início/fim dos intervalos e saída de cada grupo A/B/C. Mesma função de operadores de caixa; horários sobrepostos. O Grupo C continua com retorno às 17h na base.
- Três horários especiais utilizados em domingos/feriados.
- Contingente previsto por grupo no domingo e padrão de feriados. Feriados por data, incluindo efetivo específico A/B/C. São armazenados no mesmo objeto de Escala & trocas e aparecem no histórico.
- Alerta operacional de atraso (0–60 min), compartilhado por Dashboard, ponto simulado, regras de pontualidade, histórico mensal e relatórios.
- Mínimo interjornadas ajustável entre 11–16h. Nunca abaixo de 11h.
- Histórico de alterações (antes/depois), justificativa, responsável e horário; junto aos eventos existentes de escala. Controle local do navegador: não é auditoria oficial.

### Regras que não podem ser enfraquecidas pelo painel

O simulador 5×2 mantém sábado integral, domingos alternados, duas folgas não consecutivas e até cinco dias de trabalho consecutivos. A central não configura descontos salariais, autorização automática de feriados nem emite ponto oficial. Ajuste de limites depende de acordo coletivo e confirmação jurídica.

### Propagação e consistência

- Preferências de horários/alertas em `formosa:augusto-montenegro:regras-rh-demo:v1`, versão 1. Validação completa na gravação; configurações inválidas não são aplicadas.
- Horários, turnos e limites aplicados em memória aos módulos que já utilizavam `GROUPS`, `SUNDAY_SHIFTS` e `RULES`. `RootComponent` escuta atualização local e `storage` entre abas do navegador, hidratando configurações antes de remontar os módulos.
- Efetivo e calendário especial preservam `formosa:augusto-montenegro:escala-demo:v1`, incluindo `overrides`, solicitações e histórico de trocas. A correção do filtro de datas permite manter efetivos personalizados por feriado.
- Ponto: limite central atualiza somente `alertMinutes` na base local, mantendo intactas marcações e histórico; o formulário antigo de edição no Ponto foi substituído por referência à central.
- A tela de Escala & trocas continua contendo seus atalhos existentes para contingentes e feriados, mas a Central de Regras passa a ser o ponto de administração unificado.
- Férias, Banco de Horas e Relatórios preservam seus processos de aprovação/lançamento; a Central não inventa regras jurídicas ou financeiras que esses módulos não utilizavam.

### Referências de políticas

- Ministério do Trabalho e Emprego, Portaria MTP 671/2021: controles eletrônicos devem registrar fielmente as marcações; não reescrever ponto existente.
  https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/legislacao/portarias-1/portarias-vigentes-3/PDFPortarian671de8denovembrode2021compilada13.05.2025.pdf
- Ministério do Trabalho e Emprego, orientações: descanso interjornadas de pelo menos 11h, intervalo intrajornada e férias com aviso.
  https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/proteja/duvidas-frequentes/duvidas-frequentes

### Segurança, testes e custos

A central é demonstrativa, sem servidor, autenticação ou auditoria oficial. O usuário deve confirmar acordo coletivo e políticas internas. Foram adicionados testes de armazenamento, validação, integração de ponto, alteração de efetivo, interface e histórico. Testes, tipagem e compilação devem ser executados em ambiente que possua as dependências; GitHub Actions não é acionado manualmente nem configurado para execução automática.
