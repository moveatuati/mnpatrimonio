# Formosa — Simulador de transição da escala 6×1 para 5×2

## Legislação em 20/10/2026
Emenda Constitucional 141, promulgada em 16/10/2026. Vigência das duas folgas semanais e teto transitório de 42h a partir de 15/12/2026; limite definitivo 40h a partir de 15/12/2027, sem redução salarial. Um dia de folga preferencialmente aos domingos. Na fase transitória, ampliação diária requer negociação coletiva. A regra excepcional de compensação dos descansos demanda instrumento coletivo e descanso pelo menos a cada semana. Fontes: https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm e https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude

## Referência empresarial verificada
Supernosso: piloto com 500 funcionários em três lojas em março de 2026 e expansão gradual em junho; indicadores de vendas, custos e experiência. O modelo original foi de 44 horas em cinco dias, portanto NÃO representa conformidade automática com a EC 141. https://bhaz.com.br/noticias/bh/supernosso-amplia-escala-5x2-apos-reducao-de-custos-em-teste/

## Funcionalidades
- Quatro semanas por cenário, com todos os 63 trabalhadores fictícios dos grupos A (4), B (29) e C (30). Cenários 63, 76, 91 e quadro personalizado até 140 pessoas. Pessoas adicionais SIM-* são hipotéticas.
- Regra operacional específica da Formosa: SÁBADO todos escalados, independentemente do grupo; DOMINGOS trabalhados alternados individualmente (um sim, um não, duas folgas dominicais por pessoa em quatro semanas). Domingo trabalhado => duas folgas úteis não adjacentes; domingo de folga => uma folga útil não adjacente. Nunca oferecer opção de folgas consecutivas nem sábado livre nesse simulador.
- Cálculo heurístico da melhor cobertura possível a partir das metas presentes na Escala & trocas do mesmo navegador. Não garante otimização global nem direito trabalhista. Calcula postos-dia descobertos e avisos de 11h/descanso/limite semanal.
- Turnos propostos de 8h/dia (40h) e 8h24/dia (42h sob acordo), incluindo grupos A/B/C e fechamento até 22h. Domingo 6h15 nos exemplos; algumas semanas podem somar menos horas.
- Compara cobertura hipotética e disponibilidade da escala atual 6×1. Considera apenas afastamentos aprovados da demonstração quando a data coincidir.
- Exporta CSV da escala hipotética de quatro semanas, sem alterar quaisquer dados originais.
- Guia de implementação: revisar demanda/funcionários; sindicato/RH; testar 4 semanas; piloto de grupos; monitorar atendimento, custos, vendas e bem-estar; validar e aprovar antes de operar.

## Dimensionamento matemático não é recomendação de contratação
Na base sem feriados, as metas de segunda a sexta são 4, 29 e 30 pessoas por dia (por grupo).
Com sábado integral e dois domingos trabalhados nas quatro semanas, cada colaborador só tem 14 jornadas úteis disponíveis no período (20 jornadas em 4 semanas − 4 sábados − 2 domingos).
Assim, o novo limite inferior necessário é A=ceil(4×20/14)=6, B=ceil(29×20/14)=42, C=ceil(30×20/14)=43, TOTAL 91. É um piso matemático, nunca garantia de cobertura efetiva. Os cenários de 63 e 76 devem mostrar seus déficits. A escala pode exigir MAIS de 91 dependendo de feriados, afastamentos, funções, picos e distribuição das folgas.

## Segurança de dados
Apenas leitura de armazenamento de escala e ausências demonstrativas. Nenhuma alteração de ponto, banco de horas, escala, férias, Supabase ou folha. O algoritmo não publica escalas; exige validação RH/jurídico/sindicato.

## Testes
npm test -- src/domain/five-two-simulator.test.ts src/components/simulator/FiveTwoWorkspace.test.tsx
npm run lint
npm run build
Economizar GitHub Actions: preferir validação local, sem disparos manuais.
## Refinamentos de 20/10/2026
- Data de início da fase de 42h: 15/12/2026, conforme Agência Senado em 19/10/2026. Limite definitivo: cronograma interpretado para 15/12/2027. O texto legal especifica dois meses da publicação para a fase transitória e mais um ano para a etapa final. RH deverá confirmar a aplicação aos contratos.
- Verificação de no máximo cinco jornadas consecutivas em qualquer janela de seis dias, inclusive quando as semanas se encontram. Se a heurística não encontrar alternativa, o cenário deve manter um alerta, sem prometer conformidade.
- Novo quadro de acompanhamento com seis indicadores e um checklist de seis etapas de preparação. Nenhum checklist comprova adequação jurídica.
- Estimador financeiro facultativo: número de novas pessoas vezes custo mensal médio informado pelo usuário. Não apura folha, encargos nem substitui orçamento do DP.
- Fonte original da emenda: https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm .
- Fonte do cronograma do Senado: https://www12.senado.leg.br/noticias/audios/2026/10/carga-maxima-de-trabalho-passara-a-42-horas-semanais-em-15-de-dezembro .

## Regras vinculantes deste simulador para a Formosa (20/10/2026)
1. Sábado: 100% do quadro previsto para trabalhar. Férias e afastamentos aprovados podem reduzir a presença efetiva, sem transformar sábado em folga escalada. Feriado no sábado não muda automaticamente a alocação.
2. Domingos: colaboradores divididos em duas fases de rodízio por grupo (A, B e C). Cada pessoa trabalha um domingo e folga no seguinte. Nunca dois domingos trabalhados consecutivos. A cobertura exigida no domingo continua sendo verificada e o déficit exibido.
3. Semana com domingo trabalhado: duas folgas úteis separadas de segunda a sexta, nunca sábado. Semana com domingo de descanso: uma folga útil mais domingo, totalizando duas folgas semanais.
4. Evitar dois dias consecutivos de descanso, inclusive na transição de domingo para segunda. Respeitar no máximo cinco dias de trabalho em sequência e ao menos onze horas entre jornadas; conflito sem solução precisa ser sinalizado, nunca omitido.
5. Feriado: é data especial da configuração de Escalas & trocas. Pode coincidir com jornada ou descanso; a otimização favorece folgas no feriado, mas nunca cria uma terceira folga automática. Se a pessoa descansar numa segunda-feira feriada, a folga da terça-feira seguinte fica proibida pela regra de descanso não adjacente. Direitos de remuneração/compensação dependem da convenção e da natureza da operação.
6. Tooltip nos cards principais e indicadores internos explica denominador, horizonte, limites e causas dos números. Há legenda na escala individual com as quatro condições de jornada/folga e feriado.
7. As regras de sábado e domingo prevalecem sobre o antigo seletor ilustrativo "folgas consecutivas ou intercaladas": o controle foi retirado da interface. A base 6×1 anterior é apenas referência de comparação e não foi modificada.
8. O mínimo de 91 pessoas reflete somente as metas atuais de cobertura e as regras acima. Não é número final para admissão.
9. Exportação CSV recebe automaticamente os descansos e jornadas produzidos pelo mesmo motor de cálculo da tabela.

## Limitações e testes
Testar sábados com todos escalados, quatro domingos com alternância individual, duas folgas por semana, 0 folgas consecutivas, ausência de 6 dias seguidos, feriado na segunda sem folga terça, metas, ausência aprovada e 11h. Se restrições forem incompatíveis, exibir alerta e NÃO declarar implantação validada.
