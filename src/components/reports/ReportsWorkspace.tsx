import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, CalendarDays, ClipboardList, Clock3, Download, FileText,
  Fingerprint, Info, LayoutDashboard, Printer, ShieldCheck, Users,
} from "lucide-react";
import { GROUP_IDS, GROUPS, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { ABSENCE_STORAGE_KEY, demoAbsences, restoreAbsences } from "@/domain/absences";
import { HOUR_KEY, demoHourStore, duration, restoreHours } from "@/domain/hour-bank";
import { EMPTY_POINT_STORE, readPointStore } from "@/domain/point-simulator";
import { DEFAULT_SCHEDULE, dateOffset, dayOfWeek, reviseStore, startOfWeek } from "@/domain/schedule";
import {
  buildReport, reportFilterErrors, type ReportFilters, type ReportModel,
  type ReportSources,
} from "@/domain/management-reports";
import type { GroupId } from "@/domain/types";
import { ReadyReports } from "./ReadyReports";
import "./ReportsWorkspace.css";

type ReportId="executivo"|"cobertura"|"ponto"|"ausencias"|"horas"|"escalas"|"comparativo";
type Period="semana"|"mes"|"personalizado";
type DisplaySheet={title:string;headers:string[];rows:string[][];note:string};
const POINT_KEY="formosa:augusto-montenegro:ponto-demo:v1";
const SCHEDULE_KEY="formosa:augusto-montenegro:escala-demo:v1";
const DATE="2026-10-20";
const REPORTS:{id:ReportId;title:string;subtitle:string;icon:typeof LayoutDashboard}[]=[
  {id:"executivo",title:"Resumo executivo",subtitle:"Decisões e indicadores",icon:LayoutDashboard},
  {id:"cobertura",title:"Cobertura operacional",subtitle:"Necessidade × disponíveis",icon:Users},
  {id:"ponto",title:"Ponto e pontualidade",subtitle:"Atrasos e inconsistências",icon:Fingerprint},
  {id:"ausencias",title:"Férias e afastamentos",subtitle:"Períodos e retornos",icon:CalendarDays},
  {id:"horas",title:"Banco de horas",subtitle:"Saldo e movimentações",icon:Clock3},
  {id:"escalas",title:"Escalas e trocas",subtitle:"Domingos e feriados",icon:ClipboardList},
  {id:"comparativo",title:"Comparativo 6×1 / 5×2",subtitle:"Capacidade hipotética",icon:BarChart3},
];
const dateBR=(date:string)=>date?date.split("-").reverse().join("/"):"—";
const pct=(n:number|null)=>n===null?"Sem base":n.toLocaleString("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1})+"%";
const num=(n:number)=>n.toLocaleString("pt-BR");
function getDefaultSources():ReportSources { return {
  schedule:DEFAULT_SCHEDULE,point:EMPTY_POINT_STORE,
  absences:demoAbsences(),hours:demoHourStore(),
};}
function readLocalSources():ReportSources {
  const sources=getDefaultSources();
  try{const raw=window.localStorage.getItem(SCHEDULE_KEY);if(raw)sources.schedule=reviseStore(JSON.parse(raw));}catch{/* fonte demonstrativa indisponível */}
  try{const raw=window.localStorage.getItem(POINT_KEY);if(raw)sources.point=readPointStore(JSON.parse(raw));}catch{/* sem registros demonstrativos */}
  try{const raw=window.localStorage.getItem(ABSENCE_STORAGE_KEY);if(raw)sources.absences=restoreAbsences(JSON.parse(raw));}catch{/* usar amostra inicial */}
  try{const raw=window.localStorage.getItem(HOUR_KEY);if(raw)sources.hours=restoreHours(JSON.parse(raw));}catch{/* usar amostra inicial */}
  return sources;
}
function buildPeriod(date:string,kind:Period){
  if(kind==="semana")return {start:startOfWeek(date),end:date};
  if(kind==="mes")return {start:date.slice(0,7)+"-01",end:date};
  return {start:date,end:date};
}
function safeCsv(s:string){
  // Protect against formula injection in Excel / Google Sheets.
  return '"'+(/^[\s]*[=+\-@\t\r]/.test(s)?"'":"")+s.replace(/"/g,'""')+'"';
}
function sheetFor(model:ReportModel,type:ReportId):DisplaySheet{
  const {summary:s}=model;
  if(type==="executivo")return {title:"Indicadores de gestão · resumo executivo",
    headers:["Indicador","Valor","Critério"],
    rows:[
      ["Colaboradores selecionados",num(model.persons),"Pessoas fictícias na consulta"],
      ["Jornadas previstas",num(s.plannedShifts),"Escala armazenada / período"],
      ["Dias de ausência aprovada",num(s.absenceDays),"Por colaborador e dia, inclusive folga se houver"],
      ["Entradas registradas",num(s.recordedEntries),"Somente registros presentes no Ponto simulado"],
      ["Sem entrada demonstrativa",num(s.missingEntries),"Não significa falta confirmada"],
      ["Entradas acima do alerta",num(s.lateCount),"Limite configurado no Ponto simulado"],
      ["Pontualidade das entradas",pct(s.punctuality),"Denominador: apenas entradas registradas"],
      ["Jornadas com marcação incompleta",num(s.incompletePunches),"Existe marcação mas não ciclo completo"],
      ["Déficit em postos-dia",num(s.totalDeficit),"Cobertura operacional, sem interpretação de horas"],
      ["Saldo líquido de horas",duration(s.netBalance),"Apenas lançamentos aprovados até o fim do período"],
      ["Trocas aprovadas",num(s.approvedSwaps),"Solicitações com data de escala no período"],
    ],note:"Resumo de gestão ilustrativo; valores não substituem documentação legal ou registros oficiais."};
  if(type==="cobertura")return {title:"Cobertura por grupo e data",
    headers:["Data","Grupo","Necessário","Escalado","Ausências aprovadas","Disponível","Déficit"],
    rows:model.coverage.map(r=>[dateBR(r.date),"Grupo "+r.group,String(r.required),String(r.scheduled),
      String(r.absent),String(r.available),String(r.deficit)]),
    note:"Déficit medido em postos-dia. Não multiplica automaticamente por horas ou salários. Filtro individual não se aplica a metas de grupo."};
  if(type==="ponto")return {title:"Marcações e pontualidade por colaborador e data",
    headers:["Data","Colaborador","Grupo","Previsto","Entrada","Saída intervalo","Retorno","Saída final","Atraso (min)","Situação"],
    rows:model.dailyPoint.map(r=>[dateBR(r.date),r.name+" · "+r.employeeId,r.group,r.planned,r.entry??"—",
      r.breakOut??"—",r.breakIn??"—",r.exit??"—",r.lateness===null?"—":String(r.lateness),r.status]),
    note:"A tabela lista também jornadas previstas sem entrada simulada, priorizando exceções. Sem registro não constitui falta comprovada."};
  if(type==="ausencias")return {title:"Controle de férias e afastamentos",
    headers:["Colaborador","Grupo","Tipo","Início","Fim (inclusive)","Situação","Retorno previsto"],
    rows:model.absenceRows.map(r=>[r.name+" · "+r.employeeId,r.group,r.kind,dateBR(r.start),dateBR(r.end),
      r.status,r.returnDate?dateBR(r.returnDate):"—"]),
    note:"Retorno indica primeiro turno previsto após o fim do período. Não é alta clínica nem confirmação de presença."};
  if(type==="horas")return {title:"Livro de movimentações do banco de horas",
    headers:["Data","Colaborador","Grupo","Movimento","Minutos","Duração","Situação","Responsável","ID"],
    rows:model.hourMovements.map(r=>[dateBR(r.date),r.name+" · "+r.employeeId,r.group,r.kind,
      String(r.minutes),duration(r.minutes),r.status,r.responsible,r.id]),
    note:"Somente movimentos aprovados entram nos saldos. A exportação inclui pendentes/recusados do intervalo, sem recalcular folha."};
  if(type==="escalas")return {title:"Escalas, folgas, domingos, feriados e trocas",
    headers:["Data","Grupo","Escalados","Folgas no grupo","Meta","Domingo","Feriado"],
    rows:model.shifts.map(r=>[dateBR(r.date),r.group,String(r.scheduled),String(r.restDays),
      String(r.required),r.sunday?"Sim":"Não",r.holiday?"Sim":"Não"]),
    note:"Trocas aprovadas, recusadas e pendentes são mostradas em quadro próprio. Folga planejada não é falta."};
  return {title:"Estudo teórico de capacidade semanal · 6×1 versus 5×2",
    headers:["Hipótese","Colaboradores","Dias/semana por pessoa","Jornadas-pessoa por semana","Diferença contra 6×1"],
    rows:model.capacity.map(r=>[r.scenario,String(r.people),String(r.daysPerWeek),
      num(r.theoreticalShifts),(r.delta>0?"+":"")+num(r.delta)]),
    note:"Exercício aritmético de capacidade, NÃO escala pronta, viabilidade econômica, previsão de quadro ou regime aprovado. Não testa descanso, domingos, turnos, salários ou acordo coletivo."};
}
function exportCsv(report:DisplaySheet,file:string){
  const body="\uFEFF"+[report.headers,...report.rows].map(row=>row.map(safeCsv).join(";")).join("\r\n");
  const fileData=new Blob([body],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(fileData);
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=file;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Metric({label,value,sub,tone="wine"}:{label:string;value:string;sub:string;tone?:"wine"|"green"|"amber"|"blue"}){
  return <div className={"rm-metric rm-metric-"+tone}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
export function ReportsWorkspace(){
  const [sources,setSources]=useState<ReportSources>(getDefaultSources);
  const [ready,setReady]=useState(false);
  const [refDate,setRefDate]=useState(DATE);
  const [period,setPeriod]=useState<Period>("mes");
  const [filters,setFilters]=useState<ReportFilters>(()=>({...buildPeriod(DATE,"mes"),group:"all",employeeId:"all"}));
  const [selected,setSelected]=useState<ReportId>("executivo");
  const [msg,setMsg]=useState("");
  const [showAll,setShowAll]=useState(false);
  const [mode,setMode]=useState<"prontos"|"detalhados">("prontos");
  useEffect(()=>{
    const refresh=()=>setSources(readLocalSources());
    refresh();setReady(true);
    const onVisibility=()=>{if(document.visibilityState==="visible")refresh();};
    window.addEventListener("focus",refresh);
    window.addEventListener("storage",refresh);
    document.addEventListener("visibilitychange",onVisibility);
    return ()=>{window.removeEventListener("focus",refresh);window.removeEventListener("storage",refresh);
      document.removeEventListener("visibilitychange",onVisibility);};
  },[]);
  const errors=reportFilterErrors(filters);
  const isValidRange=errors.length===0;
  const model=useMemo(()=>{
    if(!isValidRange)return null;
    try{return buildReport(sources,filters);}catch{return null;}
  },[sources,filters,isValidRange]);
  const sheet=useMemo(()=>model?sheetFor(model,selected):null,[model,selected]);
  const displayed=sheet?(showAll?sheet.rows:sheet.rows.slice(0,120)):[];
  const printRemainder=sheet&&!showAll?sheet.rows.slice(120):[];
  const caption=REPORTS.find(x=>x.id===selected)!;
  function choosePeriod(next:Period){
    setPeriod(next);setShowAll(false);
    if(next!=="personalizado")setFilters(p=>({...p,...buildPeriod(refDate,next)}));
  }
  function chooseReference(next:string){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(next))return;
    setRefDate(next);
    if(period!=="personalizado")setFilters(p=>({...p,...buildPeriod(next,period)}));
    setShowAll(false);
  }
  function download(){
    if(!sheet){setMsg("Corrija as datas para emitir o relatório.");return;}
    try{exportCsv(sheet,"formosa-"+selected+"-"+filters.start+"-a-"+filters.end+".csv");
      setMsg("CSV gerado a partir do detalhamento integral do relatório selecionado.");}
    catch{setMsg("Falha ao gerar CSV neste navegador.");}
  }
  function print(){
    if(!model)return;
    window.print();
  }
  function selectReport(id:ReportId){setSelected(id);setShowAll(false);setMsg("");}
  const groupData=model?.coverage.filter(r=>r.date===filters.end)??[];
  const ranking=model?.personnel.filter(r=>r.overAlert>0).slice(0,5)??[];
  return <div className="rm-app formosa-operation">
    <header className="rm-top no-print"><div>
      <p className="op-eyebrow">FORMOSA · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
      <h1>Central de <span>relatórios</span></h1>
      <p>Relatórios prontos para o gerente e o RH: riscos de multa, banco de horas, escala de domingo e folgas da semana.</p>
    </div><div className="rm-top-actions">
      {mode==="detalhados"&&<>
      <button type="button" className="rm-secondary" disabled={!model} onClick={download}><Download size={16}/> Exportar CSV</button>
      <button type="button" className="rm-primary" disabled={!model} onClick={print}><Printer size={16}/> Imprimir / PDF</button>
      </>}
    </div></header>
    <div className="rm-provenance no-print"><ShieldCheck size={17}/><span><b>DEMONSTRAÇÃO · {UNIT.unit}.</b>
      Relatórios produzidos com dados fictícios e armazenamento local deste navegador. Não são espelho oficial de ponto,
      AEJ, AFD, folha, prova de ausência ou relatório trabalhista certificado. Os módulos anteriores não são modificados.</span></div>
    {msg&&<div className="rm-message no-print" role="status"><Info size={15}/><span>{msg}</span>
      <button type="button" aria-label="Fechar aviso" onClick={()=>setMsg("")}>×</button></div>}
    <div className="rm-mode no-print" role="tablist" aria-label="Tipo de relatório">
      <button type="button" role="tab" aria-selected={mode==="prontos"} className={mode==="prontos"?"rm-mode-on":""}
        onClick={()=>setMode("prontos")}>📋 Relatórios prontos <small>gerente e RH</small></button>
      <button type="button" role="tab" aria-selected={mode==="detalhados"} className={mode==="detalhados"?"rm-mode-on":""}
        onClick={()=>setMode("detalhados")}>📊 Relatórios detalhados <small>por período</small></button>
    </div>
    {mode==="prontos"&&<ReadyReports schedule={sources.schedule} absences={sources.absences} hours={sources.hours} date={refDate}/>}
    <div hidden={mode!=="detalhados"}>
    <section className="rm-panel rm-filters no-print">
      <div className="rm-panel-heading"><div><p className="op-eyebrow">PARÂMETROS DO RELATÓRIO</p><h2>Escolha o período e o recorte</h2></div>
        <span className="rm-pill">Até 93 dias por consulta</span></div>
      <div className="rm-filter-grid">
        <label className="rm-field"><span>Período</span>
          <select aria-label="Tipo de período" value={period} onChange={e=>choosePeriod(e.target.value as Period)}>
            <option value="semana">Semanal (segunda até a referência)</option>
            <option value="mes">Mensal (dia 1 até a referência)</option>
            <option value="personalizado">Personalizado</option>
          </select></label>
        <label className="rm-field"><span>Data de referência</span><input type="date" aria-label="Data de referência"
          value={refDate} onChange={e=>chooseReference(e.target.value)}/></label>
        <label className="rm-field"><span>Início</span><input type="date" aria-label="Início do relatório"
          value={filters.start} onChange={e=>{setPeriod("personalizado");
            setFilters(p=>({...p,start:e.target.value}));setShowAll(false);}}/></label>
        <label className="rm-field"><span>Fim</span><input type="date" aria-label="Fim do relatório"
          value={filters.end} onChange={e=>{setPeriod("personalizado");
            setFilters(p=>({...p,end:e.target.value}));setShowAll(false);}}/></label>
        <label className="rm-field"><span>Grupo</span>
          <select aria-label="Grupo do relatório" value={filters.group}
            onChange={e=>setFilters(p=>({...p,group:e.target.value as "all"|GroupId,employeeId:"all"}))}>
            <option value="all">Todos os grupos</option>
            {GROUP_IDS.map(g=><option key={g} value={g}>Grupo {g} · {GROUPS[g].name}</option>)}
          </select></label>
        <label className="rm-field"><span>Colaborador</span>
          <select aria-label="Colaborador do relatório" value={filters.employeeId}
            onChange={e=>setFilters(p=>({...p,employeeId:e.target.value}))}>
            <option value="all">Todos os colaboradores</option>
            {DEMO_EMPLOYEES.filter(e=>filters.group==="all"||e.group===filters.group)
              .map(e=><option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}
          </select></label>
      </div>
      {errors.length>0&&<div className="rm-warning" role="alert"><AlertTriangle size={16}/>{errors.join(" ")}</div>}
    </section>
    <div className="rm-layout">
      <nav className="rm-nav no-print" aria-label="Tipos de relatório">
        {REPORTS.map(report=>{
          const Icon=report.icon;
          return <button key={report.id} type="button"
            className={selected===report.id?"rm-nav-selected":""}
            onClick={()=>selectReport(report.id)} aria-current={selected===report.id?"page":undefined}>
            <Icon size={17}/><span><b>{report.title}</b><small>{report.subtitle}</small></span>
          </button>;
        })}
      </nav>
      <div className="rm-main">
        {!model||!sheet?<section className="rm-panel rm-empty"><AlertTriangle size={20}/>
          <h2>Selecione datas válidas para gerar o relatório</h2><p>O intervalo deve ter até 93 dias consecutivos.</p>
          </section>:<>
          <section className="rm-paper rm-panel">
            <div className="rm-paper-head">
              <img src="/formosa-logo.svg" alt="Marca Formosa" className="rm-logo"/>
              <div><p>FORMOSA · GESTÃO DE PESSOAS</p><h2>{caption.title}</h2>
                <span>Unidade {UNIT.unit} · {UNIT.city}</span></div>
              <div className="rm-report-label"><b>DEMONSTRAÇÃO</b><span>Relatório gerencial</span></div>
            </div>
            <div className="rm-meta">
              <span><CalendarDays size={13}/> {dateBR(filters.start)} a {dateBR(filters.end)} · {model.days} dia(s)</span>
              <span><Users size={13}/> {model.persons} colaborador(es) · {filters.group==="all"?"Todos os grupos":"Grupo "+filters.group}</span>
              <span><FileText size={13}/> {sheet.rows.length} registro(s) no detalhamento</span>
            </div>
            <div className="rm-section-head"><p className="op-eyebrow">VISÃO GERENCIAL</p>
              <h3>{sheet.title}</h3><p>{caption.subtitle} · valores extraídos das bases demonstrativas disponíveis.</p></div>
            {(selected==="executivo"||selected==="ponto")&&<div className="rm-metrics">
              <Metric label="Jornadas previstas" value={num(model.summary.plannedShifts)} sub="Escalas do período"/>
              <Metric label="Entradas registradas" value={num(model.summary.recordedEntries)} sub="Somente ponto demonstrativo" tone="blue"/>
              <Metric label="Pontualidade observada" value={pct(model.summary.punctuality)} sub="Apenas entradas lançadas" tone="green"/>
              <Metric label="Marcações não encontradas" value={num(model.summary.missingEntries)} sub="Não indica falta confirmada" tone="amber"/>
            </div>}
            {selected==="cobertura"&&<div className="rm-metrics">
              <Metric label="Postos-dia necessários" value={num(model.summary.totalRequired)} sub="Metas por dia e grupo"/>
              <Metric label="Postos-dia disponíveis" value={num(model.summary.totalAvailable)} sub="Desconta ausências aprovadas" tone="green"/>
              <Metric label="Déficit somado" value={num(model.summary.totalDeficit)} sub="Unidade: postos-dia" tone="amber"/>
              <Metric label="Cobertura observada" value={pct(model.summary.groupCoverageRate)} sub="Indicador de planejamento" tone="blue"/>
            </div>}
            {selected==="ausencias"&&<div className="rm-metrics">
              <Metric label="Casos aprovados" value={num(model.summary.approvedAbsenceCases)} sub="Períodos que cruzam a consulta"/>
              <Metric label="Dias-pessoa de ausência" value={num(model.summary.absenceDays)} sub="Inclui dias de folga no período" tone="amber"/>
              <Metric label="Solicitações pendentes" value={num(model.summary.pendingAbsenceCases)} sub="Sem reduzir disponibilidade" tone="blue"/>
              <Metric label="Registros no período" value={num(model.absenceRows.length)} sub="Todos os estados"/>
            </div>}
            {selected==="horas"&&<div className="rm-metrics">
              <Metric label="Créditos aprovados" value={duration(model.summary.credited)} sub="Movimentações do intervalo" tone="green"/>
              <Metric label="Débitos aprovados" value={duration(-model.summary.debited)} sub="Movimentações do intervalo" tone="amber"/>
              <Metric label="Saldo acumulado líquido" value={duration(model.summary.netBalance)} sub="Até o fim selecionado"/>
              <Metric label="Pendentes no período" value={num(model.summary.pendingHours)} sub="Não entram no saldo" tone="blue"/>
            </div>}
            {selected==="horas"&&<div className="rm-focus-grid">
              <div><b>Reconciliação do saldo acumulado</b>
                <p>{duration(model.summary.openingBalance)} (anterior ao intervalo) +
                  {" "+duration(model.summary.credited)} (créditos) −
                  {" "+duration(model.summary.debited)} (débitos) =
                  {" "+duration(model.summary.netBalance)} (saldo até {dateBR(filters.end)}).</p></div>
              <div><b>Separação por pessoa</b>
                <p>Créditos líquidos individuais: {duration(model.summary.positiveBalances)}.
                  Débitos líquidos individuais: {duration(-model.summary.negativeBalances)}.
                  Um saldo não apaga o outro na análise.</p></div>
            </div>}
            {selected==="escalas"&&<div className="rm-metrics">
              <Metric label="Jornadas previstas" value={num(model.summary.plannedShifts)} sub="Somatório de escalados"/>
              <Metric label="Folgas previstas" value={num(model.summary.restDays)} sub="Colaborador × data" tone="green"/>
              <Metric label="Domingos no intervalo" value={num(model.summary.sundays)} sub="Datas, não pessoas" tone="blue"/>
              <Metric label="Trocas aprovadas" value={num(model.summary.approvedSwaps)} sub="Solicitações por data" tone="amber"/>
            </div>}
            {selected==="comparativo"&&<div className="rm-statement">
              <AlertTriangle size={17}/><p><b>Estudo hipotético, não escala aprovada.</b> A capacidade de jornadas-pessoa
                considera somente dias semanais × número de colaboradores. Não avalia a distribuição dos turnos,
                repousos, folgas compensatórias, feriados ou necessidade por horário.</p>
            </div>}
            {model.sources.hasPoint===false&&(selected==="ponto"||selected==="executivo")&&
              <div className="rm-statement"><Info size={17}/>
                <p><b>Sem registros do Ponto simulado neste intervalo.</b> Isso não equivale a ausência ou falta.
                  Faça marcações de demonstração na aba Ponto para gerar indicadores de pontualidade.</p></div>}
            {filters.employeeId!=="all"&&selected==="cobertura"&&<div className="rm-statement">
              <Info size={16}/><p>Filtro individual: metas e déficits por grupo não são comparáveis a uma única pessoa.
                Remova o filtro de colaborador para consultar a cobertura da equipe.</p></div>}
            {selected==="executivo"&&<div className="rm-focus-grid">
              <div><b>Riscos da operação</b><p>{num(model.summary.totalDeficit)} posto(s)-dia deficitários e
                {" "+num(model.summary.incompletePunches)} jornada(s) com marcações incompletas.</p></div>
              <div><b>Qualidade dos registros</b><p>{num(model.summary.daysWithPoint)} dia(s) com entradas demonstrativas;
                {" "+num(model.summary.conflictingPointOnAbsence)} divergência(s) entre marcação e ausência aprovada.</p></div>
            </div>}
            {selected==="ponto"&&<div className="rm-focus-grid">
              <div><b>Ocorrências acima do alerta</b><p>{num(model.summary.lateCount)} entrada(s) acima do limite interno.
                {" "+num(model.summary.earlyExits)} saída(s) antecipada(s) observadas.</p></div>
              <div><b>Ranking de atrasos</b>
                {ranking.length?ranking.map((x,i)=><p key={x.id}>{i+1}º {x.name} · {x.overAlert} ocorrência(s)</p>):
                  <p>Sem entradas acima do alerta no recorte.</p>}</div>
            </div>}
            {selected==="cobertura"&&<div className="rm-group-snapshot">
              {groupData.map(r=><div key={r.group}>
                <span>Grupo {r.group} · {GROUPS[r.group].name}</span>
                <strong>{r.available}/{r.required}</strong>
                <div className="rm-meter"><i style={{width:r.required?Math.min(100,100*r.available/r.required)+"%":"100%"}}/></div>
                <small>{r.absent} ausência(s) · {r.deficit} déficit(s)</small>
              </div>)}
            </div>}
            <div className="rm-detail-heading"><h4>Demonstrativo detalhado</h4><span>{sheet.rows.length} linhas</span></div>
            <div className="rm-table-container">
              <table className="rm-table"><thead><tr>{sheet.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>{displayed.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody>
              </table>
              {!sheet.rows.length&&<div className="rm-no-rows">Nenhum registro disponível para este recorte. A ausência de registro não deve ser interpretada como zero operacional confirmado.</div>}
            </div>
            {printRemainder.length>0&&<div className="rm-extra-print" aria-hidden="true">
              <table className="rm-table"><thead><tr>{sheet.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>{printRemainder.map((row,i)=><tr key={i+120}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>}
            {sheet.rows.length>120&&<div className="rm-overflow no-print">
              <span>{showAll?"Exibindo todas as "+sheet.rows.length+" linhas":"Exibindo as primeiras 120 de "+sheet.rows.length+" linhas."}</span>
              <button type="button" onClick={()=>setShowAll(v=>!v)}>
                {showAll?"Recolher tabela":"Exibir todas as linhas"}</button>
              <small>O CSV exporta todas as linhas, mesmo sem expandir.</small>
            </div>}
            {selected==="escalas"&&<div className="rm-secondary-table">
              <h4>Solicitações de troca no período ({model.swapRows.length})</h4>
              <table className="rm-table"><thead><tr><th>Data</th><th>Origem</th><th>Destino</th><th>Situação</th><th>Motivo</th></tr></thead>
                <tbody>{model.swapRows.map(r=><tr key={r.id}><td>{dateBR(r.date)}</td><td>{r.from}</td>
                  <td>{r.to}</td><td>{r.status}</td><td>{r.reason}</td></tr>)}</tbody></table>
              {!model.swapRows.length&&<p>Nenhuma solicitação de troca registrada neste período.</p>}
            </div>}
            <div className="rm-method"><Info size={15}/><p><b>Critério e ressalva:</b> {sheet.note}</p></div>
            <div className="rm-paper-footer">
              <span>FORMOSA · {UNIT.unit} · {UNIT.city}</span>
              <span>Arquivo demonstrativo — dados fictícios · não oficial</span>
              <span className="rm-page-number">Página </span>
            </div>
          </section>
          <div className="rm-after no-print">
            <span><ShieldCheck size={15}/> Relatório gerado localmente com dados demonstrativos</span>
            <div><button type="button" className="rm-secondary" onClick={download}><Download size={15}/> Baixar CSV</button>
              <button type="button" className="rm-primary" onClick={print}><Printer size={15}/> Imprimir A4 / PDF</button></div>
          </div>
        </>}
      </div>
    </div>
  </div>
  </div>;
}
