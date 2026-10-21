import { useEffect,useMemo,useState } from "react";
import {
  AlertTriangle,ArrowRight,BookOpen,CalendarDays,ChevronDown,Clock3,
  Download,Info,RefreshCw,Search,ShieldCheck,Users,Workflow,
} from "lucide-react";
import { GROUPS,LABOR_LAW,SERVICE_SHIFTS,UNIT } from "@/domain/config";
import { ABSENCE_STORAGE_KEY,SCHEDULE_STORAGE_KEY,demoAbsences,restoreAbsences,type AbsenceStore } from "@/domain/absences";
import { DEFAULT_SCHEDULE,dateOffset,reviseStore,startOfWeek,type ScheduleStore } from "@/domain/schedule";
import {
  BASE_PEOPLE,DAYS,FUTURE_START,LEGAL_SOURCES,MAX_PEOPLE,defaultParameters,proposedShift,simulate5x2,theoreticalMinimum,
  type ScenarioResult,type SimulatorParameters,
} from "@/domain/five-two-simulator";
import { realWeeklyShifts } from "@/domain/management-reports";
import { HelpBubble, ScenarioExplanation } from "./ScenarioExplanation";
import "./FiveTwoWorkspace.css";

const dBR=(s:string)=>s?s.split("-").reverse().join("/"):"—";
const minutes=(n:number)=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const integer=(n:number)=>n.toLocaleString("pt-BR");
const percent=(n:number)=>n.toLocaleString("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1})+"%";
type Section="cenario"|"escala"|"orientacoes";
function csvCell(value:unknown){
  const s=String(value??"");
  return '"'+(/^\s*[=+\-@\t\r]/.test(s)?"'":"")+s.replace(/"/g,'""')+'"';
}
function exportCsv(result:ScenarioResult){
  const header=["Matrícula","Nome","Semana","Início","Fim","Seg","Ter","Qua","Qui","Sex","Sáb","Dom","Jornada prevista HH:MM","Reforço hipotético"];
  const data=result.byWeek.map(row=>{
    const days=Array.from({length:7},(_,i)=>dateOffset(result.settings.start,row.week*7+i));
    return [row.employee.id,row.employee.name,String(row.week+1),dBR(days[0]!),dBR(days[6]!),
      ...days.map(d=>row.workingDates.includes(d)?"TRABALHA":"FOLGA"),minutes(row.minutes),row.employee.hired?"SIM":"NÃO"];
  });
  const csv="﻿"+[header,...data].map(row=>row.map(csvCell).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="mn-servicos-gerais-5x2-"+result.settings.start+".csv";
  document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function storeSources(){
  let schedule:ScheduleStore=DEFAULT_SCHEDULE,absences:AbsenceStore=demoAbsences();
  try{const x=window.localStorage.getItem(SCHEDULE_STORAGE_KEY);if(x)schedule=reviseStore(JSON.parse(x));}catch{/* defaults */}
  try{const x=window.localStorage.getItem(ABSENCE_STORAGE_KEY);if(x)absences=restoreAbsences(JSON.parse(x));}catch{/* defaults */}
  return {schedule,absences};
}
const SOURCES=[
 {title:"Agência Brasil · emenda promulgada; 5×2 em até 60 dias",url:LEGAL_SOURCES.implementation,
  desc:"EC 141/2026 de 16/10/2026: 5×2 com 42h em até 60 dias e 40h doze meses depois."},
 {title:"Emenda Constitucional 141/2026",url:LEGAL_SOURCES.url,
  desc:"Texto promulgado: prazos, dois repousos semanais, 42h transitórias, 40h definitivas e exceções por acordo coletivo."},
 {title:"TV Senado · promulgação",url:LEGAL_SOURCES.senate,
  desc:"Jornada de 40 horas sem redução salarial."},
 {title:"CLT, art. 59-A · jornada 12×36",url:"https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm",
  desc:"12 horas seguidas por 36 de descanso, por acordo individual escrito ou convenção; DSR e feriados compensados."},
];
const STEPS=[
 {n:"01",name:"Levantar a necessidade de cada condomínio",desc:"Confirmar com o síndico se os serviços gerais precisam trabalhar no sábado e/ou domingo e em quais horários."},
 {n:"02",name:"Conferir a convenção coletiva",desc:"Validar com o sindicato da categoria (asseio e conservação / condomínios) jornada, folgas, domingos, feriados e a 12×36 da portaria."},
 {n:"03",name:"Simular o novo quadro",desc:"Usar este simulador para ver quantas pessoas cobrem a semana na 5×2 sem horas extras automáticas."},
 {n:"04",name:"Assinar aditivos de contrato",desc:"Formalizar a nova jornada (5×2, 42h) até "+dBR(LABOR_LAW.fiveTwoStart)+" e a mudança para 40h em "+dBR(LABOR_LAW.fortyHoursStart)+"."},
 {n:"05",name:"Ajustar o ponto eletrônico",desc:"Atualizar os horários no REP (Portaria MTP 671/2021) e o banco de horas para a nova jornada."},
 {n:"06",name:"Comunicar e acompanhar",desc:"Informar equipe e condomínios; acompanhar faltas, horas extras e reclamações nas primeiras semanas."},
];
const INSIGHTS:[string,string][]=[
 ["O que muda para os serviços gerais?","Hoje trabalham 6 dias (7h20) e descansam no domingo. Na 5×2 trabalham 5 dias (8h24 na fase de 42h; 8h na fase de 40h) e descansam 2 dias por semana."],
 ["E a portaria 12×36?","Continua. A emenda exige duas folgas por semana em média no mês; a 12×36 já dá 3,5 dias livres por semana e cerca de 38,5h líquidas, abaixo do teto. Mantenha o acordo escrito ou a convenção."],
 ["Posso continuar na 6×1?","Só se a convenção ou o acordo coletivo permitir, com a folga extra concedida no mesmo mês. Sem isso, a 5×2 é obrigatória a partir de "+dBR(LABOR_LAW.fiveTwoStart)+"."],
 ["Preciso contratar mais gente?","Depende do sábado. Se o condomínio não precisa de serviços gerais no sábado, o mesmo quadro cobre segunda a sexta. Se precisa, a cobertura exige mais pessoas ou um folguista."],
 ["Como ficam os feriados?","Na 12×36 o feriado já está compensado (art. 59-A). Nos serviços gerais, trabalho em feriado exige folga compensatória ou pagamento em dobro."],
];
function MiniMetric({name,value,detail,tone="wine",explanation}:{name:string;value:string;detail:string;tone?:"wine"|"green"|"amber"|"red"|"blue";explanation:string}){
  return <div className={"ft-metric ft-"+tone}><div className="ft-metric-label"><span>{name}</span>
    <HelpBubble label={name} description={explanation}/></div><strong>{value}</strong><small>{detail}</small></div>;
}
export function FiveTwoWorkspace(){
  const [sources,setSources]=useState<{schedule:ScheduleStore;absences:AbsenceStore}>(()=>({schedule:DEFAULT_SCHEDULE,absences:demoAbsences()}));
  const [parameters,setParameters]=useState<SimulatorParameters>(()=>defaultParameters());
  const [tab,setTab]=useState<Section>("cenario");
  const [week,setWeek]=useState(0);
  const [staffSearch,setStaffSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const [message,setMessage]=useState("");
  const [pilotChecks,setPilotChecks]=useState<string[]>([]);
  const [monthlyCost,setMonthlyCost]=useState("");
  useEffect(()=>{
    const refresh=()=>setSources(storeSources());
    const first=storeSources();setSources(first);setParameters(defaultParameters(first.schedule));setReady(true);
    window.addEventListener("focus",refresh);window.addEventListener("storage",refresh);
    return ()=>{window.removeEventListener("focus",refresh);window.removeEventListener("storage",refresh);};
  },[]);
  const dateIsMonday=Number.isFinite(Date.parse(parameters.start+"T12:00:00Z")) && startOfWeek(parameters.start)===parameters.start;
  const minimum=theoreticalMinimum(parameters);
  const result=useMemo(()=>{
    if(!dateIsMonday)return null;
    try{return simulate5x2(sources.schedule,sources.absences,parameters);}catch{return null;}
  },[sources,parameters,dateIsMonday]);
  const staff=result?.personSummary.filter(p=>(p.employee.name+" "+p.employee.id).toLocaleLowerCase("pt-BR")
    .includes(staffSearch.trim().toLocaleLowerCase("pt-BR")))??[];
  const safeStart=dateIsMonday?parameters.start:FUTURE_START;
  const daysWeek=Array.from({length:7},(_,i)=>dateOffset(safeStart,week*7+i));
  const legalFirst=parameters.start>=LEGAL_SOURCES.firstPhase;
  const legalForty=parameters.start>=LEGAL_SOURCES.finalPhase;
  function change<K extends keyof SimulatorParameters>(key:K,value:SimulatorParameters[K]){
    setParameters(p=>({...p,[key]:value}));setExpanded(null);
  }
  function setCount(key:"people"|"weekdayStaff"|"saturdayStaff"|"sundayStaff",value:number){
    const max=key==="people"?MAX_PEOPLE:parameters.people;
    const min=key==="people"?BASE_PEOPLE:0;
    const n=Math.max(min,Math.min(max,Math.trunc(Number.isFinite(value)?value:min)));
    setParameters(p=>{
      const next={...p,[key]:n};
      if(key==="people")for(const k of ["weekdayStaff","saturdayStaff","sundayStaff"] as const)next[k]=Math.min(next[k],n);
      return next;
    });
  }
  function csv(){if(result)try{exportCsv(result);setMessage("Escala hipotética das quatro semanas exportada para CSV. Não é autorização de trabalho.");}
    catch{setMessage("Não foi possível exportar neste navegador.");}}
  const summary=result?.metrics;
  const estimatedCost=Number(monthlyCost);
  const costValid=monthlyCost.trim()!=="" && Number.isFinite(estimatedCost) && estimatedCost>0;
  const realShifts=realWeeklyShifts(sources.schedule,"2026-10-19","S");
  const shift=proposedShift(parameters.weeklyLimit);
  return <div className="ft-app formosa-operation">
    <header className="ft-top no-print"><div>
      <p className="op-eyebrow">MN PATRIMÔNIOS · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
      <h1>Simulador <span>5×2</span></h1>
      <p>Transição dos serviços gerais de 6×1 para 5×2 ({LABOR_LAW.amendment}). A portaria segue na 12×36.</p></div>
      <div className="ft-top-actions">
        <button type="button" className="ft-secondary" onClick={()=>setSources(storeSources())}><RefreshCw size={15}/> Atualizar bases</button>
        <button type="button" className="ft-primary" disabled={!result} onClick={csv}><Download size={16}/> Exportar simulação</button>
      </div></header>
    <div className="ft-legal"><ShieldCheck size={18}/>
      <div><b>EC 141/2026 PROMULGADA EM 16/10/2026 · REGRAS EM TRANSIÇÃO</b>
        <p>Dois dias de descanso por semana, sem redução salarial. A partir de <strong>{dBR(LABOR_LAW.fiveTwoStart)}</strong> (até 60 dias): 5×2 com teto de 42h.
          A partir de <strong>{dBR(LABOR_LAW.fortyHoursStart)}</strong>: 40h. A 6×1 só continua por convenção ou acordo coletivo.
          O quadro abaixo é um <strong>estudo demonstrativo</strong>, não uma escala autorizada.</p></div></div>
    {message&&<div className="ft-alert" role="status"><Info size={15}/><span>{message}</span>
      <button type="button" aria-label="Fechar aviso" onClick={()=>setMessage("")}>×</button></div>}
    <section className="ft-panel no-print">
      <div className="ft-heading"><div><p className="op-eyebrow">LABORATÓRIO DE CENÁRIOS · {GROUPS.S.name.toUpperCase()}</p>
        <h2>Configure a futura operação</h2><p>Informe quantas pessoas cada dia precisa e quantas o quadro terá. A escala real não é alterada.</p></div>
        <span className="ft-pill">{ready?"Base fictícia carregada":"Carregando referências"}</span></div>
      <div className="ft-scenario-options">
        <button type="button" className={parameters.people===BASE_PEOPLE?"ft-selected":""} onClick={()=>setCount("people",BASE_PEOPLE)}>
          <span>Quadro atual</span><small>Serviços gerais hoje (6×1)</small><strong>{BASE_PEOPLE}</strong></button>
        <button type="button" className={parameters.people===minimum?"ft-selected":""} onClick={()=>setCount("people",minimum)}>
          <span>Mínimo para a necessidade</span><small>Jornadas da semana ÷ 5</small><strong>{minimum}</strong></button>
        <button type="button" className={parameters.people===minimum+1?"ft-selected":""} onClick={()=>setCount("people",minimum+1)}>
          <span>Mínimo + folguista</span><small>Margem para férias e atestados</small><strong>{minimum+1}</strong></button>
      </div>
      <div className="ft-controls">
        <label className="ft-field"><span>Pessoas de serviços gerais (quadro simulado)</span>
          <input aria-label="Quantidade de pessoas" type="number" min={BASE_PEOPLE} max={MAX_PEOPLE} value={parameters.people}
            onChange={e=>setCount("people",Number(e.target.value))}/></label>
        <label className="ft-field"><span>Necessárias de segunda a sexta</span>
          <input aria-label="Necessárias em dia útil" type="number" min={0} max={parameters.people} value={parameters.weekdayStaff}
            onChange={e=>setCount("weekdayStaff",Number(e.target.value))}/></label>
        <label className="ft-field"><span>Necessárias no sábado</span>
          <input aria-label="Necessárias no sábado" type="number" min={0} max={parameters.people} value={parameters.saturdayStaff}
            onChange={e=>setCount("saturdayStaff",Number(e.target.value))}/></label>
        <label className="ft-field"><span>Necessárias no domingo</span>
          <input aria-label="Necessárias no domingo" type="number" min={0} max={parameters.people} value={parameters.sundayStaff}
            onChange={e=>setCount("sundayStaff",Number(e.target.value))}/></label>
        <label className="ft-field"><span>Primeira segunda-feira da simulação</span>
          <input aria-label="Início da simulação" type="date" value={parameters.start}
            onChange={e=>change("start",e.target.value)}/></label>
        <label className="ft-field"><span>Fase da jornada</span>
          <select aria-label="Limite semanal" value={parameters.weeklyLimit}
            onChange={e=>change("weeklyLimit",Number(e.target.value) as 40|42)}>
            <option value={42}>Transição · 42h ({SERVICE_SHIFTS["5x2-42h"].start}–{SERVICE_SHIFTS["5x2-42h"].end})</option>
            <option value={40}>Definitiva · 40h ({SERVICE_SHIFTS["5x2-40h"].start}–{SERVICE_SHIFTS["5x2-40h"].end})</option>
          </select></label>
        <div className="ft-fixed-rules"><ShieldCheck size={17}/>
          <span><b>Regras fixas do estudo</b>
            <small>5 jornadas e 2 folgas por semana · no máximo 5 dias seguidos · 1h de intervalo · 11h entre jornadas</small></span>
          <HelpBubble label="Revezamento 5×2" description="As folgas vão para os dias em que sobra gente, preferindo sábado e domingo juntos. Ninguém trabalha mais de 5 dias seguidos, inclusive emendando semanas."/>
        </div>
      </div>
      {!dateIsMonday&&<div className="ft-warning" role="alert"><AlertTriangle size={16}/>
        Escolha uma segunda-feira válida para iniciar as quatro semanas.</div>}
      {!legalFirst&&<div className="ft-warning"><Info size={15}/> Data anterior à vigência da 5×2 ({dBR(LABOR_LAW.fiveTwoStart)}): o cenário é apenas hipotético.</div>}
      {parameters.weeklyLimit===40&&!legalForty&&<div className="ft-info"><Info size={15}/>
        A jornada de 40h pode ser planejada antes, mas o teto definitivo vale a partir de {dBR(LABOR_LAW.fortyHoursStart)}.</div>}
      {parameters.weeklyLimit===42&&legalForty&&<div className="ft-warning" role="alert"><AlertTriangle size={16}/>
        A partir de {dBR(LABOR_LAW.fortyHoursStart)} o teto é 40h; escolha a fase definitiva.</div>}
      {parameters.weeklyLimit===42&&<div className="ft-warning"><AlertTriangle size={16}/>
        42h em 5 dias dá 8h24 por dia, acima de 8h: confirme com o sindicato/convenção como distribuir as duas horas na fase de transição.</div>}
    </section>
    {result&&summary&&<>
      <section className="ft-stats" aria-label="Indicadores do cenário">
        <MiniMetric name="Quadro atual · 6×1" value={integer(BASE_PEOPLE)} detail={realShifts+" jornadas por semana hoje"}
          explanation="Serviços gerais em 6×1: segunda a sábado, 7h20 por dia, domingo de descanso."/>
        <MiniMetric name="Quadro simulado · 5×2" value={integer(summary.headcount)} detail={summary.weeklyCapacity+" jornadas por semana"}
          explanation="Cada pessoa faz 5 jornadas por semana na 5×2."/>
        <MiniMetric name="Reforço hipotético" value={"+"+integer(summary.newHires)} detail="Pessoas além do quadro atual" tone="blue"
          explanation={`Quadro simulado ${summary.headcount} menos ${BASE_PEOPLE} atuais. Nenhuma contratação foi feita.`}/>
        <MiniMetric name="Necessidade da semana" value={integer(summary.weeklyNeed)} detail="Vagas-dia de segunda a domingo" tone="green"
          explanation="Dias úteis × 5 + sábado + domingo, conforme os números informados."/>
      </section>
      <section className="ft-answer" aria-label="Resposta direta">
        <div className={"ft-answer-main "+(summary.coverageRate>=99.5?"ft-answer-ok":summary.coverageRate>=95?"ft-answer-warn":"ft-answer-bad")}>
          <span>Com <b>{summary.headcount} pessoas</b> na 5×2</span>
          <strong>{summary.coverageRate>=99.5?"✅ Cobre a necessidade":summary.coverageRate>=95?"🟡 Quase cobre":"🔴 Não cobre"}</strong>
          <small>{percent(summary.coverageRate)} das vagas preenchidas em 4 semanas · faltam {integer(summary.deficitCount)} vaga(s)-dia</small>
        </div>
        <div className="ft-answer-side">
          <p><b>Mínimo pela conta de jornadas:</b> {result.minimum} pessoas (sem margem para férias e atestados).</p>
          <p><b>Hoje (6×1):</b> {realShifts} jornadas por semana com {BASE_PEOPLE} pessoas.</p>
          <p><b>Sábado:</b> {summary.saturdayDeficit ? "faltam " + summary.saturdayDeficit + " vaga(s)-dia nos 4 sábados." : "coberto."} <b>Domingo:</b> {summary.sundayDeficit ? "faltam " + summary.sundayDeficit + "." : "coberto."}</p>
        </div>
      </section>
      <ScenarioExplanation result={result}/>
      <nav className="ft-tabs no-print" aria-label="Seções do simulador">
        <button className={tab==="cenario"?"ft-tab-active":""} onClick={()=>setTab("cenario")} type="button"><Workflow size={16}/> Viabilidade e cobertura</button>
        <button className={tab==="escala"?"ft-tab-active":""} onClick={()=>setTab("escala")} type="button"><CalendarDays size={16}/> Escala por pessoa</button>
        <button className={tab==="orientacoes"?"ft-tab-active":""} onClick={()=>setTab("orientacoes")} type="button"><BookOpen size={16}/> Guia de implementação</button>
      </nav>
      {tab==="cenario"&&<>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">PRESENÇA SIMULADA</p>
            <h2>Quem está escalado na semana?</h2><p>Disponíveis por dia (já descontadas férias e afastamentos aprovados) contra a necessidade.</p></div>
            <select aria-label="Semana da cobertura" className="ft-week-select" value={week} onChange={e=>setWeek(Number(e.target.value))}>
              {[0,1,2,3].map(w=><option key={w} value={w}>Semana {w+1}: {dBR(dateOffset(parameters.start,w*7))}</option>)}
            </select></div>
          <div className="ft-week-grid">
            {daysWeek.map((date,i)=>{
              const c=result.coverage.find(r=>r.date===date);
              return <div key={date} className={"ft-day"+(c&&c.deficit?" ft-danger":"")}>
                <span>{DAYS[i]} · {dBR(date).slice(0,5)}</span><strong>{c?.available??0} de {c?.required??0}</strong>
                <small>{c?.planned??0} escalados · {c?.absent??0} ausência(s){c&&c.deficit?" · faltam "+c.deficit:""}</small>
              </div>;
            })}
          </div>
          <div className="ft-rule-grid">
            <div><span><CalendarDays size={16}/> Folgas programadas</span><strong>{summary.headcount*8}</strong><small>2 por semana × 4 semanas</small></div>
            <div><span><Clock3 size={16}/> Jornada diária</span><strong>{minutes(shift.minutes)}</strong><small>{shift.start}–{shift.breakStart} / {shift.breakEnd}–{shift.end}</small></div>
            <div><span><ShieldCheck size={16}/> Mais de 5 dias seguidos</span><strong>{summary.restViolations}</strong><small>Semanas com sequência acima do limite</small></div>
            <div><span><AlertTriangle size={16}/> Acima do teto semanal</span><strong>{summary.badHours}</strong><small>Semanas acima de {parameters.weeklyLimit}h</small></div>
          </div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">PROPOSTA DE JORNADAS</p><h2>Como ficam os horários</h2>
            <p>Horários propostos para discussão com o RH e o sindicato.</p></div></div>
          <div className="ft-scroll-table"><table className="ft-table ft-shifts"><thead><tr><th>Equipe</th><th>Hoje</th><th>Proposta</th><th>Por jornada</th><th>Observação</th></tr></thead>
            <tbody>
              <tr><td><b>{GROUPS.S.name}</b></td><td>{SERVICE_SHIFTS["6x1"].label}</td><td>{shift.label}</td><td><b>{minutes(shift.minutes)}</b></td><td>Intervalo de 1h; folgas de preferência no sábado e no domingo.</td></tr>
              <tr><td><b>{GROUPS.P.name}</b></td><td>12×36 · diurno 07h–19h / noturno 19h–07h</td><td>Sem mudança</td><td><b>11:00</b></td><td>Média de {result.portaria.hours.toLocaleString("pt-BR")}h por semana; manter acordo escrito/convenção.</td></tr>
            </tbody></table></div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">IMPACTO FINANCEIRO HIPOTÉTICO</p>
            <h2>Quanto custaria o reforço?</h2>
            <p>Estimativa opcional para discutir orçamento. Não calcula folha, adicionais ou encargos.</p></div></div>
          <div className="ft-finance">
            <label className="ft-field"><span>Custo mensal médio total por nova contratação (R$)</span>
              <input aria-label="Custo mensal estimado por contratação" type="number" min={0} step={1}
                placeholder="Informe o valor de referência" value={monthlyCost} onChange={e=>setMonthlyCost(e.target.value)}/></label>
            <div><span>Novas contratações hipotéticas</span><strong>{summary.newHires}</strong></div>
            <div><span>Custo adicional ilustrativo / mês</span>
              <strong>{costValid?(summary.newHires*estimatedCost).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"Aguardando custo"}</strong></div>
          </div>
        </section>
      </>}
      {tab==="escala"&&<section className="ft-panel">
        <div className="ft-heading"><div><p className="op-eyebrow">PROPOSTA INDIVIDUAL · 4 SEMANAS</p>
          <h2>Folgas e jornadas por pessoa</h2><p>Previsão das pessoas atuais e dos reforços fictícios, sem alterar a escala oficial.</p></div>
          <button type="button" className="ft-secondary no-print" onClick={csv}><Download size={15}/> CSV completo</button></div>
        <div className="ft-filter-row no-print"><label className="ft-search"><Search size={16}/>
            <input value={staffSearch} onChange={e=>setStaffSearch(e.target.value)} aria-label="Buscar colaborador do simulador" placeholder="Nome ou matrícula"/></label>
          <select aria-label="Semana individual" value={week} onChange={e=>setWeek(Number(e.target.value))}>
            {[0,1,2,3].map(w=><option key={w} value={w}>Semana {w+1}</option>)}
          </select>
          <span className="ft-pill"><Users size={14}/> {staff.length} pessoas</span></div>
        <div className="ft-roster-legend"><span className="ft-work-chip ft-working">Trabalha</span><span className="ft-work-chip ft-resting">Folga</span></div>
        <div className="ft-scroll-table ft-roster" role="region" aria-label="Escala individual semanal" tabIndex={0}>
          <table className="ft-table"><thead><tr><th>Colaborador</th>
            {daysWeek.map((d,i)=><th key={d}>{DAYS[i]}<small>{dBR(d).slice(0,5)}</small></th>)}
            <th>Horas/semana</th><th>Fins de semana livres/4</th></tr></thead>
            <tbody>{staff.map(p=>{
              const w=p.weeks[week];
              if(!w)return null;
              return <tr key={p.employee.id}>
                <td><b>{p.employee.name}</b><small>{p.employee.id}{p.employee.hired?" · Reforço proposto":""}</small></td>
                {daysWeek.map(day=>{
                  const works=w.workingDates.includes(day);
                  return <td key={day}><span className={"ft-work-chip "+(works?"ft-working":"ft-resting")}>{works?"Trabalha":"Folga"}</span></td>;
                })}
                <td className={w.overWeeklyLimit?"ft-danger":""}><b>{minutes(w.minutes)}</b></td>
                <td>{p.weekendsOff}</td></tr>;
            })}</tbody></table>
        </div>
      </section>}
      {tab==="orientacoes"&&<>
        <section className="ft-panel"><div className="ft-heading"><div>
          <p className="op-eyebrow">DA LEI À OPERAÇÃO</p><h2>Roteiro de transição segura</h2>
          <p>Passo a passo para os condomínios atendidos.</p></div></div>
          <div className="ft-steps">{STEPS.map(item=><div key={item.n}><span>{item.n}</span>
            <div><b>{item.name}</b><p>{item.desc}</p></div></div>)}</div></section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">PRONTIDÃO</p><h2>Conferência antes de implantar</h2>
            <p>Marque os preparativos concluídos. A lista é temporária e não substitui as aprovações.</p></div>
            <span className="ft-pill">{pilotChecks.length} de {STEPS.length} etapas</span></div>
          <div className="ft-checklist">{STEPS.map(step=><label key={step.n}>
            <input type="checkbox" checked={pilotChecks.includes(step.n)}
              onChange={e=>setPilotChecks(prev=>e.target.checked?[...prev,step.n]:prev.filter(x=>x!==step.n))}/>
            <span><b>{step.n} · {step.name}</b><small>{step.desc}</small></span>
          </label>)}</div>
        </section>
        <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">PERGUNTAS PRÁTICAS</p>
          <h2>O que o gestor precisa saber</h2></div></div>
          <div className="ft-faq">{INSIGHTS.map(([q,a],i)=><div key={q}>
            <button type="button" aria-expanded={expanded===q} onClick={()=>setExpanded(v=>v===q?null:q)}>
              <b>{String(i+1).padStart(2,"0")} · {q}</b><ChevronDown size={16}/></button>
            {expanded===q&&<p>{a}</p>}</div>)}</div></section>
        <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">REFERÊNCIAS</p>
          <h2>Legislação</h2></div></div>
          <div className="ft-sources">{SOURCES.map(s=><a href={s.url} key={s.title} target="_blank" rel="noopener noreferrer">
            <BookOpen size={17}/><span><b>{s.title}</b><small>{s.desc}</small></span><ArrowRight size={17}/></a>)}</div></section>
      </>}
      <div className="ft-bottom"><ShieldCheck size={15}/>
        Simulação isolada · não altera <b>Escala & trocas</b>, <b>Ponto</b>, <b>Férias</b> ou <b>Banco de horas</b>.
        Resultados heurísticos não são garantia de cobertura ótima nem avaliação jurídica.</div>
    </>}
  </div>;
}
