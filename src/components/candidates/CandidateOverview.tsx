import { AlertTriangle, ArrowRight, CheckCircle2, Eye, MessageCircle } from "lucide-react";
import { INTERVIEW_QUESTIONS, answeredCount, applicationProgress, type Candidate, type CandidateStore } from "@/domain/candidates";
import { PERFIS, predominant, profileMessage, profileUrl } from "@/domain/behavior-profile";
import { DOC_LIST, docsMessage, docsReceived, docsUrl } from "@/domain/candidate-docs";
import { LATE_DAYS, needsAttention, overview, situation, type Situation } from "@/domain/candidate-overview";
import { whatsappUrl } from "@/domain/candidate-link";
import { publicOrigin } from "@/lib/brand";

type StepTab = "perfil" | "entrevista" | "ficha";
const tabOf = (c: Candidate): StepTab => (c.stage === "perfil" ? "perfil" : c.stage === "entrevista" ? "entrevista" : "ficha");

const LEVEL = {
  ok: { text: "Em dia", cls: "ov-l-ok" },
  resolver: { text: "Resolver", cls: "ov-l-res" },
  atrasado: { text: "Atrasado", cls: "ov-l-late" },
} as const;

/** Sub-aba "Visão geral": em que etapa está cada candidato e o que precisa resolver. */
export function CandidateOverview({ store, today, condoName, onOpen, onGoTab }: {
  store: CandidateStore; today: string; condoName: (id: string) => string;
  onOpen: (tab: StepTab, c: Candidate) => void; onGoTab: (tab: StepTab) => void;
}) {
  const o = overview(store);
  const todo = needsAttention(store, today);
  const active = store.candidates.filter(c => c.stage === "perfil" || c.stage === "entrevista" || c.stage === "aprovado");
  const rows = active.map(c => ({ c, s: situation(c, today)! }))
    .sort((a, b) => a.c.name.localeCompare(b.c.name, "pt-BR"));

  function actionButton(c: Candidate, s: Situation) {
    const name = c.application?.fields["nome"] || c.name;
    if (s.action === "lembrar-perfil") return <a className="cd-btn cd-btn-wa" href={whatsappUrl(c.phone, `Lembrete: ${profileMessage(c.name, c.role, condoName(c.condoId), profileUrl(publicOrigin(), c.name))}`)}
      target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Lembrar no WhatsApp</a>;
    if (s.action === "cobrar-docs") return <a className="cd-btn cd-btn-wa" href={whatsappUrl(c.phone, `Lembrete: ${docsMessage(name, docsUrl(publicOrigin(), name))}`)}
      target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Cobrar no WhatsApp</a>;
    const label = s.isNew ? "Ver agora" : s.action === "enviar-perfil" ? "Enviar o teste" : s.action === "pedir-docs" ? "Pedir documentos" : "Abrir";
    return <button className="cd-btn cd-btn-primary" onClick={() => onOpen(tabOf(c), c)}>{s.isNew ? <Eye size={16} /> : null}{label}</button>;
  }

  return <div className="ov">
    <div className="ov-cards">
      <section className="ov-card"><h2>1. Perfil comportamental</h2>
        <p><span>Já responderam</span><b className="ov-g">{o.perfil.respondeu}</b></p>
        <p><span>Aguardando resposta</span><b className="ov-o">{o.perfil.aguardando}</b></p>
        <p><span>Teste não enviado</span><b>{o.perfil.naoEnviado}</b></p>
        <button className="ov-open" onClick={() => onGoTab("perfil")}>Abrir Perfil <ArrowRight size={16} /></button></section>
      <section className="ov-card"><h2>2. Entrevista</h2>
        <p><span>Para entrevistar</span><b className="ov-o">{o.entrevista.paraEntrevistar}</b></p>
        <p><span>Aprovados</span><b className="ov-g">{o.entrevista.aprovados}</b></p>
        <p><span>Não aprovados / banco</span><b className="ov-r">{o.entrevista.naoAprovados}</b></p>
        <button className="ov-open" onClick={() => onGoTab("entrevista")}>Abrir Entrevista <ArrowRight size={16} /></button></section>
      <section className="ov-card"><h2>3. Ficha de emprego</h2>
        <p><span>Faltam documentos</span><b className="ov-o">{o.ficha.faltamDocs}</b></p>
        <p><span>Ficha em preenchimento</span><b>{o.ficha.preenchendo}</b></p>
        <p><span>Prontas (enviadas ao RH)</span><b className="ov-g">{o.ficha.prontas}</b></p>
        <button className="ov-open" onClick={() => onGoTab("ficha")}>Abrir Ficha <ArrowRight size={16} /></button></section>
    </div>

    {todo.length ? <section className="ov-todo" aria-label="Precisa resolver">
      <h2><AlertTriangle size={20} /> Precisa resolver ({todo.length})</h2>
      <ul>{todo.map(({ c, s }) => <li key={c.id}>
        <span className={s.level === "atrasado" ? "ov-tag ov-tag-late" : s.isNew ? "ov-tag ov-tag-new" : "ov-tag ov-tag-res"}>
          {s.level === "atrasado" ? "ATRASADO" : s.isNew ? "NOVO" : "RESOLVER"}</span>
        <span className="ov-todo-text"><b>{c.name || "Sem nome"}</b> {s.text}</span>
        {actionButton(c, s)}
      </li>)}</ul>
    </section> : <section className="ov-allok"><CheckCircle2 size={20} /> Nada pendente. Todos os candidatos estão em dia.</section>}

    <section className="ov-table-box" aria-label="Todos os candidatos">
      <h2>Candidatos em andamento ({rows.length})</h2>
      <div className="ov-scroll"><table className="ov-table">
        <thead><tr><th>Candidato</th><th>1. Perfil</th><th>2. Entrevista</th><th>3. Ficha</th><th>Situação</th></tr></thead>
        <tbody>{rows.map(({ c, s }) => {
          const top = c.profile.scores ? predominant(c.profile.scores)[0]! : null;
          return <tr key={c.id}>
            <td><button className="ov-name" onClick={() => onOpen(tabOf(c), c)}>{c.name || "Sem nome"}</button>
              <small>{c.role || "Função não definida"}{c.condoId ? ` · ${condoName(c.condoId)}` : ""}</small></td>
            <td>{top ? <span className="ov-animal"><span className="ov-emoji" style={{ background: PERFIS[top].cor, boxShadow: `0 0 0 3px ${PERFIS[top].fundo}, 0 4px 10px -4px ${PERFIS[top].cor}` }} aria-hidden="true">{PERFIS[top].emoji}</span>
                <span><b className="ov-animal-name" style={{ background: PERFIS[top].cor }}>{top}</b><small>{c.stage === "perfil" && !c.profile.seen ? "NOVO · decidir" : "✓ respondido"}</small></span></span>
              : <span className="ov-animal"><span className="ov-emoji ov-emoji-wait" aria-hidden="true">?</span>
                <span><b className="ov-muted">Aguardando</b><small>{c.profile.linkSentAt ? "teste enviado" : "teste não enviado"}</small></span></span>}</td>
            <td>{c.stage === "perfil" ? <span className="ov-muted">—</span>
              : c.stage === "entrevista" ? <><span className="cd-j-now ov-pill">Em andamento</span><small>{answeredCount(c)} de {INTERVIEW_QUESTIONS.length} respostas</small></>
              : <span className="cd-j-done ov-pill">✓ Aprovado(a)</span>}</td>
            <td>{c.stage !== "aprovado" ? <span className="ov-muted">—</span>
              : c.application?.status === "enviada" ? <span className="cd-j-done ov-pill">✓ Enviada ao RH</span>
              : <>Documentos <b>{docsReceived(c.docs)} de {DOC_LIST.length}</b><small>ficha {c.application ? applicationProgress(c.application) : 0}% preenchida</small></>}</td>
            <td><span className={`ov-level ${LEVEL[s.level].cls}`}>{LEVEL[s.level].text}</span></td>
          </tr>;
        })}
        {!rows.length && <tr><td colSpan={5} className="ov-muted">Nenhum candidato em andamento. Clique em Novo candidato.</td></tr>}</tbody>
      </table></div>
      <p className="ov-foot">Atrasado: teste sem resposta há mais de {LATE_DAYS.perfil} dias, entrevista parada há mais de {LATE_DAYS.entrevista} dias
        ou documentos pendentes há mais de {LATE_DAYS.documentos} dias. Clique no nome para abrir o candidato.</p>
    </section>
  </div>;
}
