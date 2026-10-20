# Ficha individual e impressão A4 — Formosa

## Entrega
- A janela de consulta passou a ter seis campos de altura regular e um quadro de cinco registros com colunas fixas **Data / Entrada / Situação**.
- O comando **Imprimir ficha A4** abre a página independente `/ficha-colaborador?id=FM-047&date=2026-10-20` em nova guia, sem alterar a pesquisa em andamento.
- A página possui logo SVG oficial, unidade `Augusto Montenegro`, cidade, identificação, grupo, jornada e intervalo-base, resumo de pontualidade e a listagem de entradas de 1º do mês até a data escolhida.
- Na página A4, **Imprimir / salvar PDF** abre a impressão nativa do navegador, podendo imprimir fisicamente ou escolher **Salvar como PDF**.
- Configuração CSS de impressão: formato A4 retrato, margens de 11–12 mm, sem menus nem botões de tela; linhas da tabela protegidas de quebra no meio.

## Cuidados na interpretação
Todos os nomes, horários registrados e totais são **fictícios e determinísticos**. O relatório não equivale a espelho ou comprovante oficial de ponto e não prova trabalho efetivo, assiduidade, faltas, descansos, horas extras ou cumprimento da jornada.
O simulador continua produzindo marcações até em datas que poderiam ser folgas ou domingos; isso é assinalado explicitamente.
O limite de 10 minutos é alerta operacional, não uma tolerância legal.

## Validação
Testes adicionados para conciliação de totais e abertura do relatório, porém devem ser executados em ambiente local junto com build e inspeção da prévia Lovable antes de utilização em produção.
