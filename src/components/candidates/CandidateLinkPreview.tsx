import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, Info, RotateCcw } from "lucide-react";
import { encode, type Invite } from "@/domain/candidate-link";
import { PROFILE_QUESTIONS } from "@/domain/behavior-profile";
import { DOC_LIST } from "@/domain/candidate-docs";
import { UNIT } from "@/domain/config";
import "./CandidateLinkPreview.css";

type Step = "perfil" | "entrevista" | "documentos";

const STEPS: { id: Step; n: number; title: string; whatsapp: string; does: string[]; system: string[] }[] = [
  { id: "perfil", n: 1, title: "Perfil comportamental",
    whatsapp: "Olá, Maria! Aqui é da MN Patrimônios. O primeiro passo é um teste rápido de perfil (uns 5 minutos)… [link]",
    does: [`Abre o link no celular e responde ${PROFILE_QUESTIONS.length} perguntas, uma por tela.`, "Toca na resposta que mais combina com ele. Não há certo ou errado.", "No fim, toca em Enviar."],
    system: ["Aparece o aviso verde “Novo! Maria respondeu o Perfil”.", "A sub-aba 1 ganha o selo vermelho “1 novo”.", "O recrutador vê o perfil predominante e as perguntas sugeridas para a entrevista.", "Ao aprovar, a candidata sai da sub-aba Perfil e vai para Entrevista, com o selo verde ✓ Perfil."] },
  { id: "entrevista", n: 2, title: "Entrevista",
    whatsapp: "Olá, Maria! Responda a entrevista pelo celular neste link (leva uns 10 minutos)… [link]",
    does: ["Confirma nome e WhatsApp.", "Responde as 10 perguntas da entrevista, uma por vez.", "Revisa e envia as respostas pelo WhatsApp do recrutador."],
    system: ["As respostas entram na ficha de entrevista da candidata.", "O recrutador dá as notas com estrelas e escreve o parecer.", "Ao aprovar, ela sai da sub-aba Entrevista e vai para Ficha de emprego (✓ Perfil ✓ Entrevista)."] },
  { id: "documentos", n: 3, title: "Documentos",
    whatsapp: "Olá, Maria! Parabéns, você foi aprovada. Envie seus documentos por este link (pode tirar foto com o celular)… [link]",
    does: ["Vê a lista do que precisa enviar e o progresso (ex.: 4 de 6).", "Em cada documento toca em Tirar foto ou Escolher arquivo.", "O botão Enviar tudo só libera quando todos estiverem enviados."],
    system: [`Aparece o aviso “Novo! Maria enviou documentos” e os ${DOC_LIST.length} documentos ficam com ✓ Recebido.`, "O recrutador clica em Abrir: o documento aparece ao lado da ficha, com aumentar, diminuir e girar.", "Ele lê e digita os dados na ficha com calma (sem leitura automática da foto, mais seguro)."] },
];

function demoInviteUrl(origin: string): string {
  const inv: Invite = { v: 1, id: "DEMO-PREVIA", name: "Maria Silva", phone: "(91) 9 0000-0000", role: "Agente de portaria", condo: UNIT.unit,
    condoId: "", functionId: "", interviewer: "Recrutador(a) MN", interviewerPhone: "91900000000", date: new Date().toISOString().slice(0, 10) };
  return `${origin}/entrevista?c=${encode(inv)}`;
}

/** Página provisória: mostra, com explicação, como o candidato preenche cada etapa no celular. */
export function CandidateLinkPreview() {
  const [step, setStep] = useState<Step>("perfil");
  const [origin, setOrigin] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const s = STEPS.find(x => x.id === step)!;
  const src = !origin ? "" : step === "perfil" ? `${origin}/perfil?n=Maria` : step === "documentos" ? `${origin}/documentos?n=Maria` : demoInviteUrl(origin);

  return <div className="lp-app">
    <header className="lp-head">
      <p className="op-eyebrow">Captação de candidatos · prévia</p>
      <h1>Link do candidato <span>(prévia)</span></h1>
      <p>Veja como o candidato responde pelo celular em cada etapa. É só demonstração: nada do que for preenchido aqui é gravado.</p>
    </header>

    <nav className="lp-steps" role="tablist" aria-label="Etapas">
      {STEPS.map(x => <button key={x.id} role="tab" aria-selected={x.id === step} className={x.id === step ? "lp-step lp-step-on" : "lp-step"} onClick={() => setStep(x.id)}>
        <span>{x.n}</span>{x.title}</button>)}
    </nav>

    <div className="lp-layout">
      <div className="lp-phone-wrap">
        <div className="lp-phone">{src && <iframe key={`${step}-${reload}`} title={`Tela do candidato: ${s.title}`} src={src} />}</div>
        <div className="lp-phone-actions">
          <button className="lp-btn" onClick={() => setReload(r => r + 1)}><RotateCcw size={16} /> Recomeçar</button>
          {src && <a className="lp-btn" href={src} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Abrir em tela cheia</a>}
        </div>
      </div>

      <aside className="lp-explain">
        <section><h2><span>1</span> O candidato recebe no WhatsApp</h2><p className="lp-wa">{s.whatsapp}</p></section>
        <section><h2><span>2</span> O que ele faz no celular</h2><ul>{s.does.map(t => <li key={t}>{t}</li>)}</ul></section>
        <section><h2><span>3</span> O que acontece no sistema</h2><ul className="lp-sys">{s.system.map(t => <li key={t}>{t}</li>)}</ul></section>
        <p className="lp-note"><Info size={16} /> Na versão final, com banco de dados, as respostas e os documentos chegam sozinhos no sistema, guardados com segurança.</p>
        <a className="lp-btn lp-btn-primary" href="/candidatos">Ir para Captação de candidatos <ArrowRight size={16} /></a>
      </aside>
    </div>
  </div>;
}
