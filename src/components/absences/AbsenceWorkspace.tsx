import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarDays, Check, ClipboardList, Clock3,
  Edit3, FileText, History, Info, Plane, Plus, RotateCcw, Search,
  ShieldCheck, Users, X,
} from "lucide-react";
import { GROUP_IDS, GROUPS, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { isValidReferenceDate } from "@/domain/operation-query";
import { DEFAULT_SCHEDULE, dateOffset, reviseStore, type ScheduleStore } from "@/domain/schedule";
import {
  ABSENCE_DEMO_DATE, ABSENCE_LABELS, ABSENCE_STORAGE_KEY,
  SCHEDULE_STORAGE_KEY, absenceSummary, coverageWithAbsences,
  decideAbsence, demoAbsences, nextWorkDate, restoreAbsences, saveAbsence, validateAbsence,
  type Absence, type AbsenceDraft, type AbsenceStore, type AbsenceType,
} from "@/domain/absences";
import type { GroupId } from "@/domain/types";
import "./AbsenceWorkspace.css";

const INITIAL_DRAFT: AbsenceDraft = {
  employeeId: "FM-001", type: "ferias", start: ABSENCE_DEMO_DATE,
  end: dateOffset(ABSENCE_DEMO_DATE,6), note: "",
};
function displayDate(value: string | null | undefined) {
  if (!value) return "Não definido";
  const [year, month, day] = value.split("-");
  return [day, month, year].join("/");
}
function person(id: string) {
  return DEMO_EMPLOYEES.find(e => e.id === id);
}
function timeframe(entry: Absence,date: string) {
  if (entry.status==="pendente") return "Aguardando decisão";
  if (entry.status==="cancelado") return "Cancelado";
  if (entry.status==="recusado") return "Recusado";
  if (entry.start>date) return "Agendado";
  if (entry.end<date) return "Período encerrado";
  return "Em ausência";
}
function tone(entry: Absence,date: string) {
  if (entry.status==="pendente") return "pending";
  if (entry.status==="cancelado"||entry.status==="recusado") return "neutral";
  if (entry.end<date) return "neutral";
  if (entry.start>date) return "future";
  return "active";
}
function previewImpact(store: AbsenceStore,schedule: ScheduleStore,entry: Absence) {
  const without = { ...store, entries:store.entries.filter(e=>e.id!==entry.id) };
  const withApproval = { ...store, entries: [
    ...without.entries.filter(e=>e.id!==entry.supersedesId),
    {...entry,status:"aprovado" as const},
  ] };
  let maxMissing=0;
  let affected=0;
  // Prévia demonstrativa de até 32 dias, não análise jurídica ou reserva de pessoal.
  for(let offset=0;offset<32;offset++){
    const day=dateOffset(entry.start,offset);
    if(day>entry.end)break;
    const before=coverageWithAbsences(without,schedule,day);
    const after=coverageWithAbsences(withApproval,schedule,day);
    maxMissing=Math.max(maxMissing,after.reduce((n,g)=>n+g.deficit,0));
    if(after.some((item,i)=>item.available<before[i]!.available))affected++;
  }
  return {maxMissing,affected};
}
function loadSchedule():ScheduleStore {
  try{const raw=window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    return raw?reviseStore(JSON.parse(raw)):DEFAULT_SCHEDULE;}
  catch{return DEFAULT_SCHEDULE;}
}
export function AbsenceWorkspace(){
  const [store,setStore]=useState<AbsenceStore>(()=>demoAbsences());
  const [schedule,setSchedule]=useState<ScheduleStore>(DEFAULT_SCHEDULE);
  const [ready,setReady]=useState(false);
  const [date,setDate]=useState(ABSENCE_DEMO_DATE);
  const [tab,setTab]=useState<"overview"|"new"|"requests"|"history">("overview");
  const [group,setGroup]=useState<"all"|GroupId>("all");
  const [kind,setKind]=useState<"all"|AbsenceType>("all");
  const [stage,setStage]=useState<"all"|"active"|"future"|"pending"|"finished">("all");
  const [search,setSearch]=useState("");
  const [draft,setDraft]=useState<AbsenceDraft>(INITIAL_DRAFT);
  const [editing,setEditing]=useState<string|null>(null);
  const [response,setResponse]=useState("");
  const [note,setNote]=useState<Record<string,string>>({});
  const [historyQuery,setHistoryQuery]=useState("");
  const [banner,setBanner]=useState("");
  const [confirmedReset,setConfirmedReset]=useState(false);
  const tableRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    try{const raw=window.localStorage.getItem(ABSENCE_STORAGE_KEY);
      if(raw)setStore(restoreAbsences(JSON.parse(raw)));
    }catch{/* Demonstração continua em memória. */}
    setSchedule(loadSchedule());
    setReady(true);
    const onStorage=(event:StorageEvent)=>{
      if(event.key===SCHEDULE_STORAGE_KEY)setSchedule(loadSchedule());
      if(event.key===ABSENCE_STORAGE_KEY){
        try{setStore(event.newValue?restoreAbsences(JSON.parse(event.newValue)):demoAbsences());}catch{/* evento malformado */}
      }
    };
    window.addEventListener("storage",onStorage);
    return ()=>window.removeEventListener("storage",onStorage);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{window.localStorage.setItem(ABSENCE_STORAGE_KEY,JSON.stringify(store));}
    catch{setBanner("Armazenamento indisponível: os registros permanecerão apenas até fechar esta sessão.");}
  },[store,ready]);
  useEffect(()=>{if(tableRef.current)tableRef.current.scrollTop=0;},[date,group,kind,stage,search]);
  const summary=useMemo(()=>absenceSummary(store,schedule,date),[store,schedule,date]);
  const cover=useMemo(()=>coverageWithAbsences(store,schedule,date),[store,schedule,date]);
  const pending=store.entries.filter(e=>e.status==="pendente").sort((a,b)=>a.start.localeCompare(b.start));
  const visible=store.entries.filter(entry=>{
    const e=person(entry.employeeId);
    if(!e)return false;
    if(group!=="all"&&e.group!==group)return false;
    if(kind!=="all"&&entry.type!==kind)return false;
    if(stage==="active"&&!(entry.status==="aprovado"&&entry.start<=date&&entry.end>=date))return false;
    if(stage==="future"&&!(entry.status==="aprovado"&&entry.start>date))return false;
    if(stage==="pending"&&entry.status!=="pendente")return false;
    if(stage==="finished"&&!(entry.status==="cancelado"||entry.status==="recusado"||
      (entry.status==="aprovado"&&entry.end<date)))return false;
    const normalized=(e.name+" "+e.id+" "+ABSENCE_LABELS[entry.type]).toLocaleLowerCase("pt-BR");
    return normalized.includes(search.trim().toLocaleLowerCase("pt-BR"));
  }).sort((a,b)=>b.start.localeCompare(a.start)||a.id.localeCompare(b.id));
  const returning=store.entries.filter(e=>e.status==="aprovado")
    .map(entry=>({...entry,returnDate:nextWorkDate(schedule,entry.employeeId,entry.end)}))
    .filter(entry=>entry.returnDate&&entry.returnDate>=date&&entry.returnDate<=dateOffset(date,14))
    .sort((a,b)=>(a.returnDate??"").localeCompare(b.returnDate??""));
  const errors=validateAbsence(store,draft,editing??undefined,
    store.entries.find(e=>e.id===editing)?.supersedesId);
  function formStart(item?:Absence){
    if(item){
      setEditing(item.id);
      setDraft({employeeId:item.employeeId,type:item.type,start:item.start,end:item.end,note:item.note});
    }else{
      setEditing(null);
      setDraft({...INITIAL_DRAFT,start:date,end:dateOffset(date,6)});
    }
    setResponse("");setBanner("");setTab("new");
  }
  function save(){
    if(!ready)return;
    const result=saveAbsence(store,draft,editing??undefined);
    if(!result.ok){setResponse(result.errors.join(" "));return;}
    setStore(result.store);setResponse("");
    setEditing(null);
    setBanner("Pedido enviado para análise. Se o período anterior estava aprovado, ele permanece ativo até a nova decisão.");
    setTab("requests");
  }
  function decide(id:string,action:"aprovar"|"recusar"|"cancelar"){
    const value=(note[id]??"").trim();
    const result=decideAbsence(store,id,action,value);
    if(!result.ok){setBanner(result.message);return;}
    setStore(result.store);
    setBanner(action==="aprovar"?"Ausência aprovada na demonstração. Cobertura e retorno previstos recalculados.":result.message);
    setNote(prev=>({...prev,[id]:""}));
  }
  function reset(){
    if(!confirmedReset){setBanner("Marque a confirmação antes de restaurar os registros fictícios.");return;}
    if(!window.confirm("Restaurar todos os registros fictícios, descartando suas alterações locais desta aba?"))return;
    setStore(demoAbsences());setConfirmedReset(false);
    setBanner("Registros de demonstração restaurados neste navegador.");setTab("overview");
  }
  function writeDraft<T extends keyof AbsenceDraft>(key:T,value:AbsenceDraft[T]){
    setDraft(prev=>({...prev,[key]:value}));
  }
  return <div className="fa-app formosa-operation">
    <header className="fa-head">
      <div><p className="op-eyebrow">FORMOSA · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
        <h1>Férias <span>&</span> afastamentos</h1>
        <p>Solicitações, ausências aprovadas, cobertura por grupo e previsão de retorno em um só lugar.</p></div>
      <label className="fa-ref"><CalendarDays size={16}/><span>Data de referência</span>
        <input type="date" aria-label="Data de referência" value={date}
          onChange={e=>{if(isValidReferenceDate(e.target.value))setDate(e.target.value);}}/>
      </label>
    </header>
    <div className="fa-demo"><ShieldCheck size={18}/><p><b>Ambiente demonstrativo — {UNIT.unit}.</b>
      Os 63 colaboradores são fictícios. Pedidos e decisões ficam somente neste navegador, sem documento médico,
      autenticação gerencial ou comunicação com a empresa. Não constitui aprovação real de férias ou atestado.</p></div>
    {banner&&<div className="fa-banner" role="status"><Info size={16}/><span>{banner}</span>
      <button type="button" aria-label="Fechar mensagem" onClick={()=>setBanner("")}><X size={15}/></button></div>}
    <section className="fa-stats" aria-label="Indicadores de férias e afastamentos">
      <div className="fa-stat"><span><Plane size={16}/> Em férias</span><strong>{summary.vacation}</strong><small>Períodos aprovados na data</small></div>
      <div className="fa-stat"><span><FileText size={16}/> Atestados e afastamentos</span><strong>{summary.medical}</strong><small>Ausências aprovadas na data</small></div>
      <div className="fa-stat"><span><Clock3 size={16}/> Retornos nos próximos 7 dias</span><strong>{summary.returning}</strong><small>Primeiro turno planejado após o fim</small></div>
      <div className="fa-stat"><span><ClipboardList size={16}/> Pedidos pendentes</span><strong>{summary.pending}</strong><small>Aguardando avaliação da gestão</small></div>
    </section>
    <nav className="fa-tabs" aria-label="Navegação de férias e afastamentos">
      {([
        ["overview","Controle e cobertura",Users],
        ["new","Cadastrar pedido",Plus],
        ["requests","Solicitações",ClipboardList],
        ["history","Histórico",History],
      ] as const).map(([id,label,Icon])=><button key={id} type="button" className={tab===id?"fa-tab-active":""}
        aria-current={tab===id?"page":undefined} onClick={()=>id==="new"?formStart():setTab(id)}>
        <Icon size={16}/>{label}{id==="requests"&&pending.length>0&&<b>{pending.length}</b>}
      </button>)}
    </nav>

    {tab==="overview"&&<>
      <div className="fa-duo">
        <section className="fa-panel">
          <div className="fa-panel-head"><div><p className="op-eyebrow">EFETIVO DO DIA · A/B/C</p>
            <h2>Disponibilidade operacional</h2><p>Programados na escala, ausências aprovadas e disponíveis.</p></div>
            <span className="fa-count">{summary.scheduledAbsent} ausente(s) escalado(s)</span>
          </div>
          <div className="fa-cover">
            {cover.map(c=><div className="fa-cover-row" key={c.group}>
              <div className="fa-cover-title"><b><span>Grupo {c.group}</span> · {GROUPS[c.group].name}</b>
                <strong>{c.available}/{c.required}</strong></div>
              <div className="fa-cover-track"><span style={{width:c.required?Math.min(100,c.available/c.required*100)+"%":"100%"}}
                className={c.deficit?"fa-track-low":"fa-track-ok"}/></div>
              <div className="fa-cover-meta"><span>{c.scheduled} previstos · {c.absent} ausente(s) · {c.available} disponíveis</span>
                <b className={c.deficit?"fa-danger-text":"fa-success-text"}>
                  {c.deficit?c.deficit+" abaixo do mínimo":"Cobertura prevista adequada"}</b></div>
            </div>)}
          </div>
          <div className={"fa-cover-footer "+(summary.extraDeficit?"fa-footer-warning":"")}>
            <AlertTriangle size={16}/><span>{summary.extraDeficit
              ?summary.extraDeficit+" posto(s) adicionais descobertos por ausências aprovadas. Verificar substituição."
              :summary.totalDeficit
                ?"Há déficit pré-existente na escala; as ausências não ampliam o déficit neste dia."
                :"Nenhum déficit calculado para a data."}</span>
          </div>
        </section>
        <section className="fa-panel">
          <div className="fa-panel-head"><div><p className="op-eyebrow">PRÓXIMOS DIAS</p>
            <h2>Previsão de retornos</h2><p>O primeiro turno planejado após o período de ausência.</p></div>
            <span className="fa-count">{returning.length} em 14 dias</span>
          </div>
          <div className="fa-return-list">
            {!returning.length&&<p className="fa-empty">Nenhum retorno previsto para os próximos 14 dias.</p>}
            {returning.slice(0,6).map(item=><div className="fa-return" key={item.id}>
              <span className="fa-return-calendar"><CalendarDays size={16}/>{displayDate(item.returnDate)}</span>
              <div><b>{person(item.employeeId)?.name}</b>
                <small>{ABSENCE_LABELS[item.type]} · Grupo {person(item.employeeId)?.group} · Fim: {displayDate(item.end)}</small></div>
              <span className="fa-pill fa-pill-future">Previsto</span>
            </div>)}
          </div>
          <div className="fa-note"><Info size={15}/> Retorno previsto não significa retorno confirmado, alta médica ou encerramento de benefício.</div>
        </section>
      </div>
      <section className="fa-panel">
        <div className="fa-panel-head"><div><p className="op-eyebrow">ACOMPANHAMENTO INDIVIDUAL</p><h2>Quadro de férias e afastamentos</h2>
          <p>Consulte o período, a situação atual, o grupo e o primeiro retorno planejado.</p></div>
          <button type="button" className="fa-primary" onClick={()=>formStart()}><Plus size={16}/> Novo pedido</button>
        </div>
        <div className="fa-filters">
          <label className="fa-search"><Search size={16}/><input aria-label="Buscar colaborador ou matrícula"
            value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nome ou matrícula"/></label>
          <select aria-label="Filtrar grupo" value={group} onChange={e=>setGroup(e.target.value as "all"|GroupId)}>
            <option value="all">Todos os grupos</option>{GROUP_IDS.map(g=><option key={g} value={g}>Grupo {g}</option>)}
          </select>
          <select aria-label="Filtrar tipo" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>
            <option value="all">Todos os tipos</option><option value="ferias">Férias</option>
            <option value="atestado">Atestados</option><option value="afastamento">Afastamentos</option>
          </select>
          <select aria-label="Filtrar situação" value={stage} onChange={e=>setStage(e.target.value as typeof stage)}>
            <option value="all">Todas as situações</option><option value="active">Em ausência</option>
            <option value="future">Agendados</option><option value="pending">Pendentes</option>
            <option value="finished">Encerrados / cancelados</option>
          </select>
        </div>
        <div className="fa-table-scroll" ref={tableRef} tabIndex={0} role="region"
          aria-label="Tabela de ausências com rolagem vertical">
          <table className="fa-table"><thead><tr><th>Colaborador</th><th>Grupo</th><th>Tipo</th>
            <th>Início</th><th>Fim</th><th>Retorno previsto</th><th>Situação</th><th>Ações</th></tr></thead>
            <tbody>{visible.map(item=><tr key={item.id}>
              <td><b>{person(item.employeeId)?.name}</b><small>{item.employeeId}</small></td>
              <td>{person(item.employeeId)?.group}</td>
              <td>{ABSENCE_LABELS[item.type]}</td>
              <td>{displayDate(item.start)}</td><td>{displayDate(item.end)}</td>
              <td>{item.status==="aprovado"?displayDate(nextWorkDate(schedule,item.employeeId,item.end)):"—"}</td>
              <td><span className={"fa-pill fa-pill-"+tone(item,date)}>{timeframe(item,date)}</span></td>
              <td><div className="fa-row-actions">
                {(item.status==="pendente"||item.status==="aprovado")&&<button type="button" onClick={()=>formStart(item)}
                  title="Editar período; retorna para análise"><Edit3 size={14}/> Editar</button>}
                {item.status==="pendente"&&<button type="button" onClick={()=>setTab("requests")}>Analisar</button>}
                {item.status==="aprovado"&&<button type="button" onClick={()=>setTab("requests")}>Cancelar</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!visible.length&&<p className="fa-empty">Nenhuma ausência encontrada nos filtros selecionados.</p>}
        <div className="fa-table-bottom"><span>{visible.length} registro(s) · cabeçalho fixo · rolagem vertical</span>
          <span>{summary.absent} pessoa(s) em ausência aprovada nesta data</span></div>
      </section>
    </>}

    {tab==="new"&&<section className="fa-panel fa-form-panel">
      <div className="fa-panel-head"><div><p className="op-eyebrow">CADASTRO ADMINISTRATIVO</p>
        <h2>{editing?"Propor alteração de período":"Nova solicitação de ausência"}</h2>
        <p>Preencha o tipo e o período. A análise gerencial é registrada separadamente.</p></div>
        <button type="button" className="fa-outline" onClick={()=>{setTab("overview");setEditing(null);}}>Voltar ao controle</button>
      </div>
      <div className="fa-form-grid">
        <label className="fa-field"><span>Colaborador</span>
          <select aria-label="Colaborador" value={draft.employeeId} onChange={e=>writeDraft("employeeId",e.target.value)}>
            {DEMO_EMPLOYEES.map(e=><option key={e.id} value={e.id}>{e.name} · {e.id} · Grupo {e.group}</option>)}
          </select></label>
        <label className="fa-field"><span>Tipo do pedido</span>
          <select aria-label="Tipo da ausência" value={draft.type} onChange={e=>writeDraft("type",e.target.value as AbsenceType)}>
            <option value="ferias">Férias</option><option value="atestado">Atestado médico (sem diagnóstico)</option>
            <option value="afastamento">Afastamento</option>
          </select></label>
        <label className="fa-field"><span>Data inicial</span><input aria-label="Data inicial" type="date"
          value={draft.start} onChange={e=>writeDraft("start",e.target.value)}/></label>
        <label className="fa-field"><span>Último dia do período (inclusive)</span><input aria-label="Data final" type="date"
          value={draft.end} onChange={e=>writeDraft("end",e.target.value)}/></label>
        <label className="fa-field fa-field-full"><span>Observação operacional (opcional, sem dados de saúde)</span>
          <textarea aria-label="Observação administrativa" rows={3} maxLength={240}
            placeholder="Ex.: programação de cobertura ou referência interna; não informe diagnóstico ou CID."
            value={draft.note} onChange={e=>writeDraft("note",e.target.value)}/></label>
      </div>
      <div className="fa-form-forecast">
        <div><span>Colaborador e setor</span><strong>{person(draft.employeeId)?.name??"—"} · Grupo {person(draft.employeeId)?.group??"—"}</strong></div>
        <div><span>Duração em dias corridos</span><strong>{isValidReferenceDate(draft.start)&&isValidReferenceDate(draft.end)&&draft.end>=draft.start
          ?Math.round((Date.parse(draft.end+"T12:00:00Z")-Date.parse(draft.start+"T12:00:00Z"))/86400000)+1:"—"}</strong></div>
        <div><span>Primeiro turno previsto após o fim</span><strong>{isValidReferenceDate(draft.end)
          ?displayDate(nextWorkDate(schedule,draft.employeeId,draft.end)):"—"}</strong></div>
      </div>
      {errors.length>0&&<div className="fa-warning" role="alert"><AlertTriangle size={16}/>
        <div>{errors.map((line,i)=><p key={i}>{line}</p>)}</div></div>}
      {response&&<div className="fa-warning" role="alert">{response}</div>}
      <div className="fa-privacy"><ShieldCheck size={16}/>
        Não anexar atestados, CID, diagnósticos nem documentos reais nesta demonstração. Após salvar,
        o pedido fica <b>pendente</b>; uma alteração de período aprovado preserva o original até aprovação da mudança.</div>
      <div className="fa-form-footer"><button type="button" className="fa-outline"
        onClick={()=>setTab("overview")}>Cancelar edição</button>
        <button type="button" className="fa-primary" disabled={!ready||errors.length>0}
          onClick={save}><Check size={16}/>{editing?"Reenviar para aprovação":"Registrar pedido"}</button></div>
    </section>}

    {tab==="requests"&&<section className="fa-panel">
      <div className="fa-panel-head"><div><p className="op-eyebrow">ANÁLISE DA GESTÃO</p><h2>Pedidos pendentes e cancelamentos</h2>
        <p>Aprovar férias ou atestado altera a disponibilidade no quadro, não a escala cadastrada.</p></div>
        <span className="fa-count">{pending.length} aguardando</span></div>
      <div className="fa-queue">
        {pending.length===0&&<p className="fa-empty">Nenhum pedido pendente. Os períodos aprovados podem ser cancelados abaixo.</p>}
        {pending.map(entry=>{
          const outlook=previewImpact(store,schedule,entry);
          return <article className="fa-request" key={entry.id}>
            <div className="fa-request-heading"><div><b>{person(entry.employeeId)?.name}</b>
              <span>{entry.employeeId} · Grupo {person(entry.employeeId)?.group} · {ABSENCE_LABELS[entry.type]}
                {entry.supersedesId?" · Alteração de período aprovado":""}</span></div>
              <span className="fa-pill fa-pill-pending">Pendente</span></div>
            <div className="fa-request-dates"><CalendarDays size={15}/> {displayDate(entry.start)} — {displayDate(entry.end)}
              <ArrowRight size={14}/> Retorno previsto: {displayDate(nextWorkDate(schedule,entry.employeeId,entry.end))}</div>
            <div className={outlook.maxMissing?"fa-impact fa-impact-risk":"fa-impact"}>
              <AlertTriangle size={15}/><span>{outlook.affected} dia(s) escalado(s) impactado(s), até
                {" "+outlook.maxMissing} posto(s) abaixo da meta nos dias avaliados. Prévia dos primeiros 32 dias.</span></div>
            <label className="fa-field"><span>Parecer administrativo (obrigatório ao recusar/cancelar)</span>
              <input aria-label={"Parecer de "+entry.id} value={note[entry.id]??""} maxLength={240}
                onChange={e=>setNote(prev=>({...prev,[entry.id]:e.target.value}))}
                placeholder="Informe uma decisão administrativa, sem detalhes de saúde"/></label>
            <div className="fa-request-actions">
              <button type="button" className="fa-primary" onClick={()=>decide(entry.id,"aprovar")}><Check size={15}/> Aprovar demonstrativamente</button>
              <button type="button" className="fa-outline" onClick={()=>decide(entry.id,"recusar")}><X size={15}/> Recusar</button>
              <button type="button" className="fa-outline" onClick={()=>formStart(entry)}><Edit3 size={15}/> Editar</button>
            </div>
          </article>;
        })}
        <div className="fa-cancel-title"><h3>Períodos aprovados — alteração ou cancelamento</h3>
          <p>Cancelamentos exigem justificativa e permanecem no histórico local.</p></div>
        {store.entries.filter(e=>e.status==="aprovado").map(entry=><div className="fa-approved-row" key={entry.id}>
          <div><b>{person(entry.employeeId)?.name}</b><small>{ABSENCE_LABELS[entry.type]} ·
            {" "+displayDate(entry.start)} a {displayDate(entry.end)}</small></div>
          <input aria-label={"Motivo de cancelamento "+entry.id} value={note[entry.id]??""}
            onChange={e=>setNote(prev=>({...prev,[entry.id]:e.target.value}))} maxLength={240}
            placeholder="Justificativa para cancelar"/>
          <button type="button" className="fa-outline fa-outline-danger"
            onClick={()=>decide(entry.id,"cancelar")}>Cancelar período</button>
        </div>)}
      </div>
      <div className="fa-note"><Info size={15}/> A aprovação é apenas administrativa e ilustrativa.
        Alertas mostram impacto operacional, mas não determinam validade legal de atestados ou direitos trabalhistas.</div>
    </section>}

    {tab==="history"&&<section className="fa-panel">
      <div className="fa-panel-head"><div><p className="op-eyebrow">ALTERAÇÕES E RESPONSÁVEIS</p>
        <h2>Histórico demonstrativo</h2><p>Pedidos, decisões, alterações e cancelamentos realizados neste navegador.</p></div>
        <span className="fa-count">{store.history.length} evento(s)</span></div>
      <div className="fa-filters"><label className="fa-search"><Search size={16}/>
        <input aria-label="Pesquisar histórico" placeholder="Filtrar eventos" value={historyQuery}
          onChange={e=>setHistoryQuery(e.target.value)}/></label></div>
      <div className="fa-history">
        {store.history.length===0&&<p className="fa-empty">Sem novas alterações ainda. Os exemplos iniciais são fictícios.</p>}
        {[...store.history].reverse().filter(item=>(item.description+" "+item.absenceId).toLowerCase()
          .includes(historyQuery.trim().toLowerCase())).map(item=><div key={item.id}>
            <span>{item.occurredAt?new Date(item.occurredAt).toLocaleString("pt-BR"):"—"} · {item.absenceId}</span>
            <b>{item.description}</b><small>Responsável: {item.actor} · simulação sem login</small>
          </div>)}
      </div>
      <div className="fa-reset"><label><input type="checkbox" checked={confirmedReset}
        onChange={e=>setConfirmedReset(e.target.checked)}/> Confirmo que quero restaurar os dados fictícios desta aba</label>
        <button type="button" className="fa-outline fa-outline-danger" onClick={reset}>
          <RotateCcw size={15}/> Restaurar demonstração</button>
      </div>
      <div className="fa-note"><History size={15}/> Histórico local, editável pelo navegador;
        não substitui trilha auditável, identificação do gestor ou guarda de documentos oficiais.</div>
    </section>}
  </div>;
}
