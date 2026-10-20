# Consulta de Colaboradores — demonstração

A rota `/colaboradores` foi convertida de `ModulePlaceholder` para uma página de consulta em padrão visual consistente com o painel revisado pelo Codex. O cabeçalho antigo, que ficava parcialmente coberto devido à margem negativa, foi substituído por um cabeçalho interno sem sobreposição.

**Funcionalidades da fase demonstrativa**
- 63 colaboradores fictícios: A = 4, B = 29, C = 30.
- Resumos clicáveis por grupo, busca por nome ou código, filtro de situação da entrada, data de referência e paginação.
- Lista com grupo, horários-base, intervalo, cadastro e entrada simulada, mais histórico mensal de ocorrências acima de dez minutos.
- Ficha individual de consulta com horários-base, entrada da data selecionada e amostra das últimas cinco datas simuladas.
- Campos não disponíveis (admissão, banco de horas, férias, trocas e edição) informados claramente como não cadastrados ou não implementados.

**Limites importantes**
- Sem banco de dados, autenticação, gravação nem cadastro editável.
- A demonstração atual gera marcações por data mesmo em dias sem escala real; não representa presenças, ausências, folgas ou cumprimento de jornadas.
- Marcações ausentes não comprovam faltas.
- Dez minutos é parâmetro interno de alerta, não regra legal de tolerância.

**Validação**
Executar localmente `npm test -- src/components/employees/CollaboratorsDirectory.test.tsx`, `npm run build` e `npm run lint`, sem disparar workflows remotos desnecessários. Conferir a visualização em notebook e celular e a abertura/fechamento da ficha individual.
