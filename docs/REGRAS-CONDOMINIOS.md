# MN Patrimônios — regras de escala dos condomínios

Demonstração com dados fictícios. Não substitui a convenção coletiva, o contador nem o jurídico.

## Funções
| Função | Regime | Horário | Base legal |
|---|---|---|---|
| Agente de portaria | 12×36 (turmas diurna e noturna, dia sim/dia não) | 07h–19h e 19h–07h, 1h de intervalo | CLT art. 59-A (acordo escrito ou convenção); DSR e feriados compensados; adicional noturno 22h–5h (art. 73) |
| Serviços gerais | 6×1 até 14/12/2026 | Seg–sáb 07h–15h20 (7h20, 44h) | CF art. 7º XIII; DSR no domingo (Lei 605/1949; CLT art. 67) |
| Serviços gerais | 5×2 a partir de 15/12/2026 | Seg–sex 07h–16h24 (8h24, 42h) | EC 141/2026 (promulgada em 16/10/2026) |
| Serviços gerais | 5×2 a partir de 15/12/2027 | Seg–sex 07h–16h (8h, 40h) | EC 141/2026 |

As datas de 15/12/2026 e 15/12/2027 vêm da contagem dos prazos da emenda (60 dias e +12 meses) e ficam em `LABOR_LAW` (`src/domain/config.ts`).

## Proteções automáticas
- 11h entre jornadas (art. 66) e 36h após o plantão da 12×36.
- No máximo 6 dias seguidos no 6×1 e 5 na 5×2.
- Domingo de serviços gerais: folga antecipada + folga do 7º dia.
- Troca entre funções diferentes bloqueada.

## Ponto e banco de horas
- Ponto eletrônico (Portaria MTP 671/2021): 4 marcações; o plantão noturno conta no mesmo registro.
- Tolerância de 5 min por marcação, máximo 10 min/dia (art. 58, § 1º).
- Folga de compensação = 1 jornada (7h20 serviços gerais / 11h portaria). Prazo: 6 meses (acordo individual) ou 12 meses (coletivo).

## Férias
- Períodos de 5 a 30 dias; até 3 períodos, um com 14+ dias (art. 134, § 1º).
- Não começar nos 2 dias antes de feriado ou do descanso semanal (art. 134, § 3º) — aviso, não bloqueio.
