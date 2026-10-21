import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BASE_PEOPLE, PROJECTED_PEOPLE, type ScenarioResult } from "@/domain/five-two-simulator";

export function HelpBubble({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  return (
    <TooltipProvider delayDuration={200}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip open={hover && !open} onOpenChange={setHover}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" className="ft-help" aria-label={"Entender: " + label}><Info size={14} /></button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="ft-explanation-bubble">{description}</TooltipContent>
        </Tooltip>
        <PopoverContent className="ft-explanation-bubble" aria-label={label}>
          <strong>{label}</strong><p>{description}</p>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

export function ScenarioExplanation({ result }: { result: ScenarioResult }) {
  const total = result.metrics.headcount;
  const extra = total - BASE_PEOPLE;
  const growth = (extra / Math.max(1, BASE_PEOPLE) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  });
  return (
    <section className="ft-panel ft-explanation" aria-labelledby="scenario-reading">
      <div className="ft-heading"><div>
        <p className="op-eyebrow">MEMÓRIA DE PLANEJAMENTO</p>
        <h2 id="scenario-reading">Como interpretar a projeção</h2>
        <p>Serviços gerais · 6×1 hoje → 5×2 pela EC 141/2026 · portaria segue na 12×36</p>
      </div></div>
      <div className="ft-reading-grid">
        <div>
          <b>{BASE_PEOPLE} · Serviços gerais hoje (6×1)</b>
          <HelpBubble label="Referência atual" description="Cada pessoa trabalha de segunda a sábado (7h20) e descansa no domingo: 6 jornadas por semana."/>
          <p>Cobrem segunda a sábado com {BASE_PEOPLE} pessoas por dia. Na 5×2 cada um passa a fazer 5 jornadas por semana.</p>
        </div>
        <div>
          <b>{PROJECTED_PEOPLE} · Mínimo para manter o sábado</b>
          <HelpBubble label="Projeção" description="Jornadas necessárias na semana ÷ 5 jornadas por pessoa, arredondado para cima. Não inclui margem para férias e atestados."/>
          <p>Se os condomínios precisarem de serviços gerais também no sábado, a mesma cobertura exige pelo menos {PROJECTED_PEOPLE} pessoas.</p>
        </div>
        <div>
          <b>{total} · Cenário selecionado</b>
          <HelpBubble label="Variação do quadro" description={`Crescimento = (pessoas do cenário − ${BASE_PEOPLE}) ÷ ${BASE_PEOPLE} × 100.`}/>
          <p>{total} pessoas, {extra} adicionais e crescimento de {growth}% sobre o quadro atual de serviços gerais.</p>
        </div>
      </div>
      <div className="ft-reading-result">
        <h3>E a portaria 12×36?</h3>
        <p>A 12×36 continua permitida (art. 59-A da CLT). Na média são 3,5 plantões por semana: <b>{result.portaria.hours.toLocaleString("pt-BR")}h líquidas</b>, abaixo do teto de 42h (e de 40h a partir de 15/12/2027). O que muda é garantir o acordo escrito ou a convenção coletiva e, na média do mês, duas folgas por semana.</p>
        <p><b>Validação pendente:</b> confirmar com cada condomínio se precisa de serviços gerais no sábado, conferir a convenção coletiva e o custo dos reforços antes de contratar.</p>
      </div>
    </section>
  );
}
