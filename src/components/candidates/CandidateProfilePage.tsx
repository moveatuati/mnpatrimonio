import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info, Send } from "lucide-react";
import { PROFILE_QUESTIONS, type PerfilNome } from "@/domain/behavior-profile";
import { BRAND } from "@/lib/brand";
import "./CandidateInterviewPage.css";

const TOTAL = PROFILE_QUESTIONS.length;

/**
 * Página do celular: teste de perfil comportamental (DEMONSTRAÇÃO).
 * Nesta fase nada é gravado: serve para o cliente ver como o candidato responde.
 */
export function CandidateProfilePage() {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PerfilNome>>({});
  const [sent, setSent] = useState(false);
  useEffect(() => { setName(new URLSearchParams(window.location.search).get("n") ?? ""); }, []);
  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const q = step >= 1 && step <= TOTAL ? PROFILE_QUESTIONS[step - 1]! : null;

  return <div className="ci-page">
    <header className="ci-top">
      <img src={BRAND.logoUrl} alt={BRAND.name} className="ci-logo" />
      <div><b>{BRAND.name}</b><span>Teste de perfil</span></div>
    </header>
    <p className="ci-demo"><Info size={14} /> Demonstração: nenhuma resposta é gravada.</p>

    {sent ? <main className="ci-card ci-center">
      <span className="ci-done"><Check size={30} /></span>
      <h1>Pronto, obrigado!</h1>
      <p>Suas respostas foram enviadas para a <b>{BRAND.name}</b>. Agora é só aguardar o nosso contato pelo WhatsApp.</p>
      <p className="ci-small">No sistema, o recrutador recebe o aviso “Novo! {name || "Candidato"} respondeu o Perfil”.</p>
      <button className="ci-btn ci-btn-ghost" onClick={() => { setAnswers({}); setSent(false); go(0); }}>Ver de novo desde o início</button>
    </main> : <main className="ci-card">
      {step > 0 && <div className="ci-progress" aria-label={`Pergunta ${step} de ${TOTAL}`}><span style={{ width: `${(step / TOTAL) * 100}%` }} /></div>}

      {step === 0 && <>
        <p className="ci-eyebrow">Etapa 1 · Perfil comportamental</p>
        <h1>Olá{name ? `, ${name}` : ""}!</h1>
        <p>Obrigado pelo interesse em trabalhar com a <b>{BRAND.name}</b>. São <b>{TOTAL} perguntas rápidas</b>, uma por vez.</p>
        <p>Escolha a resposta que mais combina com você. <b>Não existe resposta certa ou errada.</b></p>
        <button className="ci-btn ci-btn-primary" onClick={() => go(1)}>Começar <ChevronRight size={18} /></button>
      </>}

      {q && <>
        <p className="ci-eyebrow">Pergunta {step} de {TOTAL}</p>
        <h2 className="ci-qtitle">{q.text}</h2>
        <div className="ci-options" role="radiogroup" aria-label={q.text}>
          {q.options.map(o => <button key={o.text} type="button" role="radio" aria-checked={answers[q.id] === o.perfil}
            className={answers[q.id] === o.perfil ? "ci-opt ci-opt-on" : "ci-opt"} onClick={() => setAnswers({ ...answers, [q.id]: o.perfil })}>
            <span className="ci-opt-dot">{answers[q.id] === o.perfil && <Check size={16} />}</span>{o.text}</button>)}
        </div>
        <div className="ci-nav">
          <button className="ci-btn ci-btn-ghost" onClick={() => go(step - 1)}><ChevronLeft size={18} /> Voltar</button>
          {step < TOTAL
            ? <button className="ci-btn ci-btn-primary" disabled={!answers[q.id]} onClick={() => go(step + 1)}>Próxima <ChevronRight size={18} /></button>
            : <button className="ci-btn ci-btn-wa" disabled={Object.keys(answers).length < TOTAL} onClick={() => setSent(true)}><Send size={18} /> Enviar</button>}
        </div>
      </>}
    </main>}
    <footer className="ci-foot">{BRAND.legalName}</footer>
  </div>;
}
