# Formosa — Relatórios gerenciais integrados (modo demonstração)

## Escopo e objetivos
Sete relatórios prioritários: (1) resumo executivo; (2) cobertura por grupo e dia; (3) ponto e pontualidade; (4) férias e afastamentos; (5) banco de horas; (6) escalas, folgas e trocas; (7) comparativo TEÓRICO 6×1/5×2.
Referência gerencial: ADP Workforce Management — centralização de escalas, ponto, ausências e exceções; Ministério do Trabalho e Emprego — Portaria 671/2021 e diferenças entre espelho oficial de ponto, AEJ e AFD.

## Fontes / critérios
- Escalas e trocas: `formosa:augusto-montenegro:escala-demo:v1` (leitura). Escalados por dia, grupo, domingo/feriado, folgas e solicitações de trocas do intervalo.
- Ponto: `formosa:augusto-montenegro:ponto-demo:v1` (leitura). Apenas registros manualmente salvos ou amostra gerada naquele módulo; NÃO usar o gerador independente da Visão da operação como presença real.
- Férias/afastamentos: `formosa:augusto-montenegro:ausencias-demo:v1` (leitura). Somente períodos aprovados são indisponibilidade, pendências informadas à parte. Dia de ausência pode coincidir com folga; não dobrar desconto na cobertura.
- Banco de horas: `formosa:augusto-montenegro:banco-horas-demo:v1` (leitura). Minutos inteiros. Somente lançamentos aprovados até o fim do intervalo entram no saldo acumulado; pendentes/recusados aparecem no extrato sem alterar saldo.
- Sem registro de entrada: sinalizar SEM REGISTRO, nunca falta comprovada. Pontualidade = entradas com atraso até limite / total de entradas realmente registradas. Sem entradas, percentual indisponível, não zero.
- Relatório cobertura = escalados - ausentes aprovados (entre os escalados), versus meta diária por grupo. Déficit em postos-dia; pessoas extras em outros dias/grupos não eliminam o déficit de um período diferente.
- Datas personalizadas limitadas a 93 dias consecutivos; pesquisa por grupo e por funcionário. Ao filtrar por um funcionário, não comparar sua escala com a meta completa do grupo.
- Relatório de escalas mostra domingos/feriados/folgas e solicitações de trocas; o de horas lista aprovados, pendentes, recusados, estornos e responsável.
- 6×1/5×2: simples capacidade teórica semanal 63×6=378, 63×5=315, 76×5=380 jornadas-pessoa. Hipóteses, não implantação de escala, parecer legal, distribuição de turnos ou custos.

## Layout e exportação
Identidade visual com a marca Formosa em cabeçalho, período, unidade, indicadores, tabela completa e rodapé demonstrativo. Botão IMPRIMIR / PDF invoca o navegador para impressão A4; não gera arquivo fiscal.
Exportação CSV da categoria selecionada com todas as linhas mesmo que a tela mostre somente as primeiras 120. Limitar exibição inicial evita uma página excessivamente longa. Impressão inclui o restante dos registros.
CSV utiliza proteção contra fórmula iniciada por =, +, -, @, tabulação e retorno de carro.

## Distinção legal
Relatórios produzidos aqui NÃO são arquivos fiscais AFD/AEJ nem Espelho de Ponto Eletrônico regulamentar. A Portaria 671/2021 e documentação do MTE exigem origem, tratamento e requisitos específicos para esses arquivos; nenhum dos registros fictícios deve ser entregue como comprovação legal.
Também não calcular automaticamente horas extras, descontos, banco de horas legal, encargos trabalhistas ou folha. Exigir a validação das regras, horários e normas coletivas antes de migrar do simulador ao relógio oficial.

## Testes e economia de Actions
Testes de domínio e interface: `npm test -- src/domain/management-reports.test.ts src/components/reports/ReportsWorkspace.test.tsx`.
Depois, localmente: `npm run lint`, `npm run build` e validar CSS de impressão A4 no navegador.
Evitar acionar GitHub Actions e impedir workflows de disparar a cada commit de desenvolvimento. O merge é feito somente após revisão do escopo.