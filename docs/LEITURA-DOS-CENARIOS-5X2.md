# Leitura dos cenários e roteiro de apresentação

## Decisões desta revisão

Mantidos do texto proposto: explicação dos números, ajudas junto aos indicadores, bloco permanente de leitura e distinção entre piso e quadro recomendado.

Aprimoramentos:

- O cenário intermediário passa a 78 pessoas, por escolha gerencial para comparação. Não há justificativa matemática de suficiência para esse número; ele é editável e não representa orçamento aprovado. Distribuição inicial: A = 5, B = 36, C = 37. A ampliação corresponde a 15 pessoas.
- O piso vem da mesma função que calcula o resultado. O botão acompanha alterações da base e usa a distribuição calculada por grupo, em vez de manter 91 fixo ou redistribuir proporcionalmente um piso calculado de outra forma.
- A memória mostra demanda, divisor, arredondamento e os demais limites por grupo.
- O diagnóstico usa demanda, déficit e exemplo de data/grupo extraídos da escala gerada. Não atribui déficits a picos ou funções que o algoritmo não mede.
- Ajudas por mouse, foco e clique/toque, fechadas com Escape; conteúdo em portal para evitar corte pelo painel.
- Não foi adotada a faixa sugerida de 91 a 98: não há cálculo que a sustente.
- A comparação com o quadro de referência limpa a distribuição personalizada antes de recalcular, evitando ocultar o resultado por uma soma de grupos incompatível.
- Relatórios e documentos de requisitos passam a usar o mesmo cenário intermediário.

## Por que o piso-base é 91?

Horizonte: quatro semanas, com cinco jornadas por semana.

Cada pessoa tem 20 jornadas no período. Sábado integral consome quatro; domingo alternado consome duas. Restam **14 jornadas de segunda a sexta**.

| Grupo              | Demanda regular em 20 dias úteis | Divisão por 14, arredondada para cima |
| ------------------ | -------------------------------: | ------------------------------------: |
| A                  |                      4 × 20 = 80 |                                     6 |
| B                  |                    29 × 20 = 580 |                                    42 |
| C                  |                    30 × 20 = 600 |                                    43 |
| Total do piso-base |                                  |                                **91** |

O motor toma, por grupo, o maior entre quadro existente, demanda útil dividida por 14 arredondada para cima, maior meta de sábado e duas vezes a maior meta de domingo. Na base regular, a demanda útil determina os três resultados acima. Metas especiais e feriados podem mudar o piso. Ausências aprovadas afetam a disponibilidade da escala, mas não entram nessa conta agregada.

## Por que não garante 100%?

O piso considera capacidade agregada. O resultado de cobertura exige disponibilidade na data e no grupo corretos. Excedente de um recorte não compensa déficit em outro. Além disso, a distribuição é heurística: ela não prova que todas as escalas possíveis foram examinadas. Um resultado com déficit não demonstra que a contratação seja a única solução.

Cobertura = (demanda total − postos-dia descobertos) ÷ demanda total × 100, no horizonte de 28 dias. Cada déficit é `max(0, meta − disponíveis)` por data e grupo. Postos-dia são unidade de demanda acumulada; não equivalem ao número de pessoas a contratar.

Mesmo 100% nesse indicador não comprova adequação por hora/função, ausência de conflitos de jornada ou viabilidade financeira. Não há cálculo de quadro final recomendado.

## Roteiro breve para a apresentação

“Partimos de 63 pessoas da base demonstrativa. Comparamos uma hipótese intermediária de 78, sem tratar esse número como solução aprovada. Na configuração regular, o piso aritmético é 91: são 6 no grupo A, 42 no B e 43 no C. Essa conta considera que cada pessoa dispõe de 14 jornadas úteis em quatro semanas, além dos sábados e domingos escalados. Depois, verificamos cada data e grupo. O painel mostra quanto foi atendido e onde ainda há lacunas. Antes de decidir contratações, precisamos validar a demanda, conferir as ausências e as regras, testar a distribuição e orçar as alternativas.”

## Uso de recursos e validação

Esta revisão prioriza testes locais. Não adiciona workflows, não dispara Actions manualmente, não conecta serviços e não utiliza geração no Lovable. Antes do merge, conferir checks do commit da PR e respeitar bloqueios existentes. A atualização na main preserva o histórico.

O escopo é explicação e coerência dos cenários; não revisa as referências legislativas preexistentes nem certifica conformidade trabalhista.
