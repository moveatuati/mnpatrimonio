# Formosa — Simulador de transição 6×1 para 5×2

## Cenário aprovado para estudo

O supermercado considera os 63 operadores de caixa suficientes em sua escala 6×1. A/B/C são horários de trabalho do mesmo setor, com sobreposições e coberturas mútuas.

No 5×2, a projeção inicial de planejamento é **83 operadores (A=6, B=38, C=39)**. Crescimento +20 operadores, +31,7% sobre 63, hipótese sujeita à confirmação de cobertura.

## Regras fixas

- Quatro semanas, cinco dias de trabalho e duas folgas separadas por semana.
- Sábado com todos escalados; domingos alternados individualmente.
- Máximo de cinco jornadas consecutivas, 11 horas de descanso entre jornadas.
- Feriados, férias e afastamentos em análise; compensações dependem da norma coletiva e validação do RH.
- O Grupo C da proposta retorna do intervalo às 17h, trabalhando até 22h.
- Jornada transitória de 42h sujeita à validação coletiva.

## Alterações de interface

Substituídos os antigos cenários destacados e o piso isolado por 63 referência, 83 projeção e quadro personalizável. O painel mostra crescimento percentual, reforço hipotético e indicadores de folga e presença, sem atribuir falsos déficits aos turnos A/B/C. Foram removidos indicadores e comparação de postos-dia, porque não representam a operação integrada dos operadores de caixa.

O simulador não mede ainda a presença horária real do 6×1 para comprovar a equivalência do 5×2. Portanto 83 não significa contratação aprovada, mínimo definitivo nem cobertura de 100% validada.

## Segurança e validação

Não altera a escala oficial, ponto, férias, banco de horas nem dados financeiros. Testar tipos, lint, Vitest e compilação de produção no ambiente com dependências. Sem acionamento voluntário de GitHub Actions.
