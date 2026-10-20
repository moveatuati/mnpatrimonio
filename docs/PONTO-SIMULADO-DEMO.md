# Ponto simulado — Formosa Augusto Montenegro

## Objetivo
Tela temporária de demonstração, na rota \`/ponto\`, para experimentar marcações de ponto sem conexão com relógio biométrico, relógio eletrônico, controle oficial, folha ou banco de dados. Não deve ser confundida com prova de jornada nem produzir pagamento, desconto ou faltas.

## Funcionalidades
- 63 colaboradores fictícios e escala prevista conforme a mesma chave de armazenamento local usada na aba **Escala & trocas**.
- Quatro marcações em sequência **Entrada → Saída para intervalo → Retorno do intervalo → Saída final** para dias normais.
- Na escala existente de domingo/feriados, apenas entrada/saída são conhecidas; intervalo não é inventado. RH deverá configurar as pausas posteriormente.
- Hora sugerida conforme turno, entrada manual de qualquer \`HH:mm\` válido e botão opcional **Usar hora atual** do dispositivo.
- Impede duplicatas, marcações fora de sequência e horários cronologicamente inconsistentes.
- Corrigir uma marcação já registrada exige justificativa com ao menos oito caracteres; mantém o histórico local anterior.
- Contadores de escalados, com entrada, ciclo completo e situações que exigem atenção.
- Alerta de entrada acima de limiar editável (inicialmente 10 minutos, operacional e **não tolerância legal**) e saída antes do previsto.
- Tabela filtrável com grupos, nome/código e situação, todos os colaboradores em rolagem vertical com títulos fixos.
- Amostra fictícia determinística para o dia escolhido, sem substituir os registros já lançados manualmente.
- Limpar apenas os registros do dia com confirmação; o histórico fica preservado.

## Isolamento
Marcações em chave própria no \`localStorage\`: \`formosa:augusto-montenegro:ponto-demo:v1\`.
A Escala & trocas continua usando \`formosa:augusto-montenegro:escala-demo:v1\`. Nenhuma alteração é gravada no Supabase ou em dispositivo de ponto.

**A Visão da operação continua utilizando seu gerador separado de marcações fictícias.** Ela não deve ser tomada como sincronizada com este novo simulador. Esta etapa é independente até decidir e implementar uma fonte única (preferencialmente o relógio real em futura integração).

## Limitações e cuidados
- Não há autenticação, aprovação oficial, compartilhamento entre dispositivos, auditoria imutável, backup, cálculo de hora extra/banco de horas ou gestão de ausência.
- Escala em folga e marcações previamente criadas: alerta visual de inconsistência; nunca apagar registros silenciosamente.
- Mesmo com quatro marcações, trata-se de simulação — nunca afirmar presença/falta confirmada.
- Dados locais podem ser apagados pelo usuário/navegador.
- Ao integrar ao relógio real, substituir este módulo temporário e estabelecer IDs de colaboradores, unidade, fuso, deduplicação, sincronização e auditoria confiável.

## Verificações recomendadas
Rodar localmente \`npm test -- src/domain/point-simulator.test.ts src/components/point/PointSimulator.test.tsx\`, \`npm run lint\`, \`npm run build\` e verificar impressão/uso no Lovable. Não disparar GitHub Actions sem necessidade.
