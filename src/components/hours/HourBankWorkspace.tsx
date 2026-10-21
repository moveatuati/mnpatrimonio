import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Check,
  Clock3, Download, FileClock, History, Info, Plus, RotateCcw, Search,
  ShieldCheck, Users, Wallet, X,
} from "lucide-react";
import { GROUP_IDS, GROUPS, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { isValidReferenceDate } from "@/domain/operation-query";
import {
  DEFAULT_DRAFT, ENTRY_STATUSES, HOUR_KEY, KINDS, REFERENCE_DAY,
  decideEntry, demoHourStore, duration, hourSnapshot, hourTotals,
  monthWindow, parseMinutes, proposeEntry, restoreHours,
  reverseEntry, validateDraft, type EntryDraft, type EntryStatus, type HourEntry, type HourKind,
  type HourStore,
} from "@/domain/hour-bank";
import type { GroupId } from "@/domain/types";
import { BankManagerPanel } from "./BankManagerPanel";
import "./HourBankWorkspace.css";

type Tab = "manager" | "overview" | "new" | "approval" | "statement" | "history";
const asDate=(date:string)=>{
  const [y,m,d]=date.split("-");return [d,m,y].join("/");
};
const employeeOf=(id:string)=>DEMO_EMPLOYEES.find(e=>e.id===id);
function csvSafe(value:unknown){
  const raw=String(value??"").replace(/"/g,'""');
  return '"'+(/^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw)+'"';
}
function exportLedger(entries:HourEntry[],asOf:string){
  const header=["ID","Colaborador","Matrícula","Função","Competência","Natureza","Movimento HH:MM",
    "Minutos assinados","Situação","Justificativa","Responsável","Registro em","Decisão em","Parecer","Estorno de"];
  const rows=entries.map(entry=>{
    const e=employeeOf(entry.employeeId);
    return [entry.id,e?.name,entry.employeeId,e?.group,entry.date,KINDS[entry.kind],
      duration(entry.minutes),entry.minutes,ENTRY_STATUSES[entry.status],entry.description,
      entry.responsible,entry.createdAt,entry.decidedAt??"",entry.decisionNote??"",entry.reversalOf??""];
  });
  const csv="\uFEFF"+[header,...rows].map(row=>row.map(csvSafe).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const link=document.createElement("a");
  const href=URL.createObjectURL(blob);
  link.href=href;link.download="formosa-banco-horas-demo-"+asOf+".csv";
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function HourAmount({value}:{value:number}){
  return <span className={"bh-amount "+(value>0?"bh-positive":value<0?"bh-negative":"bh-zero")}>{duration(value)}</span>;
}
function LedgerTable({entries,onPerson,onReverse,reverseAvailable}:{
  entries:HourEntry[];onPerson:(id:string)=>void;onReverse?:(id:string)=>void;
  reverseAvailable?:(entry:HourEntry)=>boolean;
}){
  return <div className="bh-table-scroll" role="region" aria-label="Extrato de movimentações com rolagem vertical" tabIndex={0}>
    <table className="bh-table"><thead><tr>
      <th>Data</th><th>Colaborador</th><th>Movimentação</th><th>Horas</th>
      <th>Situação</th><th>Responsável</th><th>Ações</th>
    </tr></thead><tbody>
      {entries.map(e=><tr key={e.id}>
        <td className="bh-numeric">{asDate(e.date)}<small>{e.id}</small></td>
        <td><b>{employeeOf(e.employeeId)?.name??e.employeeId}</b><small>{e.employeeId}</small></td>
        <td><b>{KINDS[e.kind]}</b><small>{e.description}</small>
          {e.reversalOf&&<small>Referente a {e.reversalOf}</small>}</td>
        <td className="bh-numeric"><HourAmount value={e.minutes}/></td>
        <td><span className={"bh-status bh-status-"+e.status}>{ENTRY_STATUSES[e.status]}</span></td>
        <td><b>{e.responsible}</b><small>{e.decisionNote??"—"}</small></td>
        <td><div className="bh-row-actions">
          <button type="button" onClick={()=>onPerson(e.employeeId)}>Extrato</button>
          {onReverse&&reverseAvailable?.(e)&&<button type="button" onClick={()=>onReverse(e.id)}>Estornar</button>}
        </div></td>
      </tr>)}
    </tbody></table>
    {!entries.length&&<p className="bh-empty">Nenhuma movimentação corresponde aos filtros.</p>}
  </div>;
}
export function HourBankWorkspace(){
  const [store,setStore]=useState<HourStore>(()=>demoHourStore());
  const [ready,setReady]=useState(false);
  const [date,setDate]=useState(REFERENCE_DAY);
  const [tab,setTab]=useState<Tab>("manager");
  const [search,setSearch]=useState("");
  const [group,setGroup]=useState<"all"|GroupId>("all");
  const [onlyBalance,setOnlyBalance]=useState<"all"|"positive"|"negative"|"zero">("all");
  const [employeeId,setEmployeeId]=useState("MN-001");
  const [draft,setDraft]=useState<EntryDraft>(DEFAULT_DRAFT);
  const [reasonById,setReasonById]=useState<Record<string,string>>({});
  const [reviewer,setReviewer]=useState("Gestor demonstrativo");
  const [reverseTarget,setReverseTarget]=useState<HourEntry|null>(null);
  const [reverseReason,setReverseReason]=useState("");
  const [feedback,setFeedback]=useState("");
  const [historySearch,setHistorySearch]=useState("");
  const [resetCheck,setResetCheck]=useState(false);
  const [ledgerQuery,setLedgerQuery]=useState("");
  const [ledgerStatus,setLedgerStatus]=useState<"all"|EntryStatus>("all");
  const tableRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    try { const raw=window.localStorage.getItem(HOUR_KEY);
      if(raw)setStore(restoreHours(JSON.parse(raw)));
    }catch{ /* navegador pode impedir armazenamento local */ }
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{window.localStorage.setItem(HOUR_KEY,JSON.stringify(store));}
    catch{setFeedback("Armazenamento indisponível. Alterações desta sessão poderão não persistir.");}
  },[store,ready]);
  useEffect(()=>{if(tableRef.current)tableRef.current.scrollTop=0;},[search,group,onlyBalance,date]);
  const totals=useMemo(()=>hourTotals(store,date),[store,date]);
  const snapshots=useMemo(()=>hourSnapshot(store,date),[store,date]);
  const filtered=snapshots.filter(row=>{
    if(group!=="all"&&row.employee.group!==group)return false;
    if(onlyBalance==="positive"&&row.closing<=0)return false;
    if(onlyBalance==="negative"&&row.closing>=0)return false;
    if(onlyBalance==="zero"&&row.closing!==0)return false;
    const q=search.trim().toLocaleLowerCase("pt-BR");
    return !q||(row.employee.name+" "+row.employee.id).toLocaleLowerCase("pt-BR").includes(q);
  });
  const pending=store.entries.filter(e=>e.status==="pendente").sort((a,b)=>a.date.localeCompare(b.date));
  const {first}=monthWindow(date);
  const current=employeeOf(employeeId)!;
  const currentSnap=snapshots.find(e=>e.employee.id===employeeId)!;
  const personal=store.entries.filter(e=>e.employeeId===employeeId&&e.date<=date)
    .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  const ledger=store.entries.filter(e=>e.date<=date&&
    (ledgerStatus==="all"||e.status===ledgerStatus)&&
    (!ledgerQuery.trim()||(KINDS[e.kind]+" "+e.description+" "+e.id+" "+(employeeOf(e.employeeId)?.name??"")+
      " "+e.employeeId).toLocaleLowerCase("pt-BR").includes(ledgerQuery.trim().toLocaleLowerCase("pt-BR"))))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  const errors=validateDraft(draft);
  const canReverse=(entry:HourEntry)=>entry.status==="aprovado"&&entry.kind!=="estorno"&&
    !store.entries.some(item=>item.reversalOf===entry.id&&item.status==="aprovado");
  function openPerson(id:string){setEmployeeId(id);setReverseTarget(null);setTab("statement");}
  function newEntry(id?:string){
    setDraft({...DEFAULT_DRAFT,employeeId:id??employeeId,date});
    setFeedback("");setTab("new");
  }
  function submit(){
    const result=proposeEntry(store,draft);
    if(!result.ok){setFeedback(result.errors.join(" "));return;}
    setStore(result.store);setFeedback("Lançamento enviado para aprovação. Ainda não alterou o saldo.");
    setTab("approval");setDraft({...DEFAULT_DRAFT,date});
  }
  function decide(id:string,decision:"aprovar"|"recusar"){
    const result=decideEntry(store,id,decision,reviewer,reasonById[id]??"");
    if(!result.ok){setFeedback(result.message);return;}
    setStore(result.store);
    setReasonById(prev=>({...prev,[id]:""}));
    setFeedback(decision==="aprovar"?
      "Lançamento aprovado na demonstração. O saldo foi recalculado na competência informada.":
      "Lançamento recusado e preservado no extrato para conferência.");
  }
  function reverse(){
    if(!reverseTarget)return;
    const result=reverseEntry(store,reverseTarget.id,reviewer,reverseReason);
    if(!result.ok){setFeedback(result.message);return;}
    setStore(result.store);setReverseTarget(null);setReverseReason("");
    setFeedback(result.message);
  }
  function reset(){
    if(!resetCheck){setFeedback("Confirme a restauração dos dados de demonstração.");return;}
    if(!window.confirm("Restaurar os lançamentos fictícios do banco de horas? Suas operações locais serão substituídas."))return;
    setStore(demoHourStore());setResetCheck(false);
    setFeedback("Banco de horas demonstrativo restaurado.");setTab("overview");
  }
  function download(){
    try{exportLedger(store.entries,date);setFeedback("Extrato CSV demonstrativo gerado, incluindo todas as situações e competências.");}
    catch{setFeedback("Não foi possível gerar o CSV neste navegador.");}
  }
  function updateDraft<T extends keyof EntryDraft>(key:T,value:EntryDraft[T]){
    setDraft(prev=>({...prev,[key]:value}));
  }
  return <div className="bh-app formosa-operation">
    <header className="bh-head">
      <div><p className="op-eyebrow">MN PATRIMÔNIOS · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
        <h1>Banco <span>de horas</span></h1>
        <p>O ponto eletrônico registra os minutos após a saída e eles viram crédito. Com 1 jornada acumulada (7h20 nos serviços gerais, 11h na portaria 12×36), o colaborador ganha uma folga de compensação.</p></div>
      <label className="bh-date"><CalendarDays size={17}/><span>Posição até</span>
        <input aria-label="Data de referência" type="date" value={date}
          onChange={e=>{if(isValidReferenceDate(e.target.value))setDate(e.target.value);}}/></label>
    </header>
    <div className="bh-demo"><ShieldCheck size={18}/><span><b>DEMONSTRAÇÃO · {UNIT.unit}.</b>
      Os {DEMO_EMPLOYEES.length} colaboradores e saldos são fictícios. Apenas lançamentos aprovados entram nas contas.
      Sem registro oficial de ponto, folha, banco de dados ou autorização empresarial real.</span></div>
    {feedback&&<div className="bh-feedback" role="status"><Info size={16}/><span>{feedback}</span>
      <button type="button" aria-label="Dispensar aviso" onClick={()=>setFeedback("")}><X size={15}/></button></div>}
    <section className="bh-stats" aria-label="Resumo de banco de horas">
      <div className="bh-stat"><span><ArrowUpRight size={17}/> Saldo positivo acumulado</span>
        <strong className="bh-positive">{duration(totals.positive)}</strong>
        <small>{totals.peoplePositive} colaborador(es) com crédito</small></div>
      <div className="bh-stat"><span><ArrowDownRight size={17}/> Saldo negativo acumulado</span>
        <strong className="bh-negative">{duration(-totals.negative)}</strong>
        <small>{totals.peopleNegative} colaborador(es) com débito</small></div>
      <div className="bh-stat"><span><Wallet size={17}/> Saldo líquido geral</span>
        <strong>{duration(totals.net)}</strong><small>Somatório dos saldos individuais</small></div>
      <div className="bh-stat"><span><Clock3 size={17}/> Pendentes de aprovação</span>
        <strong>{totals.pending}</strong><small>Não contabilizados no saldo</small></div>
    </section>
    <nav className="bh-tabs" aria-label="Áreas do banco de horas">
      {([
        ["manager","Consulta rápida do supervisor",Search],["overview","Saldos e equipe",Users],["new","Novo lançamento",Plus],
        ["approval","Autorizações",Check],["statement","Extrato individual",FileClock],
        ["history","Movimentações e histórico",History],
      ] as const).map(([id,label,Icon])=><button type="button" key={id}
        className={tab===id?"bh-tab-active":""} aria-current={tab===id?"page":undefined}
        onClick={()=>id==="new"?newEntry():setTab(id)}>
        <Icon size={16}/>{label}{id==="approval"&&pending.length>0&&<b>{pending.length}</b>}</button>)}
    </nav>
    {tab==="manager"&&<BankManagerPanel store={store} onStore={setStore} date={date}/>}
    {tab==="overview"&&<>
      <section className="bh-panel bh-period">
        <div className="bh-panel-head"><div><p className="op-eyebrow">MOVIMENTAÇÃO DA COMPETÊNCIA</p><h2>Fechamento até {asDate(date)}</h2>
          <p>Saldo anterior + créditos − débitos = saldo final. Minutos exatos, sem arredondamentos.</p></div>
          <button type="button" className="bh-outline" onClick={download}><Download size={15}/> Exportar CSV completo</button></div>
        <div className="bh-equation">
          <div><span>Saldo anterior</span><strong><HourAmount value={snapshots.reduce((n,r)=>n+r.opening,0)}/></strong></div>
          <i>+</i>
          <div><span>Créditos do mês</span><strong className="bh-positive">{duration(totals.credited)}</strong></div>
          <i>−</i>
          <div><span>Débitos do mês</span><strong className="bh-negative">{duration(-totals.debited)}</strong></div>
          <i>=</i>
          <div className="bh-equation-final"><span>Saldo final</span><strong>{duration(totals.net)}</strong></div>
        </div>
        <div className="bh-meta"><Info size={15}/> Saldo líquido não substitui a apuração individual. Débitos e créditos são somados separadamente para não esconder saldos opostos entre funcionários.</div>
      </section>
      <section className="bh-panel">
        <div className="bh-panel-head"><div><p className="op-eyebrow">CONTROLE INDIVIDUAL</p>
          <h2>Quadro dos colaboradores</h2><p>Pesquisa, filtros por função e saldo, rolando na própria tabela.</p></div>
          <span className="bh-count">{filtered.length} pessoa(s)</span></div>
        <div className="bh-filters">
          <label className="bh-search"><Search size={16}/><input value={search}
            aria-label="Buscar colaborador" placeholder="Buscar nome ou matrícula"
            onChange={e=>setSearch(e.target.value)}/></label>
          <select aria-label="Filtrar grupo" value={group} onChange={e=>setGroup(e.target.value as "all"|GroupId)}>
            <option value="all">Todos os grupos</option>
            {GROUP_IDS.map(g=><option key={g} value={g}>{GROUPS[g].name}</option>)}
          </select>
          <select aria-label="Filtrar saldo" value={onlyBalance}
            onChange={e=>setOnlyBalance(e.target.value as typeof onlyBalance)}>
            <option value="all">Todos os saldos</option><option value="positive">Positivos</option>
            <option value="negative">Negativos</option><option value="zero">Zerados</option>
          </select>
        </div>
        <div className="bh-table-scroll" ref={tableRef} role="region" aria-label="Tabela de saldos com rolagem vertical" tabIndex={0}>
          <table className="bh-table"><thead><tr><th>Colaborador</th><th>Função</th><th>Saldo anterior</th>
            <th>Créditos do mês</th><th>Débitos do mês</th><th>Saldo até a data</th><th>Pendências</th><th>Ações</th>
          </tr></thead><tbody>{filtered.map(r=><tr key={r.employee.id}>
            <td><b>{r.employee.name}</b><small>{r.employee.id}</small></td>
            <td>{GROUPS[r.employee.group].name}</td>
            <td><HourAmount value={r.opening}/></td>
            <td className="bh-positive">{duration(r.credits)}</td>
            <td className="bh-negative">{duration(-r.debits)}</td>
            <td><HourAmount value={r.closing}/></td>
            <td><span className={"bh-status "+(r.pending?"bh-status-pendente":"bh-status-zero")}>{r.pending||"—"}</span></td>
            <td><div className="bh-row-actions"><button type="button" onClick={()=>openPerson(r.employee.id)}>Extrato</button>
              <button type="button" onClick={()=>newEntry(r.employee.id)}>Lançar</button></div></td>
          </tr>)}</tbody></table>
          {!filtered.length&&<p className="bh-empty">Nenhum colaborador corresponde aos filtros.</p>}
        </div>
        <div className="bh-panel-footer">{filtered.length} de {DEMO_EMPLOYEES.length} colaboradores · títulos fixos · sem paginação</div>
      </section>
    </>}
    {tab==="new"&&<section className="bh-panel bh-form-panel">
      <div className="bh-panel-head"><div><p className="op-eyebrow">LANÇAMENTO MANUAL COM JUSTIFICATIVA</p>
        <h2>Registrar movimentação</h2>
        <p>O registro ficará pendente. Somente uma decisão explícita o contabilizará.</p></div>
        <span className="bh-count">Aprovação necessária</span></div>
      <div className="bh-form-grid">
        <label className="bh-field"><span>Colaborador</span>
          <select aria-label="Colaborador" value={draft.employeeId}
            onChange={e=>updateDraft("employeeId",e.target.value)}>
            {DEMO_EMPLOYEES.map(e=><option key={e.id} value={e.id}>{e.name} · {e.id} · {GROUPS[e.group].name}</option>)}
          </select></label>
        <label className="bh-field"><span>Natureza da movimentação</span>
          <select aria-label="Tipo de movimentação" value={draft.kind}
            onChange={e=>updateDraft("kind",e.target.value as EntryDraft["kind"])}>
            {Object.entries(KINDS).filter(([kind])=>kind!=="estorno").map(([key,label])=>
              <option key={key} value={key}>{label}</option>)}
          </select></label>
        <label className="bh-field"><span>Data da competência</span>
          <input aria-label="Data do lançamento" type="date" value={draft.date}
            onChange={e=>updateDraft("date",e.target.value)}/></label>
        <label className="bh-field"><span>Responsável pelo registro</span>
          <input aria-label="Responsável pelo registro" value={draft.responsible} maxLength={100}
            onChange={e=>updateDraft("responsible",e.target.value)}
            placeholder="Nome do colaborador demonstrativo"/></label>
        <div className="bh-duration-editor"><span>Duração exata</span><div className="bh-time-fields">
          <label className="bh-field"><span>Horas</span><input aria-label="Horas" type="number" min={0} max={999}
            step={1} value={draft.hours} onChange={e=>updateDraft("hours",e.target.value)}/></label>
          <b>:</b>
          <label className="bh-field"><span>Minutos (0 a 59)</span><input aria-label="Minutos" type="number" min={0} max={59}
            step={1} value={draft.minutes} onChange={e=>updateDraft("minutes",e.target.value)}/></label>
        </div></div>
        <div className="bh-form-preview"><span>Prévia da movimentação</span>
          <strong><HourAmount value={parseMinutes(draft.hours,draft.minutes)!==null?
            (["compensacao","debito_ausencia","debito_ajuste","baixa_informada"].includes(draft.kind)
              ?-parseMinutes(draft.hours,draft.minutes)!:parseMinutes(draft.hours,draft.minutes)!):0}/></strong>
          <small>Será incluída no saldo somente após aprovação.</small></div>
        <label className="bh-field bh-wide"><span>Motivo / evidência administrativa (obrigatório)</span>
          <textarea aria-label="Justificativa" rows={3} value={draft.description} maxLength={240}
            onChange={e=>updateDraft("description",e.target.value)}
            placeholder="Descreva a origem da hora e a autorização. Não insira dados médicos ou documentos sigilosos."/></label>
      </div>
      {errors.length>0&&<div className="bh-warnings" role="alert">{errors.map((e,i)=><p key={i}>{e}</p>)}</div>}
      <div className="bh-policy"><ShieldCheck size={17}/>
        Registros de ponto, atrasos, horas extras, férias, feriados e saídas antecipadas não entram automaticamente no banco.
        A definição da natureza e do tratamento depende de regras e acordo de compensação aprovados pelo RH.</div>
      <div className="bh-form-actions"><button type="button" className="bh-outline" onClick={()=>setTab("overview")}>Cancelar</button>
        <button type="button" className="bh-primary" onClick={submit} disabled={!ready||errors.length>0}>
          <Plus size={16}/> Enviar para aprovação</button></div>
    </section>}
    {tab==="approval"&&<section className="bh-panel">
      <div className="bh-panel-head"><div><p className="op-eyebrow">FLUXO DE CONFERÊNCIA</p><h2>Lançamentos aguardando autorização</h2>
        <p>Somente o aprovado muda o saldo. Recusados permanecem no histórico.</p></div>
        <span className="bh-count">{pending.length} pendente(s)</span></div>
      <div className="bh-reviewer"><label className="bh-field"><span>Responsável pela decisão (fictício)</span>
        <input aria-label="Responsável pela aprovação" value={reviewer} maxLength={100}
          onChange={e=>setReviewer(e.target.value)} /></label></div>
      <div className="bh-queue">
        {!pending.length&&<p className="bh-empty">Nenhum lançamento aguardando análise.</p>}
        {pending.map(e=><article className="bh-request" key={e.id}>
          <div className="bh-request-head"><div><b>{employeeOf(e.employeeId)?.name}</b>
            <small>{e.employeeId} · {asDate(e.date)} · {KINDS[e.kind]}</small></div>
            <HourAmount value={e.minutes}/></div>
          <p>{e.description}</p><small>Registrado por {e.responsible}. ID: {e.id}</small>
          <label className="bh-field"><span>Parecer (obrigatório para recusa)</span>
            <input aria-label={"Parecer de "+e.id} value={reasonById[e.id]??""} maxLength={240}
              onChange={event=>setReasonById(prev=>({...prev,[e.id]:event.target.value}))}
              placeholder="Justificativa da decisão demonstrativa"/></label>
          <div className="bh-request-actions"><button type="button" className="bh-primary"
            onClick={()=>decide(e.id,"aprovar")} disabled={!ready||reviewer.trim().length<2}>
              <Check size={16}/> Aprovar e contabilizar</button>
            <button type="button" className="bh-outline" onClick={()=>decide(e.id,"recusar")}>
              <X size={16}/> Recusar</button></div>
        </article>)}
      </div>
      <div className="bh-note"><AlertTriangle size={15}/> Esta decisão apenas simula uma autorização:
        não existe autenticação do gestor, instrumento coletivo ou aprovação jurídica neste protótipo.</div>
    </section>}
    {tab==="statement"&&<section className="bh-panel">
      <div className="bh-panel-head"><div><p className="op-eyebrow">EXTRATO INDIVIDUAL</p>
        <h2>Saldo detalhado por colaborador</h2>
        <p>Todos os registros até a data selecionada, inclusive pendências, recusas e estornos.</p></div>
        <button type="button" className="bh-outline" onClick={download}><Download size={15}/> CSV completo</button></div>
      <div className="bh-statement-filters"><label className="bh-field"><span>Colaborador</span>
        <select value={employeeId} aria-label="Selecionar extrato do colaborador"
          onChange={e=>{setEmployeeId(e.target.value);setReverseTarget(null);}}>
          {DEMO_EMPLOYEES.map(e=><option key={e.id} value={e.id}>{e.name} · {e.id} · {GROUPS[e.group].name}</option>)}
        </select></label>
        <div className="bh-person"><b>{current.name}</b><small>{current.id} · {GROUPS[current.group].name} · {UNIT.unit}</small></div></div>
      <div className="bh-mini-balances">
        <div><span>Saldo anterior</span><strong>{duration(currentSnap.opening)}</strong></div>
        <div><span>Créditos do mês</span><strong className="bh-positive">{duration(currentSnap.credits)}</strong></div>
        <div><span>Débitos do mês</span><strong className="bh-negative">{duration(-currentSnap.debits)}</strong></div>
        <div><span>Saldo acumulado</span><strong><HourAmount value={currentSnap.closing}/></strong></div></div>
      <LedgerTable entries={personal} onPerson={openPerson} onReverse={id=>{
        const target=store.entries.find(e=>e.id===id)??null;setReverseTarget(target);setReverseReason("");
      }} reverseAvailable={canReverse}/>
      {reverseTarget&&<div className="bh-reverse"><div className="bh-reverse-head"><b>Estornar {reverseTarget.id}</b>
        <button type="button" aria-label="Fechar estorno" onClick={()=>setReverseTarget(null)}><X size={16}/></button></div>
        <p>O original permanece no extrato. Um lançamento de sinal oposto anulará exatamente {duration(reverseTarget.minutes)},
          na mesma data de competência do lançamento original, sem excluir o histórico.</p>
        <label className="bh-field"><span>Justificativa do estorno</span><input
          aria-label="Motivo do estorno" value={reverseReason} maxLength={240}
          onChange={e=>setReverseReason(e.target.value)}
          placeholder="Explique o motivo da correção"/></label>
        <div className="bh-request-actions"><button type="button" className="bh-primary"
          disabled={reverseReason.trim().length<8||reviewer.trim().length<2} onClick={reverse}>
          <RotateCcw size={16}/> Aplicar estorno demonstrativo</button>
          <button type="button" className="bh-outline" onClick={()=>setReverseTarget(null)}>Cancelar</button></div>
      </div>}
      <div className="bh-note"><Info size={15}/> Estornos preservam o documento original na trilha. Não representam cancelamento real de pagamento ou folha.</div>
    </section>}
    {tab==="history"&&<section className="bh-panel">
      <div className="bh-panel-head"><div><p className="op-eyebrow">LIVRO DE MOVIMENTAÇÕES</p>
        <h2>Histórico e conferência</h2><p>Extrato até {asDate(date)}, inclusive recusados e pendentes. Exportação inclui todas as datas.</p></div>
        <button type="button" className="bh-outline" onClick={download}><Download size={15}/> Exportar CSV integral</button></div>
      <div className="bh-filters"><label className="bh-search"><Search size={16}/>
        <input aria-label="Pesquisar movimentações" placeholder="Pesquisar funcionário, código ou motivo"
          value={ledgerQuery} onChange={e=>setLedgerQuery(e.target.value)}/></label>
        <select aria-label="Filtrar status das movimentações" value={ledgerStatus}
          onChange={e=>setLedgerStatus(e.target.value as typeof ledgerStatus)}>
          <option value="all">Todas as situações</option>
          <option value="aprovado">Aprovadas</option><option value="pendente">Pendentes</option>
          <option value="recusado">Recusadas</option>
        </select></div>
      <LedgerTable entries={ledger} onPerson={openPerson}/>
      <div className="bh-history-log"><h3><History size={16}/> Registro de decisões</h3>
        {!store.history.length&&<p className="bh-empty">Os registros demonstrativos iniciais não têm eventos históricos de decisão.</p>}
        {[...store.history].reverse().slice(0,120).map(event=><div key={event.id}>
          <span>{event.at?new Date(event.at).toLocaleString("pt-BR"):"—"} · {event.entryId}</span>
          <b>{event.detail}</b><small>{event.actor} · demonstração</small></div>)}
      </div>
      <div className="bh-reset"><label><input type="checkbox" checked={resetCheck} onChange={e=>setResetCheck(e.target.checked)}/>
        Concordo em restaurar os lançamentos fictícios deste navegador</label>
        <button type="button" className="bh-outline bh-outline-danger" onClick={reset}>Restaurar demonstração</button></div>
      <div className="bh-note"><BookOpen size={15}/> Extrato local ilustrativo, não auditável por múltiplos usuários.
        Nunca importar atestados, folhas reais nem documentos confidenciais nesta tela.</div>
    </section>}
  </div>;
}
