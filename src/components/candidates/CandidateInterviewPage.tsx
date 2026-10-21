import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, MessageCircle, Pencil, Send } from "lucide-react";
import { INTERVIEW_QUESTIONS, formatPhone } from "@/domain/candidates";
import {
  ABOUT_LIMIT, ANSWER_LIMIT, isPhone, readInvite, replyMessage, replyMissing, replyUrl, whatsappUrl, type Invite, type Reply,
} from "@/domain/candidate-link";
import { BRAND } from "@/lib/brand";
import "./CandidateInterviewPage.css";

type Draft = { name: string; phone: string; answers: Reply["answers"]; step: number };
const draftKey = (id: string) => `mn-entrevista-rascunho-${id}`;
const TOTAL = INTERVIEW_QUESTIONS.length;

/** Página pública (celular) que o candidato abre pelo link enviado no WhatsApp. */
export function CandidateInterviewPage() {
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>({ name: "", phone: "", answers: {}, step: 0 });
  const [sent, setSent] = useState<{ wa: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const inv = readInvite(new URLSearchParams(window.location.search).get("c"));
    setInvite(inv);
    if (!inv) return;
    let restored: Draft | null = null;
    try { const raw = window.localStorage.getItem(draftKey(inv.id)); if (raw) restored = JSON.parse(raw) as Draft; } catch { /* sem rascunho */ }
    setDraft(restored && typeof restored.step === "number" ? restored : { name: inv.name, phone: inv.phone, answers: {}, step: 0 });
  }, []);
  useEffect(() => {
    if (!invite) return;
    try { window.localStorage.setItem(draftKey(invite.id), JSON.stringify(draft)); } catch { /* segue sem rascunho */ }
  }, [draft, invite]);

  const go = (step: number) => { setDraft(d => ({ ...d, step })); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (invite === undefined) return <div className="ci-page"><div className="ci-card ci-center">Carregando…</div></div>;
  if (!invite) return <div className="ci-page"><div className="ci-card ci-center">
    <img src={BRAND.logoUrl} alt={BRAND.name} className="ci-logo" />
    <AlertTriangle size={28} className="ci-warn-ic" /><h1>Link inválido ou incompleto</h1>
    <p>Peça um novo link para quem enviou o convite.</p></div></div>;

  const { step, answers } = draft;
  const q = step >= 1 && step <= TOTAL ? INTERVIEW_QUESTIONS[step - 1] : null;
  const missing = replyMissing(draft.name, draft.phone, answers);

  function send() {
    if (!invite || missing.length) return;
    const rep: Reply = { v: 1, id: invite.id, name: draft.name.trim(), phone: draft.phone, role: invite.role, condoId: invite.condoId, functionId: invite.functionId, interviewer: invite.interviewer,
      answers, sentAt: new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 19) };
    const url = replyUrl(window.location.origin, rep);
    const wa = whatsappUrl(invite.interviewerPhone, replyMessage(rep, url));
    setSent({ wa, url });
    try { window.localStorage.removeItem(draftKey(invite.id)); } catch { /* ok */ }
    window.open(wa, "_blank", "noopener");
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  }

  return <div className="ci-page">
    <header className="ci-top">
      <img src={BRAND.logoUrl} alt={BRAND.name} className="ci-logo" />
      <div><b>{BRAND.name}</b><span>Formulário de candidato</span></div>
    </header>

    {sent ? <main className="ci-card ci-center">
      <span className="ci-done"><Check size={30} /></span>
      <h1>Respostas prontas para envio!</h1>
      <p>O WhatsApp foi aberto com a mensagem para <b>{invite.interviewer}</b>. Toque em <b>enviar</b> no WhatsApp para concluir.</p>
      <a className="ci-btn ci-btn-wa" href={sent.wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> Abrir WhatsApp novamente</a>
      <button className="ci-btn ci-btn-ghost" onClick={() => copy(sent.url)}><Copy size={16} /> {copied ? "Link copiado!" : "Copiar link das respostas"}</button>
      <p className="ci-small">Obrigado pelo interesse na MN Patrimônios. Entraremos em contato.</p>
    </main> : <main className="ci-card">
      {step > 0 && <div className="ci-progress" aria-label={`Etapa ${Math.min(step, TOTAL)} de ${TOTAL}`}>
        <span style={{ width: `${(Math.min(step, TOTAL + 1) / (TOTAL + 1)) * 100}%` }} /></div>}

      {step === 0 && <>
        <p className="ci-eyebrow">Vaga: {invite.role}{invite.condo ? ` · ${invite.condo}` : ""}</p>
        <h1>Olá{invite.name ? `, ${invite.name.split(" ")[0]}` : ""}!</h1>
        <p>Você foi convidado(a) por <b>{invite.interviewer}</b> para a entrevista da <b>{BRAND.name}</b>. São {TOTAL} perguntas rápidas, uma por vez. Responda com calma e sinceridade.</p>
        <label className="ci-f"><span>Nome completo *</span><input autoComplete="name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label className="ci-f"><span>WhatsApp *</span><input inputMode="tel" autoComplete="tel" placeholder="(91) 9 0000-0000" value={draft.phone}
          onChange={e => setDraft({ ...draft, phone: formatPhone(e.target.value) })} />
          {draft.phone && !isPhone(draft.phone) && <em>Informe o número com DDD.</em>}</label>
        <button className="ci-btn ci-btn-primary" disabled={!draft.name.trim() || !isPhone(draft.phone)} onClick={() => go(1)}>Começar <ChevronRight size={18} /></button>
        <p className="ci-small">Suas respostas ficam salvas neste celular até você enviar.</p>
      </>}

      {q && <>
        <p className="ci-eyebrow">Pergunta {step} de {TOTAL}</p>
        <label className="ci-q"><span>{q.label}</span>
          <textarea autoFocus rows={"long" in q ? 8 : 5} maxLength={"long" in q ? ABOUT_LIMIT : ANSWER_LIMIT} value={answers[q.id] ?? ""}
            placeholder="Escreva sua resposta aqui" onChange={e => setDraft({ ...draft, answers: { ...answers, [q.id]: e.target.value } })} />
          <small>{(answers[q.id] ?? "").length}/{"long" in q ? ABOUT_LIMIT : ANSWER_LIMIT}</small></label>
        <div className="ci-nav">
          <button className="ci-btn ci-btn-ghost" onClick={() => go(step - 1)}><ChevronLeft size={18} /> Voltar</button>
          <button className="ci-btn ci-btn-primary" disabled={!answers[q.id]?.trim()} onClick={() => go(step + 1)}>{step === TOTAL ? "Revisar" : "Próxima"} <ChevronRight size={18} /></button>
        </div>
      </>}

      {step === TOTAL + 1 && <>
        <p className="ci-eyebrow">Revisão</p>
        <h1>Confira suas respostas</h1>
        <p className="ci-small">{draft.name} · {draft.phone}</p>
        <ol className="ci-review">{INTERVIEW_QUESTIONS.map((x, i) => <li key={x.id}>
          <b>{i + 1}. {x.label}</b><p>{answers[x.id] || <em>Sem resposta</em>}</p>
          <button className="ci-edit" onClick={() => go(i + 1)}><Pencil size={13} /> Editar</button></li>)}</ol>
        {!!missing.length && <p className="ci-alert"><AlertTriangle size={16} /> Falta responder: {missing.join(", ")}.</p>}
        <div className="ci-nav">
          <button className="ci-btn ci-btn-ghost" onClick={() => go(TOTAL)}><ChevronLeft size={18} /> Voltar</button>
          <button className="ci-btn ci-btn-wa" disabled={!!missing.length} onClick={send}><Send size={18} /> Enviar respostas</button>
        </div>
      </>}
    </main>}
    <footer className="ci-foot">{BRAND.legalName}</footer>
  </div>;
}
