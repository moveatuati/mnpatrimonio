# Melhorias — escala real, banco de horas e relatórios (21/10/2026)

Demonstração com dados fictícios. Baseada nas folhas reais da Formosa (escala de domingo de 25/10/2026 e folha da semana de 19 a 24/10/2026) e nas regras informadas pelo gerente.

## Regras que o sistema passou a seguir

| Regra | Como funciona |
|---|---|
| Domingo sim, domingo não | Metade de cada grupo trabalha em cada domingo. Ninguém trabalha dois domingos seguidos. |
| Turnos de domingo | 08h–14h15, 09h–15h15 e 15h15–21h30, independentes do grupo da semana. Vagas padrão: 9 + 10 + 10. |
| Descanso de 11h | Quem fecha o sábado às 22h vai para o turno das 15h15. Quem sai às 21h30 só fica à noite se folgar na segunda. |
| Folgas do domingo (confirmado pelo gerente) | Quem trabalha no domingo tem obrigatoriamente 2 folgas: uma ANTES (seg–sáb da mesma semana) e uma DEPOIS (seg–sáb da semana seguinte). Quem não trabalha folga o domingo. O sistema sugere as datas; o gerente pode trocar, mas não pode retirar. |
| Sábado | Equipe completa. |
| Movimento do mês | Alto movimento do dia 28 ao 18; baixo do dia 19 ao 27. A meta dos dias úteis muda conforme o período. |
| Banco de horas | Minutos após a saída viram crédito. 4h: planejar folga. 7h: dar folga (desconta 7h), de preferência do dia 19 ao 27. Saída antecipada ou entrada mais tarde usa o saldo; sem saldo, fica pendente para o RH. |

## O que mudou em cada aba

- **Visão da operação:** faixa de alto/baixo movimento; cartões “Trabalham hoje”, “De folga”, “Férias/atestado” e “Precisam de folga (banco ≥ 7h)”. O painel usa a escala do dia (antes mostrava 63 todos os dias).
- **Colaboradores:** colunas “Hoje” (trabalha ou motivo da folga) e “Banco de horas” com cor.
- **Escala & trocas → Conferência de folgas:** conta, para todas as pessoas e 4 domingos, quem trabalhou, a folga antes e a folga depois; mostra quem está em dia e quem tem pendência. Trocas que tirem uma dessas folgas ou criem dois domingos seguidos são bloqueadas.
- **Escala & trocas:** motivo de cada folga; turnos de domingo por horário; nova área **Folhas para imprimir** (escala de domingo e folgas da semana no mesmo formato do papel); metas de dias úteis por período.
- **Ponto simulado:** domingo usa o turno atribuído naquele domingo.
- **Banco de horas:** nova **Consulta rápida do gerente** — busca por nome, saldo grande, “pode sair 2h mais cedo?”, semáforo, ranking, botão “Dar folga” que já lança na escala.
- **Relatórios:** **Relatórios prontos** — riscos trabalhistas (para o RH), banco de horas (quem precisa compensar), escala de domingo e folgas da semana, todos imprimíveis. A comparação fixa com 78 pessoas foi substituída por um cálculo a partir da escala real.
- **Simulador 5×2:** necessidade real (metas do período, sábado completo, domingo 9+10+10); caixa “Resposta direta”; sábado pode ser folga somente quando a equipe completa do sábado está garantida.
- **Regras & histórico:** vagas por turno de domingo (sem o limite do grupo) e resumo das regras da loja.
- **Ficha do colaborador:** escala de cada dia e saldo do banco.

## Pontos para confirmar com a Formosa

1. ~~Domingo trabalhado gera duas folgas?~~ Confirmado: uma antes e uma depois.
2. A pausa de 15 minutos do domingo é registrada no ponto?
3. Metas mínimas dos dias úteis no alto e no baixo movimento (hoje: 50 e 48 operadores).

## App do gerente (prévia) — aba provisória `/app-gerente`

- **Celular do gerente:** Agora (chegadas por turno, tolerância de 10 min), Alertas (atraso no momento da batida, só para gerentes na loja naquele horário; botões Ciente e Enviar ao RH), Banco (busca por nome, “pode sair mais cedo?”, autoriza e informa o RH), Equipe (folgas, férias, domingo, banco ≥ 7h).
- **Computador do RH:** fila de ocorrências, “Gerar advertência” (numerada, com logo, dados do colaborador e horários), impressão em A4, “Assinada ✔” arquiva no histórico.
- **O gerente não vê:** salário, diagnóstico de atestados, histórico disciplinar completo, simulador e configurações.
- Simulação: hora ajustável e batidas fictícias; o relógio de ponto oficial será conectado depois.
