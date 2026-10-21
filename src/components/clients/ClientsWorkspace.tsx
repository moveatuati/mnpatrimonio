import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Briefcase, Building2, Check, CheckCircle2, Info, Plus, Search, Users, X } from "lucide-react";
import {
  condoMissing, demoClients, emptyCondo, formatCNPJ, saveCondo, saveFunction, totalPosts,
  type ClientStore, type Condo, type JobFunction,
} from "@/domain/clients";
import { CANDIDATE_KEY, demoCandidates, formatPhone, restoreCandidates, type Candidate } from "@/domain/candidates";
import { loadClients, saveClients } from "@/lib/demo-storage";
import "@/components/candidates/CandidatesWorkspace.css";
import "./ClientsWorkspace.css";

type Tab = "condominios" | "funcoes";
type Notice = { kind: "ok" | "erro" | "info"; text: string } | null;
const UFS = "PA AC AL AP AM BA CE DF ES GO MA MT MS MG PB PR PE PI RJ RN RS SC SP SE TO RO RR".split(" ");

function readCandidates(): Candidate[] {
  try {
    const raw = window.localStorage.getItem(CANDIDATE_KEY);
    return (raw ? restoreCandidates(JSON.parse(raw)) : demoCandidates()).candidates;
  } catch {
    return demoCandidates().candidates;
  }
}

/** Cadastro dos condomínios atendidos (clientes) e das funções (vagas) usadas na captação. */
export function ClientsWorkspace() {
  const [store, setStore] = useState<ClientStore>(demoClients);
  const [candidates, setCandidates] = useState<Candidate[]>(() => demoCandidates().candidates);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("condominios");
  const [draft, setDraft] = useState<Condo>(() => ({ ...emptyCondo("COND-001") }));
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [fnDraft, setFnDraft] = useState<JobFunction | null>(null);

  useEffect(() => {
    const s = loadClients();
    setStore(s);
    setDraft(s.condos[0] ?? emptyCondo());
    setCandidates(readCandidates());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!saveClients(store)) setNotice({ kind: "erro", text: "Não foi possível salvar neste navegador. Os dados ficam só até fechar a página." });
  }, [store, ready]);

  const inProcess = (pred: (c: Candidate) => boolean) => candidates.filter(c => pred(c) && c.stage !== "reprovado").length;
  const stats = useMemo(() => ({
    active: store.condos.filter(c => c.active).length,
    posts: store.condos.filter(c => c.active).reduce((a, c) => a + totalPosts(c), 0),
    functions: store.functions.filter(f => f.active).length,
    candidates: candidates.filter(c => c.condoId && c.stage !== "reprovado").length,
  }), [store, candidates]);

  const list = store.condos.filter(c => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return !q || `${c.name} ${c.district} ${c.manager}`.toLocaleLowerCase("pt-BR").includes(q);
  });
  const isNew = !store.condos.some(c => c.id === draft.id);
  const missing = condoMissing(draft, store.condos);
  const set = (p: Partial<Condo>) => setDraft(d => ({ ...d, ...p }));

  function save() {
    const r = saveCondo(store, draft);
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r.store);
    setDraft(r.store.condos.find(c => c.id === r.id) ?? draft);
    setNotice({ kind: "ok", text: isNew ? "Condomínio cadastrado. Ele já aparece na Captação de candidatos." : "Alterações salvas." });
  }
  function saveFn() {
    if (!fnDraft) return;
    const r = saveFunction(store, fnDraft);
    if (typeof r === "string") { setNotice({ kind: "erro", text: r }); return; }
    setStore(r); setFnDraft(null); setNotice({ kind: "ok", text: "Função salva." });
  }

  return <div className="cd-app">
    <header className="cd-head">
      <div>
        <p className="op-eyebrow">Clientes · MN Patrimônios</p>
        <h1>Condomínios <span>& funções</span></h1>
        <p>Cadastre os condomínios atendidos e as funções das vagas usadas na captação.</p>
      </div>
      {tab === "condominios"
        ? <button className="cd-btn cd-btn-primary" onClick={() => { setDraft(emptyCondo()); setNotice(null); }}><Plus size={16} /> Novo condomínio</button>
        : <button className="cd-btn cd-btn-primary" onClick={() => setFnDraft({ id: "", name: "", description: "", active: true })}><Plus size={16} /> Nova função</button>}
    </header>

    <div className="cd-demo"><Info size={15} /><span><b>Demonstração:</b> dados fictícios salvos apenas neste navegador.</span></div>
    {notice && <div className={`cd-notice cd-n-${notice.kind}`} role="status">
      {notice.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      <span>{notice.text}</span><button aria-label="Fechar aviso" onClick={() => setNotice(null)}><X size={14} /></button></div>}

    <section className="cd-stats" aria-label="Resumo">
      <div className="cd-stat"><span><Building2 size={14} /> Condomínios ativos</span><strong>{stats.active}</strong><small>clientes atendidos</small></div>
      <div className="cd-stat"><span><Briefcase size={14} /> Postos contratados</span><strong>{stats.posts}</strong><small>soma de todas as funções</small></div>
      <div className="cd-stat"><span><Check size={14} /> Funções ativas</span><strong>{stats.functions}</strong><small>disponíveis nas vagas</small></div>
      <div className="cd-stat"><span><Users size={14} /> Candidatos em processo</span><strong>{stats.candidates}</strong><small>vinculados a condomínios</small></div>
    </section>

    <nav className="cd-tabs" role="tablist" aria-label="Cadastros">
      <button role="tab" aria-selected={tab === "condominios"} className={tab === "condominios" ? "cd-tab-active" : ""} onClick={() => setTab("condominios")}>
        <Building2 size={15} /> Condomínios atendidos <b>{store.condos.length}</b></button>
      <button role="tab" aria-selected={tab === "funcoes"} className={tab === "funcoes" ? "cd-tab-active" : ""} onClick={() => setTab("funcoes")}>
        <Briefcase size={15} /> Funções / vagas <b>{store.functions.length}</b></button>
    </nav>

    {tab === "condominios" ? <div className="cd-split">
      <aside className="cd-panel cd-list">
        <div className="cd-list-tools"><label className="cd-search"><Search size={14} /><input placeholder="Buscar condomínio, bairro ou síndico" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
        <ul>
          {list.map(c => <li key={c.id}><button className={c.id === draft.id ? "cd-item cd-item-on" : "cd-item"} onClick={() => { setDraft(c); setNotice(null); }}>
            <b>{c.name}</b><small>{c.district || "Bairro não informado"} · {c.city}/{c.uf}</small>
            <span className="cd-item-foot"><span className={`cd-badge ${c.active ? "cd-b-aprovado" : "cd-b-reprovado"}`}>{c.active ? "Ativo" : "Inativo"}</span>
              <em>{totalPosts(c)} postos · {inProcess(x => x.condoId === c.id)} candidatos</em></span>
          </button></li>)}
          {!list.length && <li className="cd-empty"><Building2 size={18} /> Nenhum condomínio encontrado.</li>}
        </ul>
      </aside>

      <section className="cd-panel cd-main">
        <div className="cd-panel-head"><div><p className="op-eyebrow">{isNew ? "Novo cadastro" : draft.id}</p><h2>{draft.name || "Novo condomínio"}</h2>
          <p>Campos com * são obrigatórios.</p></div>
          <label className="cl-switch"><input type="checkbox" checked={draft.active} onChange={e => set({ active: e.target.checked })} /> <span>{draft.active ? "Cliente ativo" : "Cliente inativo"}</span></label>
        </div>
        <div className="cd-body">
          <div className="cd-grid">
            <label className="cd-f cd-wide"><span>Nome do condomínio *</span><input value={draft.name} onChange={e => set({ name: e.target.value })} /></label>
            <label className="cd-f"><span>CNPJ</span><input inputMode="numeric" placeholder="00.000.000/0000-00" value={draft.cnpj} onChange={e => set({ cnpj: formatCNPJ(e.target.value) })} /></label>
            <label className="cd-f"><span>Nº de unidades</span><input inputMode="numeric" value={draft.units} onChange={e => set({ units: e.target.value.replace(/\D/g, "") })} /></label>
            <label className="cd-f"><span>Início do contrato</span><input type="date" value={draft.contractStart} onChange={e => set({ contractStart: e.target.value })} /></label>
            <label className="cd-f cd-wide"><span>Endereço</span><input value={draft.address} onChange={e => set({ address: e.target.value })} /></label>
            <label className="cd-f"><span>Bairro</span><input value={draft.district} onChange={e => set({ district: e.target.value })} /></label>
            <label className="cd-f"><span>Cidade *</span><input value={draft.city} onChange={e => set({ city: e.target.value })} /></label>
            <label className="cd-f"><span>UF</span><select value={draft.uf} onChange={e => set({ uf: e.target.value })}>{UFS.map(u => <option key={u}>{u}</option>)}</select></label>
            <label className="cd-f"><span>Síndico(a) / responsável *</span><input value={draft.manager} onChange={e => set({ manager: e.target.value })} /></label>
            <label className="cd-f"><span>Telefone / WhatsApp do responsável *</span><input inputMode="tel" value={draft.phone} onChange={e => set({ phone: formatPhone(e.target.value) })} /></label>
            <label className="cd-f"><span>E-mail</span><input type="email" value={draft.email} onChange={e => set({ email: e.target.value })} /></label>
          </div>

          <h3 className="cd-h3">Postos contratados por função <small>{totalPosts(draft)} no total</small></h3>
          <div className="cl-posts">
            {store.functions.filter(f => f.active || draft.posts[f.id]).map(f => <label key={f.id} className="cl-post">
              <span><b>{f.name}</b><small>{inProcess(x => x.condoId === draft.id && x.functionId === f.id)} candidato(s) em processo</small></span>
              <input type="number" min={0} max={999} value={draft.posts[f.id] ?? 0}
                onChange={e => set({ posts: { ...draft.posts, [f.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} aria-label={`Postos de ${f.name}`} />
            </label>)}
          </div>
          <label className="cd-f cd-wide"><span>Observações</span><textarea rows={3} value={draft.notes} placeholder="Horários dos postos, regras do condomínio, contato da administradora…" onChange={e => set({ notes: e.target.value })} /></label>
        </div>
        <footer className="cd-decide">
          <p className={missing.length ? "cd-warn" : "cd-okt"}>{missing.length ? <><AlertTriangle size={15} /> Falta: {missing.join(", ")}.</> : <><Check size={15} /> Pronto para salvar.</>}</p>
          <div className="cd-actions">
            {!isNew && <button className="cd-btn" onClick={() => setDraft(store.condos.find(c => c.id === draft.id) ?? draft)}>Desfazer alterações</button>}
            <button className="cd-btn cd-btn-success" disabled={!!missing.length} onClick={save}><Check size={15} /> {isNew ? "Cadastrar condomínio" : "Salvar alterações"}</button>
          </div>
        </footer>
      </section>
    </div> : <section className="cl-fns">
      {fnDraft && <div className="cd-panel cl-fn cl-fn-edit">
        <label className="cd-f"><span>Nome da função *</span><input autoFocus value={fnDraft.name} onChange={e => setFnDraft({ ...fnDraft, name: e.target.value })} /></label>
        <label className="cd-f"><span>Descrição das atividades</span><textarea rows={3} value={fnDraft.description} onChange={e => setFnDraft({ ...fnDraft, description: e.target.value })} /></label>
        <label className="cl-switch"><input type="checkbox" checked={fnDraft.active} onChange={e => setFnDraft({ ...fnDraft, active: e.target.checked })} /> <span>{fnDraft.active ? "Ativa (aparece nas vagas)" : "Inativa"}</span></label>
        <div className="cd-actions"><button className="cd-btn" onClick={() => setFnDraft(null)}>Cancelar</button>
          <button className="cd-btn cd-btn-success" disabled={!fnDraft.name.trim()} onClick={saveFn}><Check size={15} /> Salvar função</button></div>
      </div>}
      {store.functions.map(f => {
        const posts = store.condos.filter(c => c.active).reduce((a, c) => a + (c.posts[f.id] ?? 0), 0);
        return <article key={f.id} className={`cd-panel cl-fn${f.active ? "" : " cl-off"}`}>
          <div className="cl-fn-head"><Briefcase size={18} /><h3>{f.name}</h3>
            <span className={`cd-badge ${f.active ? "cd-b-aprovado" : "cd-b-reprovado"}`}>{f.active ? "Ativa" : "Inativa"}</span></div>
          <p>{f.description || "Sem descrição."}</p>
          <div className="cl-fn-nums"><span><b>{posts}</b> postos contratados</span><span><b>{inProcess(x => x.functionId === f.id)}</b> candidatos em processo</span></div>
          <button className="cd-btn cd-btn-sm" onClick={() => setFnDraft(f)}>Editar função</button>
        </article>;
      })}
    </section>}
  </div>;
}
