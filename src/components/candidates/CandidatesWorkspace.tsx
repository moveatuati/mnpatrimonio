import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Archive, Camera, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileSignature,
  Copy, Info, Link2, Lock, MessageCircle, MessageSquareText, Plus, Printer, RotateCcw, Search, Send, Star, Trash2, UserCheck, UserPlus, UserX, Users, X,
} from "lucide-react";
import {
  CANDIDATE_KEY, CRITERIA, EXPERIENCE_SLOTS, FORM_SECTIONS, INTERVIEW_QUESTIONS, REFERENCE_GROUPS, STAGE_LABELS,
  answeredCount, applicationMissing, applicationProgress, decide, demoCandidates, formatCPF, formatPhone, interviewMissing,
  interviewScore, isValidCPF, newCandidate, removeCandidate, reopen, restoreCandidates, setRhOpinion, submit, summary, updateCandidate,
  type Application, type Candidate, type CandidateStore, type Field, type Stage,
} from "@/domain/candidates";
import { UNIT } from "@/domain/config";
import {
  INTERVIEWER_KEY, importReply, inviteMessage, inviteMissing, inviteUrl, makeInvite, readReply, whatsappUrl,
  type InterviewerProfile, type Reply,
} from "@/domain/candidate-link";
import { todayISO } from "@/lib/demo-storage";
import { printNode } from "@/lib/print";
import { PrintHeader } from "@/components/print/PrintHeader";
import "./CandidatesWorkspace.css";

type Tab = "entrevista" | "ficha";
type Notice = { kind: "ok" | "erro" | "info"; text: string } | null;

const br = (v?: string) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const nowISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 19);

const STEPS = [
  { id: "pessoais", title: "Dados pessoais" }, { id: "endereco", title: "Endereço" }, { id: "familia", title: "Família e dependentes" },
  { id: "documentos", title: "Documentos" }, { id: "escolaridade", title: "Escolaridade e cursos" },
  { id: "experiencias", title: "Experiências" }, { id: "referencias", title: "Referências" }, { id: "revisao", title: "Revisão e envio" },
] as const;

function StageBadge({ c }: { c: Candidate }) {
  if (c.application?.rh.verdict) return <span className={`cd-badge cd-b-${c.application.rh.verdict}`}>RH: {c.application.rh.verdict === "apto" ? "Apto" : "Inapto"}</span>;
  if (c.application?.status === "enviada") return <span className="cd-badge cd-b-enviada">Ficha enviada</span>;
  return <span className={`cd-badge cd-b-${c.stage}`}>{STAGE_LABELS[c.stage]}</span>;
}

export function CandidatesWorkspace() {
  const [store, setStore] = useState<CandidateStore>(demoCandidates);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("entrevista");
  const [selected, setSelected] = useState<string>("CAND-002");
  const [formId, setFormId] = useState<string>("CAND-001");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Stage>("all");
  const [notice, setNotice] = useState<Notice>(null);
  const [storageWarn, setStorageWarn] = useState("");
  const [me, setMeState] = useState<InterviewerProfile>({ name: "", phone: "" });
  const [incoming, setIncoming] = useState<Reply | null>(null);
  const setMe = (p: InterviewerProfile) => {
    setMeState(p);
    try { window.localStorage.setItem(INTERVIEWER_KEY, JSON.stringify(p)); } catch { /* fica só nesta sessão */ }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CANDIDATE_KEY);
      if (raw) setStore(restoreCandidates(JSON.parse(raw)));
    } catch { /* usa a demonstração */ }
    try {
      const p = JSON.parse(window.localStorage.getItem(INTERVIEWER_KEY) ?? "null") as InterviewerProfile | null;
      if (p && typeof p.name === "string") setMeState({ name: p.name, phone: String(p.phone ?? "") });
    } catch { /* sem perfil salvo */ }
    const rep = readReply(new URLSearchParams(window.location.search).get("r"));
    if (rep) { setIncoming(rep); setTab("entrevista"); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(CANDIDATE_KEY, JSON.stringify(store)); setStorageWarn(""); }
    catch { setStorageWarn("Não foi possível salvar neste navegador (memória cheia ou modo privado). Os dados ficam só até fechar a página."); }
  }, [store, ready]);

  const stats = useMemo(() => summary(store), [store]);
  const current = store.candidates.find(c => c.id === selected) ?? null;
  const approved = store.candidates.filter(c => c.stage === "aprovado");
  const formCand = approved.find(c => c.id === formId) ?? approved[0] ?? null;

  const apply = (result: Candidate | string, ok?: string) => {
    if (typeof result === "string") { setNotice({ kind: "erro", text: result }); return false; }
    setStore(s => updateCandidate(s, result));
    if (ok) setNotice({ kind: "ok", text: ok });
    return true;
  };
  const patch = (c: Candidate) => setStore(s => updateCandidate(s, c));

  function addCandidate() {
    const created = newCandidate(store, todayISO());
    const id = created.id;
    const next = { ...created.store, candidates: created.store.candidates.map(c => c.id === id ? { ...c, interview: { ...c.interview, interviewer: me.name } } : c) };
    setStore(next); setSelected(id); setTab("entrevista"); setFilter("all"); setSearch("");
    setNotice({ kind: "info", text: "Novo candidato criado. Informe nome e WhatsApp e envie o link da entrevista." });
  }
  function removeCurrent(c: Candidate) {
    if (!window.confirm(`Excluir ${c.name || "este candidato"}? Esta ação não pode ser desfeita.`)) return;
    const r = removeCandidate(store, c.id);
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r); setSelected(r.candidates[0]?.id ?? ""); setNotice({ kind: "info", text: "Candidato excluído." });
  }
  function decideCurrent(c: Candidate, stage: Exclude<Stage, "entrevista">) {
    const msg = stage === "aprovado" ? "Aprovado! A ficha de emprego foi liberada na aba “Ficha de emprego”."
      : stage === "banco" ? "Candidato guardado no banco de talentos." : "Parecer registrado: não aprovado.";
    if (apply(decide(c, stage, nowISO()), msg) && stage === "aprovado") setFormId(c.id);
  }

  function acceptIncoming() {
    if (!incoming) return;
    const r = importReply(store, incoming, todayISO());
    setIncoming(null);
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ok */ }
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r.store); setSelected(r.id); setFilter("all"); setSearch(""); setTab("entrevista");
    setNotice({ kind: "ok", text: `Respostas de ${incoming.name} recebidas. Agora faça a avaliação com as estrelas e dê o parecer.` });
  }

  const list = store.candidates.filter(c => {
    if (filter !== "all" && c.stage !== filter) return false;
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return !q || `${c.name} ${c.role} ${c.id}`.toLocaleLowerCase("pt-BR").includes(q);
  });

  return <div className="cd-app">
    <header className="cd-head">
      <div>
        <p className="op-eyebrow">Gestão de pessoas · {UNIT.unit}</p>
        <h1>Captação de <span>candidatos</span></h1>
        <p>Entrevista → parecer → ficha de emprego → parecer do RH.</p>
      </div>
      <button className="cd-btn cd-btn-primary" onClick={addCandidate}><UserPlus size={16} /> Novo candidato</button>
    </header>

    <div className="cd-demo"><Info size={15} /><span><b>Demonstração:</b> dados fictícios salvos apenas neste navegador. Não use dados reais de candidatos até a conexão com o banco de dados seguro.</span></div>
    {storageWarn && <div className="cd-notice cd-n-erro"><AlertTriangle size={15} /><span>{storageWarn}</span></div>}
    {notice && <div className={`cd-notice cd-n-${notice.kind}`} role="status">
      {notice.kind === "ok" ? <CheckCircle2 size={15} /> : notice.kind === "erro" ? <AlertTriangle size={15} /> : <Info size={15} />}
      <span>{notice.text}</span><button aria-label="Fechar aviso" onClick={() => setNotice(null)}><X size={14} /></button>
    </div>}

    {incoming && <div className="cd-incoming" role="alert">
      <MessageCircle size={18} />
      <div><b>Entrevista respondida por {incoming.name}</b><span>{incoming.role} · {Object.keys(incoming.answers).length} de {INTERVIEW_QUESTIONS.length} respostas · enviado em {br(incoming.sentAt)}</span></div>
      <button className="cd-btn" onClick={() => { setIncoming(null); try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ok */ } }}>Ignorar</button>
      <button className="cd-btn cd-btn-success" onClick={acceptIncoming}><Check size={15} /> Receber respostas</button>
    </div>}

    <section className="cd-stats" aria-label="Resumo">
      <div className="cd-stat"><span><MessageSquareText size={14} /> Em entrevista</span><strong>{stats.interviewing}</strong><small>aguardando parecer</small></div>
      <div className="cd-stat"><span><FileSignature size={14} /> Ficha pendente</span><strong>{stats.awaitingForm}</strong><small>aprovados preenchendo</small></div>
      <div className="cd-stat"><span><Send size={14} /> Fichas enviadas</span><strong>{stats.sent}</strong><small>aguardando o RH</small></div>
      <div className="cd-stat"><span><UserCheck size={14} /> Aptos</span><strong>{stats.fit}</strong><small>prontos para admissão</small></div>
    </section>

    <nav className="cd-tabs" role="tablist" aria-label="Etapas da captação">
      <button role="tab" aria-selected={tab === "entrevista"} className={tab === "entrevista" ? "cd-tab-active" : ""} onClick={() => setTab("entrevista")}>
        <MessageSquareText size={15} /> 1. Entrevista do candidato <b>{store.candidates.length}</b></button>
      <button role="tab" aria-selected={tab === "ficha"} className={tab === "ficha" ? "cd-tab-active" : ""} onClick={() => setTab("ficha")}>
        <FileSignature size={15} /> 2. Ficha de emprego (aprovados) <b>{approved.length}</b></button>
    </nav>

    {tab === "entrevista" ? <div className="cd-split">
      <aside className="cd-panel cd-list">
        <div className="cd-list-tools">
          <label className="cd-search"><Search size={14} /><input placeholder="Buscar nome ou cargo" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <select aria-label="Filtrar etapa" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
            <option value="all">Todas as etapas</option>
            {(Object.keys(STAGE_LABELS) as Stage[]).map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <ul>
          {list.map(c => <li key={c.id}><button className={c.id === selected ? "cd-item cd-item-on" : "cd-item"} onClick={() => setSelected(c.id)}>
            <b>{c.name || "Sem nome"}</b><small>{c.role || "Cargo não informado"} · {br(c.interview.date)}</small>
            <span className="cd-item-foot"><StageBadge c={c} /><em>{answeredCount(c)}/{INTERVIEW_QUESTIONS.length} respostas</em></span>
          </button></li>)}
          {!list.length && <li className="cd-empty"><Users size={18} /> Nenhum candidato encontrado.</li>}
        </ul>
      </aside>
      {current ? <InterviewForm key={current.id} c={current} me={me} setMe={setMe} onChange={patch} onDecide={s => decideCurrent(current, s)}
        onReopen={() => apply(reopen(current), "Entrevista reaberta para edição.")} onRemove={() => removeCurrent(current)}
        onGoForm={() => { setFormId(current.id); setTab("ficha"); }} />
        : <div className="cd-panel cd-blank"><UserPlus size={26} /><p>Selecione um candidato ou clique em <b>Novo candidato</b>.</p></div>}
    </div> : <div className="cd-split">
      <aside className="cd-panel cd-list">
        <p className="cd-list-title"><Lock size={13} /> Só aparecem candidatos aprovados na entrevista.</p>
        <ul>
          {approved.map(c => <li key={c.id}><button className={c.id === formCand?.id ? "cd-item cd-item-on" : "cd-item"} onClick={() => setFormId(c.id)}>
            <b>{c.name}</b><small>{c.role}</small>
            <span className="cd-item-foot"><StageBadge c={c} /><em>{c.application ? `${applicationProgress(c.application)}% preenchido` : ""}</em></span>
            {c.application && <span className="cd-bar"><span style={{ width: `${applicationProgress(c.application)}%` }} /></span>}
          </button></li>)}
          {!approved.length && <li className="cd-empty"><Lock size={18} /> Nenhum aprovado ainda. Aprove um candidato na aba Entrevista.</li>}
        </ul>
      </aside>
      {formCand?.application ? <ApplicationForm key={formCand.id} c={formCand} onChange={patch}
        onSubmit={() => apply(submit(formCand, nowISO()), "Ficha enviada ao RH com sucesso.")}
        onRh={rh => apply(setRhOpinion(formCand, rh), "Parecer do RH registrado.")} />
        : <div className="cd-panel cd-blank"><FileSignature size={26} /><p>A ficha de emprego é liberada após a <b>aprovação na entrevista</b>.</p></div>}
    </div>}
  </div>;
}

/* ─────────────────────────── Entrevista ─────────────────────────── */

function InterviewForm({ c, me, setMe, onChange, onDecide, onReopen, onRemove, onGoForm }: {
  c: Candidate; me: InterviewerProfile; setMe: (p: InterviewerProfile) => void; onChange: (c: Candidate) => void; onDecide: (s: Exclude<Stage, "entrevista">) => void;
  onReopen: () => void; onRemove: () => void; onGoForm: () => void;
}) {
  const locked = c.stage !== "entrevista";
  const missing = interviewMissing(c);
  const score = interviewScore(c);
  const printRef = useRef<HTMLDivElement>(null);
  const setI = (p: Partial<Candidate["interview"]>) => onChange({ ...c, interview: { ...c.interview, ...p } });

  return <section className="cd-panel cd-main">
    <div className="cd-panel-head">
      <div><p className="op-eyebrow">Formulário de candidato · entrevista</p><h2>{c.name || "Novo candidato"}</h2>
        <p>{c.id} · <StageBadge c={c} />{score !== null && <> · média <b>{score.toFixed(1)}</b>/5</>}</p></div>
      <div className="cd-actions">
        <button className="cd-btn" onClick={() => printNode(printRef.current, { title: `Entrevista — ${c.name}` })}><Printer size={15} /> Imprimir</button>
        {!c.application?.sentAt && <button className="cd-btn cd-btn-ghost" onClick={onRemove} aria-label="Excluir candidato"><Trash2 size={15} /></button>}
      </div>
    </div>

    <fieldset disabled={locked} className="cd-body">
      <div className="cd-grid">
        <label className="cd-f cd-wide"><span>Nome *</span><input value={c.name} onChange={e => onChange({ ...c, name: e.target.value })} /></label>
        <label className="cd-f"><span>Candidato ao cargo de *</span><input value={c.role} onChange={e => onChange({ ...c, role: e.target.value })} /></label>
        <label className="cd-f"><span>WhatsApp do candidato *</span><input inputMode="tel" value={c.phone} onChange={e => onChange({ ...c, phone: formatPhone(e.target.value) })} /></label>
        <label className="cd-f"><span>Data *</span><input type="date" value={c.interview.date} onChange={e => setI({ date: e.target.value })} /></label>
        <label className="cd-f"><span>Entrevistador *</span><input value={c.interview.interviewer} placeholder={me.name || "Seu nome"} onChange={e => setI({ interviewer: e.target.value })} /></label>
      </div>
      {!locked && <InviteBox c={c} me={me} setMe={setMe} onSent={at => onChange({ ...c, interview: { ...c.interview, interviewer: c.interview.interviewer || me.name, linkSentAt: at } })} />}

      <h3 className="cd-h3">Perguntas da entrevista <small>{answeredCount(c)}/{INTERVIEW_QUESTIONS.length}</small>
        {c.interview.source === "candidato" && <span className="cd-badge cd-b-aprovado">Respondido pelo candidato em {br(c.interview.receivedAt)}</span>}
        {c.interview.source !== "candidato" && c.interview.linkSentAt && <span className="cd-badge cd-b-entrevista">Link enviado em {br(c.interview.linkSentAt)} · aguardando respostas</span>}</h3>
      <ol className="cd-questions">
        {INTERVIEW_QUESTIONS.map((q, i) => <li key={q.id} className={c.interview.answers[q.id]?.trim() ? "cd-q-done" : ""}>
          <label><span><b>{i + 1}.</b> {q.label}</span>
            <textarea rows={"long" in q ? 5 : 2} value={c.interview.answers[q.id] ?? ""}
              onChange={e => setI({ answers: { ...c.interview.answers, [q.id]: e.target.value } })} placeholder="Anote a resposta do candidato" /></label>
        </li>)}
      </ol>

      <h3 className="cd-h3">Avaliação do entrevistador</h3>
      <div className="cd-criteria">
        {CRITERIA.map(k => <div key={k.id} className="cd-crit"><span>{k.label}</span>
          <div role="radiogroup" aria-label={k.label}>{[1, 2, 3, 4, 5].map(n =>
            <button type="button" key={n} role="radio" aria-checked={c.interview.scores[k.id] === n} aria-label={`${n} de 5`}
              className={(c.interview.scores[k.id] ?? 0) >= n ? "cd-star cd-star-on" : "cd-star"}
              onClick={() => setI({ scores: { ...c.interview.scores, [k.id]: n } })}><Star size={17} /></button>)}</div>
        </div>)}
      </div>
      <label className="cd-f cd-wide"><span>Parecer do entrevistador *</span>
        <textarea rows={3} value={c.interview.opinion} onChange={e => setI({ opinion: e.target.value })} placeholder="Pontos fortes, pontos de atenção e conclusão" /></label>
    </fieldset>

    <footer className="cd-decide">
      {locked ? <>
        <p><CheckCircle2 size={15} /> Parecer: <b>{STAGE_LABELS[c.stage]}</b> em {br(c.decidedAt)}.</p>
        <div className="cd-actions">
          {c.application?.status !== "enviada" && <button className="cd-btn" onClick={onReopen}><RotateCcw size={15} /> Reabrir entrevista</button>}
          {c.stage === "aprovado" && <button className="cd-btn cd-btn-primary" onClick={onGoForm}>Abrir ficha de emprego <ChevronRight size={15} /></button>}
        </div>
      </> : <>
        <p className={missing.length ? "cd-warn" : "cd-okt"}>{missing.length ? <><AlertTriangle size={15} /> Faltam {missing.length} item(ns) para o parecer.</> : <><Check size={15} /> Entrevista completa. Escolha o parecer.</>}</p>
        <div className="cd-actions">
          <button className="cd-btn cd-btn-danger" disabled={!!missing.length} onClick={() => onDecide("reprovado")}><UserX size={15} /> Não aprovar</button>
          <button className="cd-btn" disabled={!!missing.length} onClick={() => onDecide("banco")}><Archive size={15} /> Banco de talentos</button>
          <button className="cd-btn cd-btn-success" disabled={!!missing.length} onClick={() => onDecide("aprovado")}><ClipboardCheck size={15} /> Aprovar e liberar ficha</button>
        </div>
      </>}
    </footer>

    <div className="cd-offscreen" aria-hidden="true"><div ref={printRef} className="cd-print">
      <PrintHeader title="Formulário de candidato — entrevista" subtitle={`${c.name} · ${c.role}`} right={`Data: ${br(c.interview.date)}`} />
      <p className="cd-p-meta">Entrevistador: <b>{c.interview.interviewer || "—"}</b> · Telefone: {c.phone || "—"} · Parecer: <b>{STAGE_LABELS[c.stage]}</b>{score !== null ? ` · Média ${score.toFixed(1)}/5` : ""}</p>
      {INTERVIEW_QUESTIONS.map((q, i) => <div key={q.id} className="cd-p-q"><b>{i + 1}. {q.label}</b><p>{c.interview.answers[q.id] || "—"}</p></div>)}
      <div className="cd-p-q"><b>Avaliação</b><p>{CRITERIA.map(k => `${k.label}: ${c.interview.scores[k.id] ?? "—"}/5`).join(" · ")}</p></div>
      <div className="cd-p-q"><b>Parecer do entrevistador</b><p>{c.interview.opinion || "—"}</p></div>
      <div className="cd-p-sign"><span>Assinatura do entrevistador</span></div>
    </div></div>
  </section>;
}

/* ─────────────────────── Link para o candidato ─────────────────────── */

function InviteBox({ c, me, setMe, onSent }: { c: Candidate; me: InterviewerProfile; setMe: (p: InterviewerProfile) => void; onSent: (at: string) => void }) {
  const [editMe, setEditMe] = useState(!me.name || me.phone.replace(/\D/g, "").length < 10);
  const [copied, setCopied] = useState(false);
  const missing = inviteMissing(c, me);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = missing.length ? "" : inviteUrl(origin, makeInvite(c, me));
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(inviteMessage(makeInvite(c, me), url)); setCopied(true); onSent(nowISO()); window.setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt("Copie o link:", url); }
  }
  return <div className="cd-invite">
    <div className="cd-invite-head"><Link2 size={16} /><div><b>Enviar entrevista para o celular do candidato</b>
      <span>O candidato responde as 10 perguntas no link e devolve pelo seu WhatsApp. Ao abrir a mensagem, as respostas entram aqui.</span></div></div>
    {editMe ? <div className="cd-grid cd-me">
      <label className="cd-f"><span>Seu nome (entrevistador) *</span><input value={me.name} onChange={e => setMe({ ...me, name: e.target.value })} /></label>
      <label className="cd-f"><span>Seu WhatsApp (recebe as respostas) *</span><input inputMode="tel" value={me.phone} onChange={e => setMe({ ...me, phone: formatPhone(e.target.value) })} /></label>
      <button type="button" className="cd-btn cd-btn-sm cd-me-ok" disabled={!me.name.trim() || me.phone.replace(/\D/g, "").length < 10} onClick={() => setEditMe(false)}><Check size={14} /> Salvar meus dados</button>
    </div> : <p className="cd-me-line">Entrevistador: <b>{me.name}</b> · respostas chegam no WhatsApp <b>{me.phone}</b> <button type="button" className="cd-link" onClick={() => setEditMe(true)}>alterar</button></p>}
    {missing.length ? <p className="cd-warn cd-invite-miss"><AlertTriangle size={14} /> Para gerar o link, informe: {missing.join(", ")}.</p>
      : <div className="cd-actions">
        <a className="cd-btn cd-btn-wa" href={whatsappUrl(c.phone, inviteMessage(makeInvite(c, me), url))} target="_blank" rel="noopener noreferrer" onClick={() => onSent(nowISO())}>
          <MessageCircle size={15} /> Enviar link pelo WhatsApp</a>
        <button type="button" className="cd-btn" onClick={copy}><Copy size={15} /> {copied ? "Mensagem copiada!" : "Copiar link"}</button>
        <a className="cd-link" href={url} target="_blank" rel="noopener noreferrer">ver como o candidato vê</a>
      </div>}
  </div>;
}

/* ─────────────────────────── Ficha de emprego ─────────────────────────── */

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("img"));
      img.onload = () => {
        const scale = Math.min(1, 360 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function FieldInput({ f, value, onValue }: { f: Field; value: string; onValue: (v: string) => void }) {
  const cpfBad = f.key === "cpf" && value.replace(/\D/g, "").length === 11 && !isValidCPF(value);
  return <label className={`cd-f${f.wide ? " cd-wide" : ""}${cpfBad ? " cd-f-bad" : ""}`}>
    <span>{f.label}{f.required && " *"}</span>
    {f.type === "select" ? <select value={value} onChange={e => onValue(e.target.value)}>
      <option value="">Selecione</option>{f.options?.map(o => <option key={o}>{o}</option>)}</select>
      : f.type === "textarea" ? <textarea rows={3} value={value} onChange={e => onValue(e.target.value)} />
      : <input type={f.type === "tel" ? "text" : f.type ?? "text"} inputMode={f.type === "tel" || f.key === "cpf" || f.key === "cep" ? "numeric" : undefined}
        placeholder={f.placeholder} value={value}
        onChange={e => onValue(f.key === "cpf" ? formatCPF(e.target.value) : f.type === "tel" ? formatPhone(e.target.value) : e.target.value)} />}
    {cpfBad && <em>CPF inválido — confira os números.</em>}
  </label>;
}

function ApplicationForm({ c, onChange, onSubmit, onRh }: {
  c: Candidate; onChange: (c: Candidate) => void; onSubmit: () => void; onRh: (rh: Application["rh"]) => void;
}) {
  const a = c.application!;
  const sent = a.status === "enviada";
  const [step, setStep] = useState(sent ? STEPS.length - 1 : 0);
  const [rh, setRh] = useState(a.rh);
  const [photoErr, setPhotoErr] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const missing = applicationMissing(a);
  const progress = applicationProgress(a);
  const setA = (p: Partial<Application>) => onChange({ ...c, application: { ...a, ...p } });
  const setField = (k: string, v: string) => setA({ fields: { ...a.fields, [k]: v } });
  const section = (id: string) => FORM_SECTIONS.find(s => s.id === id)!;
  const fields = (id: string) => <div className="cd-grid">{section(id).fields.map(f =>
    <FieldInput key={f.key} f={f} value={a.fields[f.key] ?? ""} onValue={v => setField(f.key, v)} />)}</div>;
  const stepMissing = (id: string) => FORM_SECTIONS.find(s => s.id === id)?.fields.some(f => f.required && !a.fields[f.key]?.trim());

  async function onPhoto(file?: File) {
    setPhotoErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoErr("Envie uma imagem (JPG ou PNG)."); return; }
    try { setA({ photo: await resizePhoto(file) }); } catch { setPhotoErr("Não foi possível ler a foto. Tente outra imagem."); }
  }

  const id = STEPS[step].id;
  return <section className="cd-panel cd-main">
    <div className="cd-panel-head">
      <div><p className="op-eyebrow">Solicitação de emprego · candidato aprovado</p><h2>{a.fields.nome || c.name}</h2>
        <p>{a.fields.cargo || c.role} · <StageBadge c={c} /> · {progress}% preenchido{sent && <> · enviada em {br(a.sentAt)}</>}</p></div>
      <div className="cd-actions"><button className="cd-btn" onClick={() => printNode(printRef.current, { title: `Ficha de emprego — ${a.fields.nome}` })}><Printer size={15} /> Imprimir ficha</button></div>
    </div>

    <ol className="cd-steps" aria-label="Etapas da ficha">
      {STEPS.map((s, i) => <li key={s.id}><button className={i === step ? "cd-step-on" : stepMissing(s.id) ? "cd-step-miss" : ""} onClick={() => setStep(i)}>
        <b>{i + 1}</b><span>{s.title}</span></button></li>)}
    </ol>

    <fieldset disabled={sent && id !== "revisao"} className="cd-body">
      {id === "pessoais" && <div className="cd-photo-row">
        <div className="cd-photo">
          {a.photo ? <img src={a.photo} alt="Foto 3x4 do candidato" /> : <span><Camera size={22} />Foto 3x4</span>}
          {!sent && <label className="cd-btn cd-btn-sm">{a.photo ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/*" capture="user" hidden onChange={e => onPhoto(e.target.files?.[0])} /></label>}
          {a.photo && !sent && <button type="button" className="cd-link" onClick={() => setA({ photo: "" })}>Remover</button>}
          {photoErr && <em>{photoErr}</em>}
        </div>
        {fields("pessoais")}
      </div>}
      {id === "endereco" && fields("endereco")}
      {id === "familia" && <>
        {fields("familia")}
        <h3 className="cd-h3">Dependentes <small>{a.dependents.length}</small></h3>
        {a.dependents.map((d, i) => <div key={i} className="cd-row3">
          <label className="cd-f"><span>Nome *</span><input value={d.nome} onChange={e => setA({ dependents: a.dependents.map((x, j) => j === i ? { ...x, nome: e.target.value } : x) })} /></label>
          <label className="cd-f"><span>Parentesco</span><input value={d.parentesco} onChange={e => setA({ dependents: a.dependents.map((x, j) => j === i ? { ...x, parentesco: e.target.value } : x) })} /></label>
          <label className="cd-f"><span>Data de nascimento</span><input type="date" value={d.nascimento} onChange={e => setA({ dependents: a.dependents.map((x, j) => j === i ? { ...x, nascimento: e.target.value } : x) })} /></label>
          {!sent && <button type="button" className="cd-btn cd-btn-ghost" aria-label="Remover dependente" onClick={() => setA({ dependents: a.dependents.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>}
        </div>)}
        {!sent && <button type="button" className="cd-btn cd-btn-sm" onClick={() => setA({ dependents: [...a.dependents, { nome: "", parentesco: "", nascimento: "" }] })}><Plus size={14} /> Adicionar dependente</button>}
      </>}
      {id === "documentos" && fields("documentos")}
      {id === "escolaridade" && <>
        {fields("escolaridade")}
        <h3 className="cd-h3">Cursos especializados <small>{a.courses.length}</small></h3>
        {a.courses.map((k, i) => <div key={i} className="cd-row3">
          <label className="cd-f"><span>Curso</span><input value={k.curso} onChange={e => setA({ courses: a.courses.map((x, j) => j === i ? { ...x, curso: e.target.value } : x) })} /></label>
          <label className="cd-f"><span>Escola / órgão / entidade</span><input value={k.entidade} onChange={e => setA({ courses: a.courses.map((x, j) => j === i ? { ...x, entidade: e.target.value } : x) })} /></label>
          <label className="cd-f"><span>Período</span><input value={k.periodo} placeholder="ex.: mar–jun/2025" onChange={e => setA({ courses: a.courses.map((x, j) => j === i ? { ...x, periodo: e.target.value } : x) })} /></label>
          {!sent && <button type="button" className="cd-btn cd-btn-ghost" aria-label="Remover curso" onClick={() => setA({ courses: a.courses.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>}
        </div>)}
        {!sent && <button type="button" className="cd-btn cd-btn-sm" onClick={() => setA({ courses: [...a.courses, { curso: "", entidade: "", periodo: "" }] })}><Plus size={14} /> Adicionar curso</button>}
      </>}
      {id === "experiencias" && EXPERIENCE_SLOTS.map(slot => {
        const x = a.experiences[slot.id];
        const setX = (k: keyof typeof x, v: string) => setA({ experiences: { ...a.experiences, [slot.id]: { ...x, [k]: v } } });
        return <div key={slot.id} className="cd-box"><h3 className="cd-h3">{slot.title}</h3><div className="cd-grid">
          <label className="cd-f cd-wide"><span>Empresa</span><input value={x.empresa} onChange={e => setX("empresa", e.target.value)} /></label>
          <label className="cd-f"><span>Telefone</span><input value={x.telefone} onChange={e => setX("telefone", formatPhone(e.target.value))} /></label>
          <label className="cd-f"><span>Cargo ocupado</span><input value={x.cargo} onChange={e => setX("cargo", e.target.value)} /></label>
          <label className="cd-f"><span>Admissão</span><input type="date" value={x.admissao} onChange={e => setX("admissao", e.target.value)} /></label>
          <label className="cd-f"><span>Demissão</span><input type="date" value={x.demissao} onChange={e => setX("demissao", e.target.value)} /></label>
          <label className="cd-f cd-wide"><span>Motivo da saída</span><input value={x.motivo} onChange={e => setX("motivo", e.target.value)} /></label>
          <label className="cd-f cd-wide"><span>Descrição das atividades desempenhadas</span><textarea rows={3} value={x.atividades} onChange={e => setX("atividades", e.target.value)} /></label>
        </div></div>;
      })}
      {id === "referencias" && REFERENCE_GROUPS.map(g => <div key={g.id} className="cd-box"><h3 className="cd-h3">{g.title}</h3>
        {a.references[g.id].map((r, i) => {
          const setR = (k: keyof typeof r, v: string) => setA({ references: { ...a.references, [g.id]: a.references[g.id].map((y, j) => j === i ? { ...y, [k]: v } : y) } });
          return <div key={i} className="cd-row3">
            <label className="cd-f"><span>Nome</span><input value={r.nome} onChange={e => setR("nome", e.target.value)} /></label>
            <label className="cd-f"><span>Endereço</span><input value={r.endereco} onChange={e => setR("endereco", e.target.value)} /></label>
            <label className="cd-f"><span>Telefone</span><input value={r.telefone} onChange={e => setR("telefone", formatPhone(e.target.value))} /></label>
          </div>;
        })}
      </div>)}
      {id === "revisao" && <div className="cd-review">
        {!sent ? <>
          <div className={missing.length ? "cd-check cd-check-warn" : "cd-check cd-check-ok"}>
            {missing.length ? <><AlertTriangle size={16} /><div><b>Faltam {missing.length} item(ns) antes do envio:</b><ul>{missing.map(m => <li key={m}>{m}</li>)}</ul></div></>
              : <><CheckCircle2 size={16} /><b>Tudo certo. Confira os dados e envie a ficha.</b></>}
          </div>
          <label className="cd-declare"><input type="checkbox" checked={a.declaration} onChange={e => setA({ declaration: e.target.checked })} />
            <span><b>Declaração do candidato:</b> declaro que as informações acima são verdadeiras e por elas assumo qualquer responsabilidade. ({UNIT.city.replace("/", " ")}, {br(todayISO())})</span></label>
          <button className="cd-btn cd-btn-success cd-btn-lg" disabled={!!missing.length} onClick={onSubmit}><Send size={16} /> Enviar ficha ao RH</button>
        </> : <>
          <div className="cd-check cd-check-ok"><CheckCircle2 size={16} /><b>Ficha enviada em {br(a.sentAt)}. Os dados do candidato ficaram bloqueados para edição.</b></div>
          <div className="cd-box cd-rh"><h3 className="cd-h3">Para uso exclusivo do Departamento de RH</h3>
            <div className="cd-rh-verdict" role="radiogroup" aria-label="Parecer do recrutamento e seleção">
              <button type="button" role="radio" aria-checked={rh.verdict === "apto"} className={rh.verdict === "apto" ? "cd-btn cd-btn-success" : "cd-btn"} onClick={() => setRh({ ...rh, verdict: "apto" })}><UserCheck size={15} /> Apto</button>
              <button type="button" role="radio" aria-checked={rh.verdict === "inapto"} className={rh.verdict === "inapto" ? "cd-btn cd-btn-danger" : "cd-btn"} onClick={() => setRh({ ...rh, verdict: "inapto" })}><UserX size={15} /> Inapto</button>
            </div>
            <label className="cd-f cd-wide"><span>Observações</span><textarea rows={3} value={rh.notes} onChange={e => setRh({ ...rh, notes: e.target.value })} /></label>
            <div className="cd-grid">
              <label className="cd-f"><span>Recrutamento e Seleção — data</span><input type="date" value={rh.recrutamento} onChange={e => setRh({ ...rh, recrutamento: e.target.value })} /></label>
              <label className="cd-f"><span>Departamento requisitante — data</span><input type="date" value={rh.requisitante} onChange={e => setRh({ ...rh, requisitante: e.target.value })} /></label>
              <label className="cd-f"><span>Departamento de RH — data</span><input type="date" value={rh.rh} onChange={e => setRh({ ...rh, rh: e.target.value })} /></label>
            </div>
            <button className="cd-btn cd-btn-primary" disabled={!rh.verdict} onClick={() => onRh(rh)}><Check size={15} /> Salvar parecer do RH</button>
          </div>
        </>}
      </div>}
    </fieldset>

    <footer className="cd-decide">
      <button className="cd-btn" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft size={15} /> Voltar</button>
      <p className="cd-saved">{sent ? "Somente leitura" : "Salvo automaticamente neste navegador"}</p>
      <button className="cd-btn cd-btn-primary" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Avançar <ChevronRight size={15} /></button>
    </footer>

    <div className="cd-offscreen" aria-hidden="true"><div ref={printRef} className="cd-print">
      <PrintHeader title="Solicitação de emprego" subtitle={`Candidato ao cargo de: ${a.fields.cargo || "—"}`} right={sent ? `Enviada em ${br(a.sentAt)}` : "Rascunho"} />
      <div className="cd-p-top">{a.photo ? <img src={a.photo} alt="" /> : <span>Foto 3x4</span>}
        <div><b>{a.fields.nome}</b><p>Telefone: {a.fields.telefone || "—"}{a.fields.telefone2 ? ` · ${a.fields.telefone2Tipo || "Outro"}: ${a.fields.telefone2}` : ""}</p></div></div>
      {FORM_SECTIONS.map(s => <div key={s.id} className="cd-p-sec"><h4>{s.title}</h4><dl>
        {s.fields.filter(f => f.key !== "nome" && f.key !== "cargo").map(f => <div key={f.key}><dt>{f.label}</dt><dd>{f.type === "date" ? br(a.fields[f.key]) : a.fields[f.key] || "—"}</dd></div>)}
      </dl></div>)}
      {!!a.dependents.length && <div className="cd-p-sec"><h4>Dependentes</h4>{a.dependents.map((d, i) => <p key={i}>{d.nome} · {d.parentesco || "—"} · {br(d.nascimento)}</p>)}</div>}
      {!!a.courses.length && <div className="cd-p-sec"><h4>Cursos especializados</h4>{a.courses.map((k, i) => <p key={i}>{k.curso} · {k.entidade || "—"} · {k.periodo || "—"}</p>)}</div>}
      <div className="cd-p-sec"><h4>Experiências profissionais</h4>{EXPERIENCE_SLOTS.map(s => { const x = a.experiences[s.id]; return <p key={s.id}>
        <b>{s.title}:</b> {x.empresa || "—"} · {x.cargo || "—"} · {br(x.admissao)} a {br(x.demissao)} · Tel. {x.telefone || "—"} · Motivo: {x.motivo || "—"}{x.atividades ? ` · ${x.atividades}` : ""}</p>; })}</div>
      <div className="cd-p-sec"><h4>Referências</h4>{REFERENCE_GROUPS.map(g => <p key={g.id}><b>{g.title}:</b> {a.references[g.id].filter(r => r.nome).map(r => `${r.nome} (${r.telefone || "—"}${r.endereco ? `, ${r.endereco}` : ""})`).join("; ") || "—"}</p>)}</div>
      <p className="cd-p-decl">Declaro que as informações acima são verdadeiras e por elas assumo qualquer responsabilidade. {UNIT.city.replace("/", " ")}, {br(a.declarationDate || todayISO())}.</p>
      <div className="cd-p-sign"><span>Assinatura do candidato</span></div>
      <div className="cd-p-sec cd-p-rh"><h4>Para uso exclusivo do Departamento de RH</h4>
        <p>Parecer do Recrutamento e Seleção: ( {a.rh.verdict === "apto" ? "X" : " "} ) Apto ( {a.rh.verdict === "inapto" ? "X" : " "} ) Inapto</p>
        <p>Observações: {a.rh.notes || "_______________________________________________"}</p>
        <div className="cd-p-signs"><span>{br(a.rh.recrutamento)}<br />Recrutamento e Seleção</span><span>{br(a.rh.requisitante)}<br />Depto. requisitante</span><span>{br(a.rh.rh)}<br />Departamento de RH</span></div>
      </div>
    </div></div>
  </section>;
}
