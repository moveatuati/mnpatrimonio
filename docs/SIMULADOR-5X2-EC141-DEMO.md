# Formosa — Simulador de transição da escala 6×1 para 5×2

## Legislação em 20/10/2026
Emenda Constitucional 141, promulgada em 16/10/2026. Vigência das duas folgas semanais e teto transitório de 42h a partir de 15/12/2026; limite definitivo 40h a partir de 15/12/2027, sem redução salarial. Um dia de folga preferencialmente aos domingos. Na fase transitória, ampliação diária requer negociação coletiva. A regra excepcional de compensação dos descansos demanda instrumento coletivo e descanso pelo menos a cada semana. Fontes: https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm e https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude

## Referência empresarial verificada
Supernosso: piloto com 500 funcionários em três lojas em março de 2026 e expansão gradual em junho; indicadores de vendas, custos e experiência. O modelo original foi de 44 horas em cinco dias, portanto NÃO representa conformidade automática com a EC 141. https://bhaz.com.br/noticias/bh/supernosso-amplia-escala-5x2-apos-reducao-de-custos-em-teste/

## Funcionalidades
- Quatro semanas por cenário, com todos os 63 trabalhadores fictícios dos grupos A (4), B (29) e C (30). Cenários 63, 76, 79 e quadro personalizado até 140 pessoas. Pessoas adicionais SIM-* são hipotéticas.
- Cinco jornadas e duas folgas por semana. No modo consecutivo, as folgas são adjacentes no calendário de segunda a domingo; no intercalado, são separadas. Preferência dominical sujeita à demanda.  Mapa de dias, tabela por grupo e escala semanal individual, buscando por pessoa.
- Cálculo heurístico da melhor cobertura possível a partir das metas presentes na Escala & trocas do mesmo navegador. Não garante otimização global nem direito trabalhista. Calcula postos-dia descobertos e avisos de 11h/descanso/limite semanal.
- Turnos propostos de 8h/dia (40h) e 8h24/dia (42h sob acordo), incluindo grupos A/B/C e fechamento até 22h. Domingo 6h15 nos exemplos; algumas semanas podem somar menos horas.
- Compara cobertura hipotética e disponibilidade da escala atual 6×1. Considera apenas afastamentos aprovados da demonstração quando a data coincidir.
- Exporta CSV da escala hipotética de quatro semanas, sem alterar quaisquer dados originais.
- Guia de implementação: revisar demanda/funcionários; sindicato/RH; testar 4 semanas; piloto de grupos; monitorar atendimento, custos, vendas e bem-estar; validar e aprovar antes de operar.

## Dimensionamento matemático não é recomendação de contratação
Na semana-base sem feriados: A=4×6+1=25 postos-dia => mínimo teórico 5 pessoas; B=29×6+6=180 => mínimo 36; C=30×6+6=186 => mínimo 38. Limite inferior de 79 funcionários, sem garantir cobertura por hora, folgas, habilidades, pausas, feriados ou férias. Os 76 colaboradores (+13) são hipótese comercial histórica, não quadro suficiente assegurado.

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
