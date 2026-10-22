import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Archive, Bell, Camera, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileSignature,
  Copy, Eye, Info, Link2, MessageCircle, Plus, Printer, RotateCcw, Search, Send, Smartphone, Star, Trash2, UserCheck, UserPlus, UserX, Users, X,
} from "lucide-react";
import {
  CANDIDATE_KEY, CRITERIA, EXPERIENCE_SLOTS, FORM_SECTIONS, INTERVIEW_QUESTIONS, REFERENCE_GROUPS, STAGE_LABELS,
  answeredCount, applicationMissing, applicationProgress, decide, decideProfile, demoCandidates, formatCPF, formatPhone, interviewMissing,
  interviewScore, isValidCPF, newCandidate, receiveProfile, removeCandidate, reopen, restoreCandidates, setRhOpinion, submit, summary, updateCandidate,
  type Application, type Candidate, type CandidateStore, type Field, type Stage,
} from "@/domain/candidates";
import { simulatedScores } from "@/domain/behavior-profile";
import { DOC_LIST, docsReceived, type DocId } from "@/domain/candidate-docs";
import { UNIT } from "@/domain/config";
import {
  INTERVIEWER_KEY, importReply, inviteMessage, inviteMissing, inviteUrl, makeInvite, readReply, whatsappUrl,
  type InterviewerProfile, type Reply,
} from "@/domain/candidate-link";
import { loadClients, todayISO } from "@/lib/demo-storage";
import { demoClients, type ClientStore } from "@/domain/clients";
import { printNode } from "@/lib/print";
import { publicOrigin } from "@/lib/brand";
import { PrintHeader } from "@/components/print/PrintHeader";
import { DocViewer, DocsPanel, ProfilePanel, ProfileSummary, br, nowISO } from "./CandidateSteps";
import "./CandidatesWorkspace.css";

type Tab = "perfil" | "entrevista" | "ficha" | "encerrados";
type Notice = { kind: "ok" | "erro" | "info"; text: string } | null;


const STEPS = [
  { id: "pessoais", title: "Dados pessoais" }, { id: "endereco", title: "Endereço" }, { id: "familia", title: "Família e dependentes" },
  { id: "documentos", title: "Documentos" }, { id: "escolaridade", title: "Escolaridade e cursos" },
  { id: "experiencias", title: "Experiências" }, { id: "referencias", title: "Referências" }, { id: "revisao", title: "Revisão e envio" },
] as const;

/** As 3 sub-abas da captação, na ordem do processo. */
const STEP_TABS: { id: Exclude<Tab, "encerrados">; stage: Stage; title: string; help: string }[] = [
  { id: "perfil", stage: "perfil", title: "Perfil comportamental",
    help: "Envie o teste pelo WhatsApp. Quando o candidato responder, aparece um aviso. Veja o resultado e aprove para a Entrevista." },
  { id: "entrevista", stage: "entrevista", title: "Entrevista",
    help: "Faça a entrevista (ou envie o link). Dê as notas e o parecer. Aprovado vai para a Ficha de emprego." },
  { id: "ficha", stage: "aprovado", title: "Ficha de emprego",
    help: "Peça os documentos pelo WhatsApp. Quando chegarem, abra cada um e digite os dados na ficha." },
];

function StageBadge({ c }: { c: Candidate }) {
  if (c.application?.rh.verdict) return <span className={`cd-badge cd-b-${c.application.rh.verdict}`}>RH: {c.application.rh.verdict === "apto" ? "Apto" : "Inapto"}</span>;
  if (c.application?.status === "enviada") return <span className={`cd-badge cd-b-enviada`}>Ficha enviada</span>;
  return <span className={`cd-badge cd-b-${c.stage}`}>{STAGE_LABELS[c.stage]}</span>;
}

/** Selos da jornada: verde = etapa concluída, laranja = etapa atual, cinza = ainda não. */
function Journey({ c }: { c: Candidate }) {
  const at = c.stage === "perfil" ? 0 : c.stage === "entrevista" ? 1 : c.stage === "aprovado" ? 2 : -1;
  if (at < 0) return <StageBadge c={c} />;
  return <span className="cd-journey">{["Perfil", "Entrevista", "Ficha"].map((label, i) =>
    <span key={label} className={i < at ? "cd-j-done" : i === at ? "cd-j-now" : "cd-j-next"}>{i < at ? <Check size={12} /> : null}{label}</span>)}</span>;
}

export function CandidatesWorkspace() {
  const [store, setStore] = useState<CandidateStore>(demoCandidates);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("perfil");
  const [sel, setSel] = useState<Record<Tab, string>>({ perfil: "CAND-003", entrevista: "CAND-002", ficha: "CAND-001", encerrados: "" });
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [storageWarn, setStorageWarn] = useState("");
  const [me, setMeState] = useState<InterviewerProfile>({ name: "", phone: "" });
  const [clients, setClients] = useState<ClientStore>(demoClients);
  const [condoFilter, setCondoFilter] = useState("all");
  const [openDoc, setOpenDoc] = useState<DocId | null>(null);
  useEffect(() => {
    setClients(loadClients());
    const onStorage = () => setClients(loadClients());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const condoName = (id: string) => clients.condos.find(x => x.id === id)?.name ?? "";
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
  const inTab = (t: Tab) => store.candidates.filter(c => t === "encerrados" ? c.stage === "banco" || c.stage === "reprovado"
    : c.stage === STEP_TABS.find(x => x.id === t)!.stage);
  const list = inTab(tab).filter(c => {
    if (condoFilter !== "all" && c.condoId !== condoFilter) return false;
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return !q || `${c.name} ${c.role} ${c.id}`.toLocaleLowerCase("pt-BR").includes(q);
  });
  const current = list.find(c => c.id === sel[tab]) ?? list[0] ?? null;
  const freshProfiles = store.candidates.filter(c => c.stage === "perfil" && c.profile.scores && !c.profile.seen);
  const freshDocs = store.candidates.filter(c => c.stage === "aprovado" && !c.docs.seen);

  const apply = (result: Candidate | string, ok?: string) => {
    if (typeof result === "string") { setNotice({ kind: "erro", text: result }); return false; }
    setStore(s => updateCandidate(s, result));
    if (ok) setNotice({ kind: "ok", text: ok });
    return true;
  };
  const patch = (c: Candidate) => setStore(s => updateCandidate(s, c));

  /** Abre um candidato numa sub-aba; o que era novidade passa a "visto". */
  function open(t: Tab, c: Candidate) {
    setTab(t); setSel(s => ({ ...s, [t]: c.id })); setOpenDoc(null);
    if (t === "perfil" && c.profile.scores && !c.profile.seen) patch({ ...c, profile: { ...c.profile, seen: true } });
    if (t === "ficha" && !c.docs.seen) patch({ ...c, docs: { ...c.docs, seen: true } });
  }
  function goTab(t: Tab) { setTab(t); setOpenDoc(null); setSearch(""); }

  function addCandidate() {
    const created = newCandidate(store, todayISO());
    setStore(created.store); setTab("perfil"); setSel(s => ({ ...s, perfil: created.id })); setSearch(""); setCondoFilter("all");
    setNotice({ kind: "info", text: "Novo candidato criado na etapa 1 (Perfil). Informe nome, vaga, condomínio e WhatsApp e envie o teste." });
  }
  function removeCurrent(c: Candidate) {
    if (!window.confirm(`Excluir ${c.name || "este candidato"}? Esta ação não pode ser desfeita.`)) return;
    const r = removeCandidate(store, c.id);
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r); setNotice({ kind: "info", text: "Candidato excluído." });
  }
  function decideOnProfile(c: Candidate, outcome: "entrevista" | "banco" | "reprovado") {
    const msg = outcome === "entrevista" ? `${c.name} aprovado(a) no Perfil e passou para a etapa 2 · Entrevista.`
      : outcome === "banco" ? `${c.name} guardado(a) no banco de talentos.` : "Parecer registrado: não aprovado.";
    apply(decideProfile(c, outcome, nowISO()), msg);
  }
  function simulateProfile(c: Candidate) {
    apply(receiveProfile(c, simulatedScores(`${c.id}-${Date.now()}`), nowISO()));
  }
  function decideCurrent(c: Candidate, stage: Exclude<Stage, "entrevista" | "perfil">) {
    const msg = stage === "aprovado" ? `${c.name} aprovado(a) na Entrevista e passou para a etapa 3 · Ficha de emprego.`
      : stage === "banco" ? "Candidato guardado no banco de talentos." : "Parecer registrado: não aprovado.";
    if (apply(decide(c, stage, nowISO()), msg) && stage === "aprovado") setSel(s => ({ ...s, ficha: c.id }));
  }

  function acceptIncoming() {
    if (!incoming) return;
    const r = importReply(store, incoming, todayISO());
    setIncoming(null);
    try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ok */ }
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r.store); setSearch(""); setTab("entrevista"); setSel(s => ({ ...s, entrevista: r.id }));
    setNotice({ kind: "ok", text: `Respostas de ${incoming.name} recebidas. Agora faça a avaliação com as estrelas e dê o parecer.` });
  }

  const tabHelp = STEP_TABS.find(x => x.id === tab)?.help;
  const closed = inTab("encerrados").length;

  return <div className="cd-app cd-cap">
    <header className="cd-head">
      <div>
        <p className="op-eyebrow">Gestão de pessoas · {UNIT.unit}</p>
        <h1>Captação de <span>candidatos</span></h1>
        <p>1. Perfil comportamental → 2. Entrevista → 3. Ficha de emprego e documentos.</p>
      </div>
      <div className="cd-actions">
        <a className="cd-btn" href="/link-candidato"><Smartphone size={16} /> Como o candidato vê</a>
        <button className="cd-btn cd-btn-primary cd-btn-lg" onClick={addCandidate}><UserPlus size={17} /> Novo candidato</button>
      </div>
    </header>

    <div className="cd-demo"><Info size={15} /><span><b>Demonstração:</b> dados fictícios salvos apenas neste navegador. Os botões “Simular” mostram como as respostas e documentos do candidato chegam. Na próxima fase tudo fica gravado no banco de dados seguro.</span></div>
    {storageWarn && <div className="cd-notice cd-n-erro"><AlertTriangle size={15} /><span>{storageWarn}</span></div>}

    {freshProfiles.map(c => <div key={`p-${c.id}`} className="cd-fresh" role="status">
      <Bell size={18} /><span><b>Novo!</b> {c.name} respondeu o Perfil comportamental.</span>
      <button className="cd-btn cd-btn-success" onClick={() => open("perfil", c)}><Eye size={15} /> Ver agora</button>
    </div>)}
    {freshDocs.map(c => <div key={`d-${c.id}`} className="cd-fresh" role="status">
      <Bell size={18} /><span><b>Novo!</b> {c.name} enviou documentos ({docsReceived(c.docs)} de {DOC_LIST.length}).</span>
      <button className="cd-btn cd-btn-success" onClick={() => open("ficha", c)}><Eye size={15} /> Ver agora</button>
    </div>)}

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

    <nav className="cd-steps3" role="tablist" aria-label="Etapas da captação">
      {STEP_TABS.map((t, i) => {
        const count = inTab(t.id).length;
        const fresh = t.id === "perfil" ? stats.newProfiles : t.id === "ficha" ? stats.newDocs : 0;
        return <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "cd-s3 cd-s3-on" : "cd-s3"} onClick={() => goTab(t.id)}>
          <span className="cd-s3-num">{i + 1}</span>
          <span className="cd-s3-text"><b>{t.title}</b><small>{count} candidato{count === 1 ? "" : "s"}</small></span>
          {fresh > 0 && <span className="cd-s3-new">{fresh} novo{fresh > 1 ? "s" : ""}</span>}
        </button>;
      })}
    </nav>
    <div className="cd-s3-foot">
      {tab === "encerrados" ? <p className="cd-s3-help"><Archive size={15} /> Banco de talentos e não aprovados. Use <b>Reabrir</b> para voltar o candidato ao processo.</p>
        : <p className="cd-s3-help"><Info size={15} /> {tabHelp}</p>}
      <button className={tab === "encerrados" ? "cd-btn cd-btn-primary" : "cd-btn"} onClick={() => goTab(tab === "encerrados" ? "perfil" : "encerrados")}>
        <Archive size={15} /> {tab === "encerrados" ? "Voltar às etapas" : `Banco de talentos e não aprovados (${closed})`}</button>
    </div>

    <div className="cd-split">
      <aside className="cd-panel cd-list">
        <div className="cd-list-tools">
          <label className="cd-search"><Search size={15} /><input placeholder="Buscar candidato" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <select aria-label="Filtrar condomínio" value={condoFilter} onChange={e => setCondoFilter(e.target.value)}>
            <option value="all">Todos os condomínios</option>
            {clients.condos.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <ul>
          {list.map(c => <li key={c.id}><button className={c.id === current?.id ? "cd-item cd-item-on" : "cd-item"} onClick={() => open(tab, c)}>
            <b>{c.name || "Sem nome"}</b><small>{c.role || "Função não definida"} · {condoName(c.condoId) || "Sem condomínio"}</small>
            <Journey c={c} />
            <span className="cd-item-foot">{tab === "perfil" ? (c.profile.scores
                ? <em className="cd-ok-t">{!c.profile.seen && <span className="cd-new-pill">NOVO</span>} Respondeu · ver resultado</em>
                : <em>{c.profile.linkSentAt ? `Teste enviado em ${br(c.profile.linkSentAt)} · aguardando` : "Teste ainda não enviado"}</em>)
              : tab === "entrevista" ? <em>{answeredCount(c)}/{INTERVIEW_QUESTIONS.length} respostas</em>
              : tab === "ficha" ? <em>{!c.docs.seen && <span className="cd-new-pill">NOVO</span>} Documentos {docsReceived(c.docs)}/{DOC_LIST.length}{c.application ? ` · ficha ${applicationProgress(c.application)}%` : ""}</em>
              : <em>Decidido em {br(c.decidedAt)}</em>}</span>
          </button></li>)}
          {!list.length && <li className="cd-empty"><Users size={18} /> {tab === "perfil" ? <>Nenhum candidato nesta etapa. Clique em <b>Novo candidato</b>.</>
            : tab === "entrevista" ? "Nenhum candidato aqui. Aprove alguém na etapa 1 (Perfil)."
            : tab === "ficha" ? "Nenhum candidato aqui. Aprove alguém na etapa 2 (Entrevista)." : "Nenhum candidato encerrado."}</li>}
        </ul>
      </aside>

      {!current ? <div className="cd-panel cd-blank"><UserPlus size={26} /><p>Selecione um candidato na lista.</p></div>
        : tab === "perfil" ? <ProfilePanel key={current.id} c={current} clients={clients} onChange={patch}
            onDecide={o => decideOnProfile(current, o)} onSimulate={() => simulateProfile(current)} onRemove={() => removeCurrent(current)} />
        : tab === "ficha" ? <div className="cd-ficha">
            <DocsPanel key={`docs-${current.id}`} c={current} onChange={patch} openDoc={openDoc} onOpen={setOpenDoc} />
            <div className={openDoc ? "cd-ficha-work cd-ficha-split" : "cd-ficha-work"}>
              {openDoc && <DocViewer c={current} doc={openDoc} onOpen={setOpenDoc} onClose={() => setOpenDoc(null)} />}
              {current.application ? <ApplicationForm key={current.id} c={current} onChange={patch}
                onSubmit={() => apply(submit(current, nowISO()), "Ficha enviada ao RH com sucesso.")}
                onRh={rh => apply(setRhOpinion(current, rh), "Parecer do RH registrado.")} />
                : <div className="cd-panel cd-blank"><FileSignature size={26} /><p>Ficha não encontrada.</p></div>}
            </div>
          </div>
        : <div className="cd-stack">
            {current.profile.scores && <ProfileSummary c={current} />}
            <InterviewForm key={current.id} c={current} me={me} setMe={setMe} clients={clients} onChange={patch} onDecide={s => decideCurrent(current, s)}
              onReopen={() => apply(reopen(current), current.interview.opinion.trim() ? "Candidato voltou para a etapa 2 · Entrevista." : "Candidato voltou para a etapa 1 · Perfil.")}
              onRemove={() => removeCurrent(current)} onGoForm={() => open("ficha", current)} />
          </div>}
    </div>
  </div>;
}

/* ─────────────────────────── Entrevista ─────────────────────────── */

function InterviewForm({ c, me, setMe, clients, onChange, onDecide, onReopen, onRemove, onGoForm }: {
  c: Candidate; me: InterviewerProfile; setMe: (p: InterviewerProfile) => void; clients: ClientStore; onChange: (c: Candidate) => void; onDecide: (s: Exclude<Stage, "entrevista" | "perfil">) => void;
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
        <label className={"cd-f cd-wide" + (c.name.trim() ? "" : " cd-f-bad")}><span>Nome *</span><input value={c.name} onChange={e => onChange({ ...c, name: e.target.value })} /></label>
        <label className={"cd-f" + (c.condoId ? "" : " cd-f-bad")}><span>Condomínio da vaga *</span><select value={c.condoId} onChange={e => onChange({ ...c, condoId: e.target.value })}>
          <option value="">Selecione</option>
          {clients.condos.filter(x => x.active || x.id === c.condoId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className={"cd-f" + (c.functionId ? "" : " cd-f-bad")}><span>Função / vaga *</span><select value={c.functionId} onChange={e => {
          const fn = clients.functions.find(x => x.id === e.target.value);
          onChange({ ...c, functionId: e.target.value, role: fn?.name ?? "" });
        }}>
          <option value="">Selecione</option>
          {clients.functions.filter(x => x.active || x.id === c.functionId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          {!c.functionId && c.role && <option value="" disabled>Atual: {c.role}</option>}</select></label>
        <label className={"cd-f" + (c.phone.replace(/\D/g, "").length >= 10 ? "" : " cd-f-bad")}><span>WhatsApp do candidato *</span><input inputMode="tel" value={c.phone} onChange={e => onChange({ ...c, phone: formatPhone(e.target.value) })} /></label>
        <label className="cd-f"><span>Data *</span><input type="date" value={c.interview.date} onChange={e => setI({ date: e.target.value })} /></label>
        <label className="cd-f"><span>Entrevistador *</span><input value={c.interview.interviewer} placeholder={me.name || "Seu nome"} onChange={e => setI({ interviewer: e.target.value })} /></label>
      </div>
      {!locked && <InviteBox c={c} me={me} setMe={setMe} onFillDemo={() => {
        const condoPick = c.condoId || clients.condos.find(x => x.active)?.id || "";
        const fn = clients.functions.find(x => x.id === c.functionId) ?? clients.functions.find(x => x.active);
        onChange({ ...c, name: c.name.trim() || "Candidato(a) de demonstração", phone: c.phone.replace(/\D/g, "").length >= 10 ? c.phone : me.phone,
          condoId: condoPick, functionId: fn?.id ?? "", role: fn?.name ?? c.role,
          interview: { ...c.interview, interviewer: c.interview.interviewer || me.name } });
      }} condo={clients.condos.find(x => x.id === c.condoId)?.name ?? ""} onSent={at => onChange({ ...c, interview: { ...c.interview, interviewer: c.interview.interviewer || me.name, linkSentAt: at } })} />}

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
      <PrintHeader title="Formulário de candidato — entrevista" subtitle={`${c.name} · ${c.role}${c.condoId ? ` · ${clients.condos.find(x => x.id === c.condoId)?.name ?? ""}` : ""}`} right={`Data: ${br(c.interview.date)}`} />
      <p className="cd-p-meta">Entrevistador: <b>{c.interview.interviewer || "—"}</b> · Telefone: {c.phone || "—"} · Parecer: <b>{STAGE_LABELS[c.stage]}</b>{score !== null ? ` · Média ${score.toFixed(1)}/5` : ""}</p>
      {INTERVIEW_QUESTIONS.map((q, i) => <div key={q.id} className="cd-p-q"><b>{i + 1}. {q.label}</b><p>{c.interview.answers[q.id] || "—"}</p></div>)}
      <div className="cd-p-q"><b>Avaliação</b><p>{CRITERIA.map(k => `${k.label}: ${c.interview.scores[k.id] ?? "—"}/5`).join(" · ")}</p></div>
      <div className="cd-p-q"><b>Parecer do entrevistador</b><p>{c.interview.opinion || "—"}</p></div>
      <div className="cd-p-sign"><span>Assinatura do entrevistador</span></div>
    </div></div>
  </section>;
}

/* ─────────────────────── Link para o candidato ─────────────────────── */

function InviteBox({ c, me, setMe, condo, onSent, onFillDemo }: { c: Candidate; condo: string; me: InterviewerProfile; setMe: (p: InterviewerProfile) => void; onSent: (at: string) => void; onFillDemo: () => void }) {
  const [editMe, setEditMe] = useState(!me.name || me.phone.replace(/\D/g, "").length < 10);
  const [copied, setCopied] = useState(false);
  const missing = inviteMissing(c, me);
  const origin = publicOrigin();
  const url = missing.length ? "" : inviteUrl(origin, makeInvite(c, me, condo));
  // Prévia sempre disponível: usa os dados preenchidos e completa o que faltar com exemplo.
  const previewUrl = inviteUrl(origin, makeInvite({ ...c, name: c.name.trim() || "Candidato(a)", role: c.role.trim() || "Vaga de exemplo" },
    { name: me.name.trim() || c.interview.interviewer || "Entrevistador(a)", phone: me.phone }, condo));
  const candidateMissing = missing.filter(m => !m.startsWith("seu "));
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(inviteMessage(makeInvite(c, me, condo), url)); setCopied(true); onSent(nowISO()); window.setTimeout(() => setCopied(false), 2500); }
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
    <div className="cd-actions">
      {url
        ? <a className="cd-btn cd-btn-wa" href={whatsappUrl(c.phone, inviteMessage(makeInvite(c, me, condo), url))} target="_blank" rel="noopener noreferrer" onClick={() => onSent(nowISO())}>
            <MessageCircle size={15} /> Enviar link pelo WhatsApp</a>
        : <button type="button" className="cd-btn cd-btn-wa" disabled title="Preencha os dados indicados abaixo"><MessageCircle size={15} /> Enviar link pelo WhatsApp</button>}
      <button type="button" className="cd-btn" disabled={!url} onClick={copy}><Copy size={15} /> {copied ? "Mensagem copiada!" : "Copiar link"}</button>
      <a className="cd-btn" href={previewUrl} target="_blank" rel="noopener noreferrer"><Eye size={15} /> Ver como o candidato vê</a>
    </div>
    {missing.length > 0 && <div className="cd-invite-miss-box">
      <p className="cd-warn cd-invite-miss"><AlertTriangle size={14} /> Para enviar pelo WhatsApp, falta: <b>{missing.join(", ")}</b>.</p>
      {candidateMissing.length > 0 && <button type="button" className="cd-btn cd-btn-sm" onClick={onFillDemo}>Preencher exemplo para demonstração</button>}
    </div>}
    <p className="cd-invite-tip">Para apresentar ao cliente: use <b>o seu próprio WhatsApp</b> como WhatsApp do candidato. Você recebe o convite, responde no celular e as respostas voltam para você.</p>
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

  const id = STEPS[step]!.id;
  return <section className="cd-panel cd-main">
    <div className="cd-panel-head">
      <div><p className="op-eyebrow">Solicitação de emprego · candidato aprovado</p><h2>{a.fields["nome"] || c.name}</h2>
        <p>{a.fields["cargo"] || c.role} · <StageBadge c={c} /> · {progress}% preenchido{sent && <> · enviada em {br(a.sentAt)}</>}</p></div>
      <div className="cd-actions"><button className="cd-btn" onClick={() => printNode(printRef.current, { title: `Ficha de emprego — ${a.fields["nome"]}` })}><Printer size={15} /> Imprimir ficha</button></div>
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
      <PrintHeader title="Solicitação de emprego" subtitle={`Candidato ao cargo de: ${a.fields["cargo"] || "—"}`} right={sent ? `Enviada em ${br(a.sentAt)}` : "Rascunho"} />
      <div className="cd-p-top">{a.photo ? <img src={a.photo} alt="" /> : <span>Foto 3x4</span>}
        <div><b>{a.fields["nome"]}</b><p>Telefone: {a.fields["telefone"] || "—"}{a.fields["telefone2"] ? ` · ${a.fields["telefone2Tipo"] || "Outro"}: ${a.fields["telefone2"]}` : ""}</p></div></div>
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
