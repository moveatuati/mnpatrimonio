import { useEffect, useState } from "react";
import {
  AlertTriangle, Archive, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, FileText, Loader2, MessageCircle, Paperclip,
  RotateCw, Sparkles, Trash2, UserX, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { basicMissing, formatPhone, sampleDocImage, type Candidate } from "@/domain/candidates";
import { PERFIS, PROFILE_QUESTIONS, predominant, profileMessage, profileUrl, ranked, type ProfileScores } from "@/domain/behavior-profile";
import { DOC_LIST, docsComplete, docsMessage, docsReceived, docsUrl, receiveDocs, type DocId } from "@/domain/candidate-docs";
import { whatsappUrl } from "@/domain/candidate-link";
import type { ClientStore } from "@/domain/clients";
import { publicOrigin } from "@/lib/brand";

export const br = (v?: string) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
export const nowISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 19);
const hour = (v?: string) => (v && v.length > 10 ? ` às ${v.slice(11, 16)}` : "");

/* ─────────────────────── Resultado do perfil ─────────────────────── */

function ProfileBars({ scores }: { scores: ProfileScores }) {
  const top = predominant(scores);
  return <div className="cd-bars">{ranked(scores).map(r =>
    <div key={r.nome} className={top.includes(r.nome) ? "cd-bar-row cd-bar-top" : "cd-bar-row"}>
      <b>{r.nome}</b>
      <span className="cd-bar-track"><span style={{ width: `${r.pct}%`, background: PERFIS[r.nome].cor }} /></span>
      <strong>{r.pct}%</strong>
    </div>)}</div>;
}

function ProfileResult({ scores }: { scores: ProfileScores }) {
  const top = predominant(scores);
  return <div className="cd-result">
    <div className="cd-pred">
      <span className="cd-eyebrow">{top.length > 1 ? "Perfis predominantes (empate)" : "Perfil predominante"}</span>
      {top.map(n => <div key={n} className="cd-pred-item" style={{ borderColor: PERFIS[n].cor, background: PERFIS[n].fundo }}>
        <span className="cd-pred-top"><span className="cd-pred-emoji" style={{ background: PERFIS[n].cor }} aria-hidden="true">{PERFIS[n].emoji}</span>
          <b style={{ color: PERFIS[n].cor }}>{n} · {scores[n]}%</b></span>
        <span>{PERFIS[n].foco}</span>
        <small>Pontos fortes: {PERFIS[n].forcas.join(", ")}.</small>
      </div>)}
    </div>
    <div><span className="cd-eyebrow">Distribuição das respostas</span><ProfileBars scores={scores} /></div>
    <div className="cd-explore"><span className="cd-eyebrow">Perguntas sugeridas para a entrevista</span>
      <ul>{top.flatMap(n => PERFIS[n].explorar).map(q => <li key={q}>{q}</li>)}</ul></div>
    <p className="cd-mini">O perfil é um apoio para a conversa, não um diagnóstico. Use junto com a entrevista.</p>
  </div>;
}

/** Resumo do perfil mostrado no topo da entrevista. */
export function ProfileSummary({ c }: { c: Candidate }) {
  const [openMore, setOpenMore] = useState(false);
  const scores = c.profile.scores!;
  const top = predominant(scores);
  return <section className="cd-panel cd-psum">
    <div className="cd-psum-row">
      <span className="cd-j-done cd-psum-ok"><Check size={13} /> Etapa 1 concluída</span>
      <span>Perfil: {top.map(n => <b key={n} className="cd-psum-animal" style={{ background: PERFIS[n].cor }}>{PERFIS[n].emoji} {n} {scores[n]}%</b>)} — {PERFIS[top[0]!].foco}</span>
      <button className="cd-btn" onClick={() => setOpenMore(!openMore)}>{openMore ? "Fechar" : "Ver resultado completo"}</button>
    </div>
    {openMore && <ProfileResult scores={scores} />}
  </section>;
}

/* ─────────────────────── Etapa 1 · Perfil ─────────────────────── */

export function ProfilePanel({ c, clients, onChange, onDecide, onSimulate, onRemove }: {
  c: Candidate; clients: ClientStore; onChange: (c: Candidate) => void;
  onDecide: (o: "entrevista" | "banco" | "reprovado") => void; onSimulate: () => void; onRemove: () => void;
}) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => { setWaiting(false); onSimulate(); }, 1600);
    return () => window.clearTimeout(t);
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = basicMissing(c);
  const condo = clients.condos.find(x => x.id === c.condoId)?.name ?? "";
  const link = profileUrl(publicOrigin(), c.name || "Candidato");
  const answered = !!c.profile.scores;
  const step = answered ? 3 : c.profile.linkSentAt ? 2 : 1;

  return <section className="cd-panel cd-main">
    <div className="cd-panel-head">
      <div><p className="op-eyebrow">Etapa 1 de 3 · Perfil comportamental</p><h2>{c.name || "Novo candidato"}</h2>
        <p>{c.id}{c.role ? ` · ${c.role}` : ""}{condo ? ` · ${condo}` : ""}</p></div>
      <div className="cd-actions"><button className="cd-btn cd-btn-ghost" onClick={onRemove} aria-label="Excluir candidato"><Trash2 size={16} /></button></div>
    </div>

    <div className="cd-body">
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
          {clients.functions.filter(x => x.active || x.id === c.functionId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className={"cd-f" + (c.phone.replace(/\D/g, "").length >= 10 ? "" : " cd-f-bad")}><span>WhatsApp do candidato *</span>
          <input inputMode="tel" placeholder="(91) 9 0000-0000" value={c.phone} onChange={e => onChange({ ...c, phone: formatPhone(e.target.value) })} /></label>
      </div>

      <ol className="cd-track" aria-label="Andamento do teste">
        <li className={step > 1 ? "cd-tr-done" : "cd-tr-now"}><b>1. Teste enviado</b><span>{c.profile.linkSentAt ? `${br(c.profile.linkSentAt)}${hour(c.profile.linkSentAt)}` : "Ainda não"}</span></li>
        <li className={step > 2 ? "cd-tr-done" : step === 2 ? "cd-tr-now" : "cd-tr-next"}><b>2. Resposta do candidato</b><span>{answered ? `${br(c.profile.answeredAt)}${hour(c.profile.answeredAt)}` : c.profile.linkSentAt ? "Aguardando" : "—"}</span></li>
        <li className={answered ? "cd-tr-done" : "cd-tr-next"}><b>3. Resultado</b><span>{answered ? "Pronto, veja abaixo" : "Aparece aqui"}</span></li>
      </ol>

      {!answered && <div className="cd-invite">
        <div className="cd-invite-head"><MessageCircle size={18} /><div><b>Enviar o teste para o celular do candidato</b>
          <span>O candidato responde {PROFILE_QUESTIONS.length} perguntas rápidas. Quando terminar, aparece um aviso <b>“Novo!”</b> aqui na tela.</span></div></div>
        <div className="cd-actions">
          {missing.length
            ? <button type="button" className="cd-btn cd-btn-wa cd-btn-lg" disabled><MessageCircle size={17} /> {c.profile.linkSentAt ? "Reenviar" : "Enviar"} teste pelo WhatsApp</button>
            : <a className="cd-btn cd-btn-wa cd-btn-lg" href={whatsappUrl(c.phone, profileMessage(c.name, c.role, condo, link))} target="_blank" rel="noopener noreferrer"
                onClick={() => onChange({ ...c, profile: { ...c.profile, linkSentAt: nowISO() } })}><MessageCircle size={17} /> {c.profile.linkSentAt ? "Reenviar" : "Enviar"} teste pelo WhatsApp</a>}
          <a className="cd-btn cd-btn-lg" href={link} target="_blank" rel="noopener noreferrer"><Eye size={16} /> Ver como o candidato vê</a>
          <button type="button" className="cd-btn cd-btn-demo cd-btn-lg" disabled={waiting} onClick={() => setWaiting(true)}>
            {waiting ? <><Loader2 size={16} className="cd-spin" /> Candidato respondendo…</> : <><Sparkles size={16} /> Simular resposta (demonstração)</>}</button>
        </div>
        {missing.length > 0 && <p className="cd-warn"><AlertTriangle size={15} /> Para enviar, falta: <b>{missing.join(", ")}</b>.</p>}
      </div>}

      {answered && <><h3 className="cd-h3">Resultado do perfil <span className="cd-badge cd-b-aprovado">Respondido em {br(c.profile.answeredAt)}</span></h3>
        <ProfileResult scores={c.profile.scores!} /></>}
    </div>

    <footer className="cd-decide">
      <p className={answered ? "cd-okt" : "cd-mini"}>{answered ? <><Check size={16} /> Teste respondido. Escolha o parecer.</>
        : <><Clock3 size={16} /> Aguardando a resposta do candidato.</>}</p>
      <div className="cd-actions">
        <button className="cd-btn cd-btn-danger cd-btn-lg" disabled={!!missing.length} onClick={() => onDecide("reprovado")}><UserX size={16} /> Não aprovar</button>
        <button className="cd-btn cd-btn-lg" disabled={!!missing.length} onClick={() => onDecide("banco")}><Archive size={16} /> Banco de talentos</button>
        <button className="cd-btn cd-btn-success cd-btn-lg" disabled={!answered || !!missing.length} onClick={() => onDecide("entrevista")}>
          Aprovar e enviar para Entrevista <ChevronRight size={17} /></button>
      </div>
    </footer>
  </section>;
}

/* ─────────────────────── Etapa 3 · Documentos ─────────────────────── */

export function DocsPanel({ c, onChange, openDoc, onOpen }: { c: Candidate; onChange: (c: Candidate) => void; openDoc: DocId | null; onOpen: (d: DocId) => void }) {
  const [waiting, setWaiting] = useState(false);
  const d = c.docs;
  const got = docsReceived(d);
  const complete = docsComplete(d);
  const name = c.application?.fields["nome"] || c.name;
  const link = docsUrl(publicOrigin(), name);
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => {
      setWaiting(false);
      const at = nowISO();
      const files = Object.fromEntries(DOC_LIST.filter(x => !d.files[x.id]).map(x =>
        [x.id, { name: `${x.short}.jpg`, at, url: sampleDocImage(x.short, name.replace(/\s*\(.*\)$/, "")) }]));
      onChange({ ...c, docs: receiveDocs({ ...d, requestedAt: d.requestedAt || at }, files) });
    }, 1600);
    return () => window.clearTimeout(t);
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="cd-panel cd-docs">
    <div className="cd-docs-head">
      <div><p className="op-eyebrow">Etapa 3 de 3 · Ficha de emprego</p>
        <h2>{name}</h2>
        <p className={complete ? "cd-okt" : "cd-mini"}>{complete ? <><CheckCircle2 size={15} /> Todos os documentos recebidos</>
          : d.requestedAt ? <>Documentos pedidos em {br(d.requestedAt)} · <b>{got} de {DOC_LIST.length}</b> recebidos</> : "Documentos ainda não pedidos"}</p></div>
      <div className="cd-actions">
        <a className="cd-btn cd-btn-wa cd-btn-lg" href={whatsappUrl(c.phone, docsMessage(name, link))} target="_blank" rel="noopener noreferrer"
          onClick={() => onChange({ ...c, docs: { ...d, requestedAt: nowISO() } })}><Paperclip size={17} /> {d.requestedAt ? "Pedir de novo" : "Pedir documentos"} pelo WhatsApp</a>
        <a className="cd-btn cd-btn-lg" href={link} target="_blank" rel="noopener noreferrer"><Eye size={16} /> Ver como o candidato vê</a>
        {!complete && <button type="button" className="cd-btn cd-btn-demo cd-btn-lg" disabled={waiting} onClick={() => setWaiting(true)}>
          {waiting ? <><Loader2 size={16} className="cd-spin" /> Candidato enviando…</> : <><Sparkles size={16} /> Simular envio (demonstração)</>}</button>}
      </div>
    </div>
    <ul className="cd-doclist">
      {DOC_LIST.map(x => {
        const f = d.files[x.id];
        return <li key={x.id} className={openDoc === x.id ? "cd-doc-on" : ""}>
          <FileText size={18} /><span className="cd-doc-name">{x.label}</span>
          {f ? <span className="cd-doc-ok"><Check size={14} /> Recebido {br(f.at)}</span> : <span className="cd-doc-wait">{d.requestedAt ? "Aguardando" : "—"}</span>}
          {f ? <button className="cd-btn cd-btn-primary" onClick={() => onOpen(x.id)}><Eye size={15} /> Abrir</button> : <span />}
        </li>;
      })}
    </ul>
    <p className="cd-mini">Abra o documento: ele aparece ao lado da ficha. Leia e digite os dados na ficha com calma (sem leitura automática da foto).</p>
  </section>;
}

export function DocViewer({ c, doc, onOpen, onClose }: { c: Candidate; doc: DocId; onOpen: (d: DocId) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  useEffect(() => { setZoom(1); setTurn(0); }, [doc]);
  const received = DOC_LIST.filter(x => c.docs.files[x.id]);
  const idx = received.findIndex(x => x.id === doc);
  const f = c.docs.files[doc];
  const meta = DOC_LIST.find(x => x.id === doc)!;
  return <aside className="cd-panel cd-viewer" aria-label={`Documento: ${meta.label}`}>
    <div className="cd-viewer-head"><b>{meta.label}</b>
      <button className="cd-btn" onClick={onClose} aria-label="Fechar documento"><X size={16} /> Fechar</button></div>
    <div className="cd-viewer-tools">
      <button className="cd-btn" aria-label="Aumentar" onClick={() => setZoom(z => Math.min(3, z + 0.25))}><ZoomIn size={18} /></button>
      <button className="cd-btn" aria-label="Diminuir" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut size={18} /></button>
      <button className="cd-btn" onClick={() => setTurn(t => (t + 90) % 360)}><RotateCw size={16} /> Girar</button>
      <span className="cd-viewer-nav">
        <button className="cd-btn" disabled={idx <= 0} onClick={() => onOpen(received[idx - 1]!.id)} aria-label="Documento anterior"><ChevronLeft size={18} /></button>
        <span>{idx + 1} de {received.length}</span>
        <button className="cd-btn" disabled={idx >= received.length - 1} onClick={() => onOpen(received[idx + 1]!.id)} aria-label="Próximo documento"><ChevronRight size={18} /></button>
      </span>
    </div>
    <div className="cd-viewer-img">
      {f ? <img src={f.url} alt={meta.label} style={{ transform: `scale(${zoom}) rotate(${turn}deg)` }} /> : <p>Documento ainda não recebido.</p>}
    </div>
    {f && <p className="cd-mini">Arquivo: {f.name} · recebido em {br(f.at)}{hour(f.at)}</p>}
  </aside>;
}
