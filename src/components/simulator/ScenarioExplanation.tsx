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
  const growth = (extra / BASE_PEOPLE * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  });
  return (
    <section className="ft-panel ft-explanation" aria-labelledby="scenario-reading">
      <div className="ft-heading"><div>
        <p className="op-eyebrow">MEMÓRIA DE PLANEJAMENTO</p>
        <h2 id="scenario-reading">Como interpretar a projeção</h2>
        <p>63 operadores atuais · uma função · três horários integrados</p>
      </div></div>
      <div className="ft-reading-grid">
        <div>
          <b>{BASE_PEOPLE} · Operação atual 6×1</b>
          <HelpBubble label="Referência atual" description="Os 63 operadores atendem à necessidade atual no 6×1, conforme premissa aprovada pela gestão. Não é medição independente do simulador."/>
          <p>Cobertura de 100% informada pela gestão. A, B e C trabalham no mesmo setor e podem se cobrir durante as sobreposições.</p>
        </div>
        <div>
          <b>{PROJECTED_PEOPLE} · Projeção 5×2</b>
          <HelpBubble label="Projeção de 83" description="83 é a projeção gerencial: 20 operadores hipotéticos além dos 63 atuais (+31,7%). A cobertura por horário ainda deve ser validada."/>
          <p>Quadro para estudar a transição para duas folgas semanais, sem exigir equipes completas de cada turno em todos os dias.</p>
        </div>
        <div>
          <b>{total} · Cenário selecionado</b>
          <HelpBubble label="Variação do quadro" description="Crescimento = (pessoas do cenário − 63) ÷ 63 × 100. A distribuição por grupo é ajustável."/>
          <p>{total} operadores, {extra} adicionais e crescimento de {growth}% diante do quadro atual.</p>
        </div>
      </div>
      <div className="ft-reading-result">
        <h3>Como confirmar a cobertura equivalente?</h3>
        <p>Comparar, data por data e horário por horário, os <b>operadores de caixa efetivamente em atividade</b> no 6×1 e no 5×2. Somar A/B/C quando os horários se sobrepõem e descontar os intervalos individuais.</p>
        <p><b>Sem déficits artificiais:</b> os antigos postos-dia e o piso por grupo pressupunham que cada turno funcionava isoladamente. Foram retirados da apresentação porque não descrevem a operação integrada dos caixas.</p>
        <p><b>A tela já calcula:</b> pessoas, folgas intercaladas, sábados integrais, domingos alternados, jornada semanal e alertas de descanso.</p>
        <p><b>Validação pendente:</b> reconstruir a escala individual atual e aferir cobertura por faixa horária, pausas, feriados e ausências. A projeção de {PROJECTED_PEOPLE} não certifica automaticamente 100% de cobertura no 5×2.</p>
      </div>
    </section>
  );
}
