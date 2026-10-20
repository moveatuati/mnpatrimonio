import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BASE_PEOPLE,
  COMPARISON_PEOPLE,
  minimumBreakdown,
  type ScenarioResult,
} from "@/domain/five-two-simulator";
import type { ScheduleStore } from "@/domain/schedule";

export function HelpBubble({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  return (
    <TooltipProvider delayDuration={200}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip open={hover && !open} onOpenChange={setHover}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" className="ft-help" aria-label={"Entender: " + label}>
                <Info size={14} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="ft-explanation-bubble">{description}</TooltipContent>
        </Tooltip>
        <PopoverContent className="ft-explanation-bubble" aria-label={label}>
          <strong>{label}</strong>
          <p>{description}</p>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

const number = (n: number) => n.toLocaleString("pt-BR");
export function ScenarioExplanation({
  result,
  schedule,
}: {
  result: ScenarioResult;
  schedule: ScheduleStore;
}) {
  const rows = minimumBreakdown(schedule, result.settings.start);
  const m = result.metrics;
  const firstGap = result.coverage.find((row) => row.deficit > 0);
  const covered = m.totalRequired - m.deficitCount;
  const alerts =
    m.restViolations +
    m.badHours +
    m.daysWith11hConflicts +
    m.saturdayUnscheduled +
    m.sundayAlternationErrors;
  return (
    <section className="ft-panel ft-explanation" aria-labelledby="scenario-reading">
      <div className="ft-heading">
        <div>
          <p className="op-eyebrow">MEMÓRIA DE CÁLCULO</p>
          <h2 id="scenario-reading">Como ler esta simulação</h2>
          <p>
            Base demonstrativa · {result.dates[0]?.split("-").reverse().join("/")} a{" "}
            {result.dates.at(-1)?.split("-").reverse().join("/")}
          </p>
        </div>
      </div>
      <div className="ft-reading-grid">
        <div>
          <b>{BASE_PEOPLE} · Quadro de referência</b>
          <HelpBubble
            label="Quadro de referência"
            description="63 é a soma dos cadastros fictícios desta base: A = 4, B = 29 e C = 30. Não é resultado de dimensionamento."
          />
          <p>
            Pessoas fictícias cadastradas: A = 4, B = 29 e C = 30. O cenário testa esse mesmo quadro
            em 5×2; não é a escala atual 6×1.
          </p>
        </div>
        <div>
          <b>{COMPARISON_PEOPLE} · Hipótese de ampliação</b>
          <HelpBubble
            label="Hipótese de ampliação"
            description="78 é uma hipótese de comparação escolhida para este estudo, sem cálculo de suficiência. São 63 pessoas da base e 15 adicionais, distribuídas inicialmente em A = 5, B = 36 e C = 37."
          />
          <p>
            Cenário intermediário escolhido para comparação, com {COMPARISON_PEOPLE - BASE_PEOPLE}{" "}
            pessoas adicionais. Não deriva de uma fórmula de suficiência nem de orçamento aprovado;
            o total pode ser personalizado.
          </p>
        </div>
        <div>
          <b>{result.minimum.total} · Piso calculado nesta base</b>
          <HelpBubble
            label="Piso calculado"
            description={`Nesta base: A = ${result.minimum.groups.A}, B = ${result.minimum.groups.B}, C = ${result.minimum.groups.C}; total ${result.minimum.total}. O piso não otimiza a escala nem inclui reserva para afastamentos. Abra a memória de cálculo abaixo.`}
          />
          <p>
            Soma dos limites por grupo. Na base sem feriados e com metas regulares, resulta em 91.
            Pode mudar com as metas e o calendário. Não é quadro recomendado nem garantia de escala
            viável.
          </p>
        </div>
      </div>
      <details className="ft-calculation">
        <summary>Por que o piso é {result.minimum.total}? Ver a conta por grupo</summary>
        <p>
          <b>4 semanas × 5 jornadas = 20 jornadas por pessoa.</b> Com 4 sábados escalados e 2
          domingos trabalhados, sobram <b>14 jornadas de segunda a sexta</b>. Dividimos a demanda
          desses dias por 14 e arredondamos cada grupo para cima.
        </p>
        <div
          className="ft-scroll-table"
          role="region"
          aria-label="Memória de cálculo por grupo"
          tabIndex={0}
        >
          <table className="ft-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>
                  Demanda seg–sex<small>Postos-dia em 4 semanas</small>
                </th>
                <th>
                  Divisão por 14<small>Arredondar para cima</small>
                </th>
                <th>
                  Outros limites<small>Base / sábado / domingo</small>
                </th>
                <th>Piso do grupo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.group}>
                  <th scope="row">{row.group}</th>
                  <td>{number(row.weekdayNeed)}</td>
                  <td>
                    {number(row.weekdayNeed)} ÷ 14 → {row.weekdayFloor}
                  </td>
                  <td>
                    {row.current} / {row.saturdayMin} / {row.sundayFloor}
                  </td>
                  <td>
                    <b>{row.minimum}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Para cada grupo, o motor usa o maior entre: quadro existente, demanda seg–sex ÷ 14
          arredondada para cima, maior meta de sábado e duas vezes a maior meta de domingo. Soma dos
          grupos:{" "}
          <b>
            {rows.map((row) => row.minimum).join(" + ")} = {result.minimum.total}
          </b>
          .
        </p>
        <p>
          Exemplo da base regular: A = 4 × 20 ÷ 14 → 6; B = 29 × 20 ÷ 14 → 42; C = 30 × 20 ÷ 14 →
          43. Ausências não entram nesse piso; entram na disponibilidade da escala gerada.
        </p>
      </details>
      <div className="ft-reading-result">
        <h3>Por que atingir o piso não garante 100%?</h3>
        <p>
          O piso soma capacidade no período. A cobertura exige atender <b>cada data e cada grupo</b>
          : sobra no sábado ou em outro grupo não compensa uma falta na terça. O motor distribui
          folgas por uma heurística, sem provar que encontrou a melhor escala possível. Um déficit
          no piso não demonstra, sozinho, que contratar mais é a única solução.
        </p>
        <p>
          <b>Neste cenário de {m.headcount} pessoas:</b> {number(covered)} de{" "}
          {number(m.totalRequired)} postos-dia atendidos; {number(m.deficitCount)} descobertos em{" "}
          {m.uncoveredDays} dos 28 dias.
        </p>
        {firstGap && (
          <p>
            Exemplo verificável: {firstGap.date.split("-").reverse().join("/")}, grupo{" "}
            {firstGap.group}: meta {firstGap.required}, escalados {firstGap.planned}, ausentes
            aprovados {firstGap.absent}, disponíveis {firstGap.available}. Déficit:{" "}
            {firstGap.deficit}. Consulte o mapa semanal para as demais datas.
          </p>
        )}
        <p>
          <b>Fórmula da cobertura:</b> ({number(m.totalRequired)} − {number(m.deficitCount)}) ÷{" "}
          {number(m.totalRequired)} × 100
          {m.totalRequired === 0
            ? " — sem demanda configurada; o percentual não permite avaliar cobertura."
            : "."}{" "}
          Cada falta é calculada como máximo entre zero e meta menos disponíveis, por data e grupo.
          Postos-dia não são pessoas a contratar.
        </p>
        <p>
          {alerts > 0
            ? `Há ${alerts} ocorrências de regras para conferir (podem se sobrepor).`
            : "Não foram sinalizados conflitos nas regras verificadas nesta janela."}{" "}
          Mesmo 100% neste indicador não comprova cobertura por hora ou função, nem aprovação da
          implantação.
        </p>
        <p>
          <b>Para decidir o quadro:</b> validar demanda por horário e função, conferir ausências
          aprovadas e déficits, testar redistribuição e só então orçar alternativas. Picos,
          produtividade e substituição entre funções não são medidos pelo percentual atual. Não há
          faixa recomendada de contratação calculada.
        </p>
      </div>
    </section>
  );
}
