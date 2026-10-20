import { useEffect,useMemo,useState } from "react";
import {
  AlertTriangle,ArrowRight,BookOpen,CalendarDays,CheckCircle2,ChevronDown,Clock3,
  Download,Info,RefreshCw,Search,ShieldCheck,Users,Workflow,
} from "lucide-react";
import { GROUPS,GROUP_IDS,UNIT } from "@/domain/config";
import { ABSENCE_STORAGE_KEY,demoAbsences,restoreAbsences,type AbsenceStore } from "@/domain/absences";
import { SCHEDULE_STORAGE_KEY } from "@/domain/absences";
import { DEFAULT_SCHEDULE,dateOffset,reviseStore,startOfWeek,type ScheduleStore } from "@/domain/schedule";
import {
  DAYS,DEFAULT_PARAMETERS,LEGAL_SOURCES,PROPOSED_SHIFTS,groupAllocation,
  proposedShift,simulate5x2,theoreticalMinimum,
  type SimulatorParameters,type ScenarioResult,
} from "@/domain/five-two-simulator";
import type { GroupId } from "@/domain/types";
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
  const header=["Matrícula","Nome","Grupo","Semana","Início","Fim","Seg","Ter","Qua","Qui","Sex","Sáb","Dom",
    "Jornada prevista HH:MM","Domingo livre","Contratação hipotética"];
  const data=result.byWeek.map(row=>{
    const days=Array.from({length:7},(_,i)=>dateOffset(result.settings.start,row.week*7+i));
    return [row.employee.id,row.employee.name,"Grupo "+row.employee.group,String(row.week+1),
      dBR(days[0]!),dBR(days[6]!),...days.map(d=>row.workingDates.includes(d)?"TRABALHA":"FOLGA"),
      minutes(row.hours),row.sundayFree?"SIM":"NÃO",row.employee.hired?"SIM":"NÃO"];
  });
  const csv="\uFEFF"+[header,...data].map(row=>row.map(csvCell).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="formosa-simulacao-5x2-"+result.settings.start+".csv";
  document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function storeSources(){
  let schedule:ScheduleStore=DEFAULT_SCHEDULE,absences:AbsenceStore=demoAbsences();
  try{const x=window.localStorage.getItem(SCHEDULE_STORAGE_KEY);if(x)schedule=reviseStore(JSON.parse(x));}catch{/* defaults */}
  try{const x=window.localStorage.getItem(ABSENCE_STORAGE_KEY);if(x)absences=restoreAbsences(JSON.parse(x));}catch{/* defaults */}
  return {schedule,absences};
}
const SELECTORS=[
  {value:63,title:"Atual · 63 pessoas",desc:"Sem reforço"},
  {value:76,title:"Reforço · 76 pessoas",desc:"+13 contratações hipotéticas"},
  {value:91,title:"Piso teórico · 91 pessoas",desc:"Sábado integral e domingos alternados"},
] as const;
const PILOT_METRICS=[
  {name:"Cobertura por faixa horária",cadence:"Diária · abertura, pico e fechamento",signal:"Qualquer posto descoberto no pico",action:"Rever folgas, reforço ou horário de funcionamento"},
  {name:"Horas extras e banco de horas",cadence:"Semanal · horas aprovadas",signal:"Crescimento sustentado após mudança",action:"Revisar turnos e avaliar custo real"},
  {name:"Filas e tempo de atendimento",cadence:"Diária · horários críticos",signal:"Espera acima da meta da loja",action:"Reforçar caixas e ajustar intervalos"},
  {name:"Vendas por hora e atendimento",cadence:"Semanal · comparar períodos equivalentes",signal:"Queda relevante em horários de maior fluxo",action:"Reavaliar cobertura e abertura/fechamento"},
  {name:"Absenteísmo, retenção e clima",cadence:"Quinzenal · RH e equipe",signal:"Aumento de faltas ou pedidos de saída",action:"Rever descanso, carga e preferências"},
  {name:"Custo total de pessoal",cadence:"Mensal · DP e financeiro",signal:"Desvio contra o orçamento aprovado",action:"Comparar reforços, encargos, VT e alimentação"},
] as const;
const SOURCES=[
 {title:"Agência Senado · início de 42h em 15/12",url:LEGAL_SOURCES.implementation,
  desc:"Esclarecimento oficial de 19/10/2026 sobre a data da primeira etapa da transição."},
 {title:"Emenda Constitucional 141/2026",url:LEGAL_SOURCES.url,
  desc:"Texto promulgado: prazos, descanso, 42h transitórias, 40h definitivas e acordo coletivo."},
 {title:"Agência Senado · promulgação",url:LEGAL_SOURCES.senate,
  desc:"Publicação oficial de 16/10/2026 sobre etapas e repousos semanais."},
 {title:"Grupo Supernosso · piloto 5×2",url:"https://bhaz.com.br/noticias/bh/supernosso-amplia-escala-5x2-apos-reducao-de-custos-em-teste/",
  desc:"500 funcionários em três lojas; expansão progressiva após monitoramento de custos e vendas. Jornada de 44h original não é modelo legal atual."},
 {title:"Farmácias São João / Pague Menos",url:"https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/pronunciamento/522555",
  desc:"Experiências mencionadas no Senado; condições específicas não comprovadas para replicação."},
];
const STEPS=[
 {n:"01",name:"Auditar quadro e demanda",desc:"Validar os 63 funcionários, funções, cobertura mínima por hora e os picos do supermercado. Os números A/B/C atuais são apenas um ponto de partida."},
 {n:"02",name:"Validar norma coletiva",desc:"Confirmar com RH e sindicato jornadas, folgas, domingos, feriados, intervalos e eventual ampliação diária na fase transitória de 42h."},
 {n:"03",name:"Testar escalas de quatro semanas",desc:"Escolher cenários de 63, 76 ou quadro personalizado. Conferir folgas, cobertura diária por grupo e restrições antes de decidir contratações."},
 {n:"04",name:"Implantar piloto controlado",desc:"Começar por setores/unidades selecionadas, registrar preferências e monitorar pontualidade, vendas, filas, custo e satisfação por algumas semanas."},
 {n:"05",name:"Corrigir déficit e revisar",desc:"Ajustar reforços, realocar responsabilidades, treinar substitutos e refazer a simulação. Nunca depender de hora extra automática para cobrir quadro insuficiente."},
 {n:"06",name:"Aprovar e só depois operacionalizar",desc:"Formalizar com gestão, DP, jurídico e sindicato; configurar jornadas reais e integrar ao ponto oficial apenas após validação das condições."},
];
const INSIGHTS=[
 ["O que muda para o trabalhador?","Na simulação da Formosa, cada pessoa trabalha 5 dias e descansa 2 por semana. Todo sábado é escalado, enquanto o domingo alterna rigorosamente entre trabalho e folga. Férias e ausências aprovadas continuam reduzindo a presença efetiva."],
 ["É obrigatório contratar 13 pessoas?","Não. Os +13 do cenário de 76 são hipótese. A necessidade depende da cobertura real por horário, produtividade, funções, revezamento, férias e regras do sindicato."],
 ["Por que 76 pessoas podem ser insuficientes?","Não basta multiplicar colaboradores por cinco dias. O supermercado precisa cobrir grupos, sábados, domingos e picos. O painel evidencia déficits por data/grupo."],
 ["Como ficam as folgas e os feriados?","Para a Formosa, as folgas são obrigatoriamente separadas. Quem trabalha domingo folga duas vezes de segunda a sexta; quem folga domingo recebe mais uma folga útil. Feriado pode ser trabalhado ou coincidir com a folga, mas não gera descanso adicional automático. Evitamos folgar terça quando a segunda-feira feriada foi folga."],
 ["Como fica a fase de 42 horas?","No período de transição, 5 × 8h24 ultrapassa 8 horas diárias e exige autorização por acordo ou convenção coletiva. A tela marca essa hipótese como CONDICIONAL; não publica jornada."],
 ["E os colaboradores que saem às 22h?","O simulador propõe turnos A/B/C ajustados para preservar fechamento, em vez de estender automaticamente o grupo C além das 22h. Qualquer nova entrada deve respeitar 11 horas de descanso."],
];
function HelpBubble({label,description}:{label:string;description:string}){
  return <span className="ft-help" tabIndex={0} role="note" aria-label={label+": "+description}
    title={description}><Info size={14}/><span className="ft-help-pop" role="tooltip">{description}</span></span>;
}
function MiniMetric({name,value,detail,tone="wine",explanation}:{name:string;value:string;detail:string;tone?:"wine"|"green"|"amber"|"red"|"blue";explanation:string}){
  return <div className={"ft-metric ft-"+tone}><div className="ft-metric-label"><span>{name}</span>
    <HelpBubble label={name} description={explanation}/></div><strong>{value}</strong><small>{detail}</small></div>;
}
export function FiveTwoWorkspace(){
  const [sources,setSources]=useState<{schedule:ScheduleStore;absences:AbsenceStore}>(()=>({schedule:DEFAULT_SCHEDULE,absences:demoAbsences()}));
  const [parameters,setParameters]=useState<SimulatorParameters>(DEFAULT_PARAMETERS);
  const [headcountMode,setHeadcountMode]=useState<"preset"|"custom">("preset");
  const [tab,setTab]=useState<Section>("cenario");
  const [week,setWeek]=useState(0);
  const [group,setGroup]=useState<"all"|GroupId>("all");
  const [staffSearch,setStaffSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const [message,setMessage]=useState("");
  const [pilotChecks,setPilotChecks]=useState<string[]>([]);
  const [monthlyCost,setMonthlyCost]=useState("");
  useEffect(()=>{
    const refresh=()=>setSources(storeSources());
    refresh();setReady(true);
    const focus=()=>refresh();
    const storage=()=>refresh();
    window.addEventListener("focus",focus);window.addEventListener("storage",storage);
    return ()=>{window.removeEventListener("focus",focus);window.removeEventListener("storage",storage);};
  },[]);
  const groupCounts=parameters.allocation??groupAllocation(parameters.people);
  const dateIsMonday=Number.isFinite(Date.parse(parameters.start+"T12:00:00Z")) &&
    startOfWeek(parameters.start)===parameters.start;
  const result=useMemo(()=>{
    if(!dateIsMonday||parameters.people<63||parameters.people>140)return null;
    try{return simulate5x2(sources.schedule,sources.absences,parameters);}catch{return null;}
  },[sources,parameters,dateIsMonday]);
  const preview=useMemo(()=>{
    if(!result)return null;
    const other=parameters.people===63?76:63;
    try{return simulate5x2(sources.schedule,sources.absences,{...parameters,people:other});}catch{return null;}
  },[sources,parameters,result]);
  const daily=result?.coverage.filter(r=>r.date>=dateOffset(parameters.start,week*7)&&
    r.date<=dateOffset(parameters.start,week*7+6)&&
    (group==="all"||r.group===group))??[];
  const staff=result?.personSummary.filter(p=>(group==="all"||p.employee.group===group)&&
    (p.employee.name+" "+p.employee.id).toLocaleLowerCase("pt-BR").includes(staffSearch.trim().toLocaleLowerCase("pt-BR")))??[];
  const safeStart=dateIsMonday?parameters.start:FUTURE_START;
  const daysWeek=Array.from({length:7},(_,i)=>dateOffset(safeStart,week*7+i));
  const legalFirst=parameters.start>=LEGAL_SOURCES.firstPhase;
  const legalForty=parameters.start>=LEGAL_SOURCES.finalPhase;
  const currentMin=theoreticalMinimum(sources.schedule,safeStart);
  function change<K extends keyof SimulatorParameters>(key:K,value:SimulatorParameters[K]){
    setParameters(p=>({...p,[key]:value}));setExpanded(null);
  }
  function applyPeople(value:number) {
    const n=Math.max(63,Math.min(140,Math.floor(Number.isFinite(value)?value:63)));
    setParameters(p=>({...p,people:n,allocation:undefined}));
  }
  function setGroupCount(group:GroupId,value:number){
    const min={A:4,B:29,C:30}[group];
    const count=Math.max(min,Math.min(80,Math.trunc(Number.isFinite(value)?value:min)));
    const next={...groupCounts,[group]:count};
    const total=GROUP_IDS.reduce((sum,g)=>sum+next[g],0);
    if(total>140){setMessage("O máximo do protótipo é 140 pessoas.");return;}
    setParameters(p=>({...p,people:total,allocation:next}));
  }
  function csv(){if(result)try{exportCsv(result);setMessage("Escala hipotética das quatro semanas exportada para CSV. Não é autorização de trabalho.");}
    catch{setMessage("Não foi possível exportar neste navegador.");}}
  const summary=result?.metrics;
  const estimatedCost=Number(monthlyCost);
  const costValid=monthlyCost.trim()!=="" && Number.isFinite(estimatedCost) && estimatedCost>0;
  return <div className="ft-app formosa-operation">
    <header className="ft-top no-print"><div>
      <p className="op-eyebrow">FORMOSA · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
      <h1>Simulador <span>5×2</span></h1>
      <p>Planejamento de folgas, quadro necessário e cobertura operacional em quatro semanas.</p></div>
      <div className="ft-top-actions">
        <button type="button" className="ft-secondary" onClick={()=>setSources(storeSources())}><RefreshCw size={15}/> Atualizar bases</button>
        <button type="button" className="ft-primary" disabled={!result} onClick={csv}><Download size={16}/> Exportar simulação</button>
      </div></header>
    <div className="ft-legal"><ShieldCheck size={18}/>
      <div><b>EC 141/2026 PROMULGADA · REGRAS EM TRANSIÇÃO</b>
        <p>Dois dias de descanso semanal, sem redução salarial. A partir de <strong>15/12/2026:</strong> teto de 42h/semana.
          A partir de <strong>15/12/2027:</strong> 40h/semana. Ampliação diária na fase de 42h requer acordo/convenção coletiva.
          O quadro abaixo é um <strong>estudo demonstrativo</strong>, não uma escala autorizada.</p></div></div>
    {message&&<div className="ft-alert" role="status"><Info size={15}/><span>{message}</span>
      <button type="button" aria-label="Fechar aviso" onClick={()=>setMessage("")}>×</button></div>}
    <section className="ft-panel no-print">
      <div className="ft-heading"><div><p className="op-eyebrow">LABORATÓRIO DE CENÁRIOS</p>
        <h2>Configure a futura operação</h2><p>Altere o quadro e veja a cobertura recalculada, sem modificar a escala real.</p></div>
        <span className="ft-pill">{ready?"Base fictícia carregada":"Carregando referências"}</span></div>
      <div className="ft-scenario-options">{SELECTORS.map(o=><button key={o.value} type="button"
        className={parameters.people===o.value&&headcountMode==="preset"?"ft-selected":""}
        onClick={()=>{setHeadcountMode("preset");applyPeople(o.value);}}> 
        <span>{o.title}</span><small>{o.desc}</small>
        <strong>{o.value}</strong></button>)}
        <button type="button" className={headcountMode==="custom"?"ft-selected":""}
          onClick={()=>{setHeadcountMode("custom");setParameters(p=>({...p,allocation:groupAllocation(p.people)}));}}>
          <span>Quadro personalizado</span>
          <small>63 até 140 pessoas</small><strong><Users size={20}/></strong></button></div>
      <div className="ft-controls">
        {headcountMode==="custom"&&<>
          <label className="ft-field"><span>Colaboradores totais</span>
            <input aria-label="Quantidade personalizada" type="number" min={63} max={140} step={1}
              value={parameters.people} onChange={e=>applyPeople(Number(e.target.value))}/></label>
          {GROUP_IDS.map(g=><label key={g} className="ft-field">
            <span>Grupo {g} · {GROUPS[g].name}</span>
            <input aria-label={"Pessoas no grupo "+g} type="number" min={{A:4,B:29,C:30}[g]} max={80} step={1}
              value={groupCounts[g]} onChange={e=>setGroupCount(g,Number(e.target.value))}/>
          </label>)}
        </>}
        <label className="ft-field"><span>Primeira segunda-feira da simulação</span>
          <input aria-label="Início da simulação" type="date" value={parameters.start}
            onChange={e=>change("start",e.target.value)}/></label>
        <label className="ft-field"><span>Fase da jornada</span>
          <select aria-label="Limite semanal" value={parameters.weeklyLimit}
            onChange={e=>change("weeklyLimit",Number(e.target.value) as 40|42)}>
            <option value={42}>Transição · até 42h (condicional)</option>
            <option value={40}>Definitiva · até 40h</option>
          </select></label>
        <div className="ft-fixed-rules"><ShieldCheck size={17}/>
          <span><b>Regras obrigatórias da Formosa</b>
            <small>Sábado com todos escalados · Domingo sim, domingo não · Duas folgas separadas por semana</small></span>
          <HelpBubble label="Revezamento 5×2" description="Na semana em que trabalha domingo: duas folgas úteis intercaladas. Quando folga domingo: uma folga útil adicional. Todos são escalados sábado, independentemente do grupo. Não são permitidos seis dias seguidos de trabalho nem folgas em dias consecutivos."/>
        </div>
      </div>
      {!dateIsMonday&&<div className="ft-warning" role="alert"><AlertTriangle size={16}/>
        Escolha uma segunda-feira válida para iniciar as quatro semanas.</div>}
      {legalFirst===false&&<div className="ft-warning"><Info size={15}/> Data anterior à vigência da nova escala:
        o cenário permanece apenas hipotético. A segunda folga passa a valer em 15/12/2026, conforme esclarecimento do Senado.</div>}
      {parameters.weeklyLimit===40&&!legalForty&&<div className="ft-info"><Info size={15}/>
        A jornada de 40h pode ser planejada antecipadamente, mas o limite constitucional definitivo passa a ser aplicado em 15/12/2027, conforme cronograma do Senado.</div>}
      {parameters.weeklyLimit===42&&legalForty&&<div className="ft-warning" role="alert"><AlertTriangle size={16}/>
        O teto definitivo de 40h começa em 15/12/2027; usar 42h após essa data não representa uma escala regular.
        Escolha 40h para planejar a implementação final.</div>}
      {parameters.weeklyLimit===42&&<div className="ft-warning"><AlertTriangle size={16}/>
        Distribuição de 42h em 5 dias (8h24/dia) é CONDICIONAL a acordo/convenção coletiva durante a transição,
        conforme art. 7º da EC 141/2026. Não aplicar automaticamente.</div>}
    </section>
    {result&&summary&&<>
      <section className="ft-stats" aria-label="Indicadores do cenário">
        <MiniMetric name="Equipe simulada" value={integer(summary.headcount)} detail={"63 atuais + "+summary.newHires+" hipotéticos"}
        explanation="Total do cenário: 63 funcionários fictícios cadastrados e reforços simulados. Nenhuma contratação é realizada."/>
        <MiniMetric name="Cobertura prevista" value={percent(summary.coverageRate)} detail="28 dias · A, B e C" tone="green"
        explanation="Postos-dia atendidos sobre a demanda configurada nas quatro semanas, calculados por data e grupo. Excesso em outro grupo não elimina uma falta."/>
        <MiniMetric name="Postos-dia descobertos" value={integer(summary.deficitCount)} detail="Diferença acumulada da necessidade" tone={summary.deficitCount?"amber":"green"}
        explanation="Soma de trabalhadores que faltam para as metas diárias dos grupos. Se faltam dois funcionários por três dias, são seis postos-dia descobertos."/>
        <MiniMetric name="Dias com déficit" value={integer(summary.uncoveredDays)} detail="Em um ou mais grupos" tone={summary.uncoveredDays?"red":"green"}
        explanation="Número de datas em que pelo menos um grupo não possui o quantitativo mínimo previsto, considerando afastamentos aprovados."/>
      </section>
      <nav className="ft-tabs no-print" aria-label="Seções do simulador">
        <button className={tab==="cenario"?"ft-tab-active":""} onClick={()=>setTab("cenario")} type="button"><LayoutIcon/> Viabilidade e cobertura</button>
        <button className={tab==="escala"?"ft-tab-active":""} onClick={()=>setTab("escala")} type="button"><CalendarDays size={16}/> Escala por pessoa</button>
        <button className={tab==="orientacoes"?"ft-tab-active":""} onClick={()=>setTab("orientacoes")} type="button"><BookOpen size={16}/> Guia de implementação</button>
      </nav>
      {tab==="cenario"&&<>
        <div className="ft-two">
          <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">DIAGNÓSTICO</p>
            <h2>Quanto pessoal seria necessário?</h2><p>Capacidade matemática versus cobertura efetiva por dia e turno.</p></div>
            <span className="ft-pill">4 semanas</span></div>
            <div className="ft-diagnostics">
              <div><span>Capacidade semanal em jornadas</span><strong>{integer(summary.weeklyCapacity)}</strong><small>{summary.headcount} × 5 dias</small></div>
              <div><span>Demanda semanal inicial</span><strong>{integer(summary.requiredFirstWeek)}</strong><small>Metas A/B/C por dia</small></div>
              <div><span>Piso matemático do quadro <HelpBubble label="Dimensionamento" description="Novo cálculo com sábado integral para todos e dois domingos trabalhados por pessoa em quatro semanas; cada funcionário fica com 14 dias úteis disponíveis no período. É um mínimo necessário, não suficiente."/></span><strong>{currentMin.total}</strong><small>A {currentMin.groups.A} · B {currentMin.groups.B} · C {currentMin.groups.C}</small></div>
              <div><span>Déficit na escala atual (28 dias)</span><strong>{summary.totalBaselineDeficit}</strong><small>Referência 6×1 com regras existentes</small></div>
            </div>
            <div className={"ft-message-note "+(summary.deficitCount?"ft-message-warn":"")}>
              {summary.deficitCount?<AlertTriangle size={17}/>:<CheckCircle2 size={17}/>}
              <p><b>{summary.deficitCount?"Cobertura ainda insuficiente":"Sem déficit para as metas informadas"}</b>
                {" "}O estudo encontrou {summary.deficitCount} posto(s)-dia descoberto(s) com {summary.headcount} pessoas.
                {summary.deficitCount?" Ajuste quantidade, distribuição por grupo ou regras de funcionamento.":" Confirme horários, funções e demanda horária real antes de aprovar."}</p>
            </div>
          </section>
          <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">QUALIDADE DA ESCALA</p>
            <h2>Folgas, limites e alertas</h2><p>Indicadores de proteção e viabilidade do cenário.</p></div></div>
            <div className="ft-rule-grid">
              <div><span><CalendarDays size={16}/> Folgas programadas <HelpBubble label="Folgas semanais" description="Duas folgas não consecutivas em cada semana por colaborador, sempre fora do sábado. Quem descansa domingo folga mais uma vez em dia útil; quem trabalha domingo folga duas vezes em dias úteis."/></span><strong>{summary.headcount*8}</strong><small>2 por semana × 4 semanas</small></div>
              <div><span><Clock3 size={16}/> Domingos livres por pessoa <HelpBubble label="Domingos alternados" description="Cada pessoa folga dois dos quatro domingos, trabalhando um e folgando o seguinte, em rodízio com outros colegas do mesmo grupo."/></span><strong>{summary.monthlyAverageSundaysOff.toFixed(1)}</strong><small>Dois domingos livres no ciclo</small></div>
              <div><span><ShieldCheck size={16}/> Conflitos de 11h <HelpBubble label="Descanso entre jornadas" description="Confere intervalo mínimo de 11 horas entre a saída de uma jornada e a entrada da seguinte. Ainda requer validação das regras aplicáveis."/></span><strong>{summary.daysWith11hConflicts}</strong><small>Entre jornadas consecutivas</small></div>
              <div><span><AlertTriangle size={16}/> Alertas de regras <HelpBubble label="Alertas do revezamento" description="Soma conflitos de folgas próximas, seis dias trabalhados em sequência, excesso de horas, falta de sábado escalado e erro no rodízio dominical. Não oculta os casos que não têm solução."/></span><strong>{summary.restViolations+summary.badHours+summary.saturdayUnscheduled+summary.sundayAlternationErrors}</strong><small>Folgas · horas · sábados · domingos</small></div>
            </div>
            <div className="ft-note"><Info size={16}/><span>O sábado permanece integralmente escalado, mesmo quando a data for feriado. A equipe trabalha domingos alternados; folgas úteis são distribuídas sem dois dias seguidos. Aferição por dia não substitui a conferência de cobertura por hora nem aprovação do RH.</span></div>
          </section>
        </div>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">EQUIPES · A / B / C</p>
            <h2>Como o reforço é distribuído</h2><p>Distribuição proporcional inicial. Gestão pode reavaliar funções e necessidades reais.</p></div></div>
          <div className="ft-group-grid">{result.groups.map(g=><div key={g.group}>
            <div className="ft-group-title"><b>Grupo {g.group} · {GROUPS[g.group].name}</b><strong>{g.headcount} pessoas</strong></div>
            <div className="ft-group-detail"><span>Jornadas necessárias/semana</span><b>{g.neededWeek}</b></div>
            <div className="ft-group-detail"><span>Capacidade/semana</span><b>{g.capacityWeek}</b></div>
            <div className="ft-group-detail"><span>Déficit em 4 semanas</span><b className={g.unmet?"ft-danger":""}>{g.unmet} postos-dia</b></div>
            <div className="ft-progress"><i style={{width:Math.min(100,g.neededWeek?g.capacityWeek/g.neededWeek*100:100)+"%"}}/></div>
          </div>)}</div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">MAPA DE COBERTURA SEMANAL</p>
            <h2>Quem cobre cada dia?</h2><p>Vermelho indica falta de pessoal para a meta do grupo. Clique na semana para analisar outra janela.</p></div>
            <select aria-label="Semana da cobertura" className="ft-week-select"
              value={week} onChange={e=>setWeek(Number(e.target.value))}>
              {[0,1,2,3].map(w=><option key={w} value={w}>Semana {w+1}: {dBR(dateOffset(parameters.start,w*7))}</option>)}
            </select></div>
          <div className="ft-week-grid">
            {daysWeek.map((date,i)=>{
              const items=result.coverage.filter(r=>r.date===date);
              const missing=items.reduce((n,r)=>n+r.deficit,0);
              const available=items.reduce((n,r)=>n+r.available,0);
              const needed=items.reduce((n,r)=>n+r.required,0);
              return <div key={date} className={"ft-day "+(missing?"ft-day-risk":"")}>
                <span>{DAYS[i]} · {dBR(date).slice(0,5)}</span><strong>{available}/{needed}</strong>
                <small>{missing?missing+" descobertos":"Cobertura mínima atingida"}</small>
              </div>;
            })}
          </div>
          <div className="ft-scroll-table" role="region" aria-label="Detalhes diários de cobertura" tabIndex={0}>
            <table className="ft-table"><thead><tr><th>Data</th><th>Grupo</th><th>Necessários</th><th>Escalados</th>
              <th>Ausências aprovadas</th><th>Disponíveis</th><th>Déficit</th><th>6×1 referência</th></tr></thead>
              <tbody>{daily.map(r=><tr key={r.date+r.group}>
                <td>{dBR(r.date)}{r.sunday?" · Domingo":r.holiday?" · Feriado":""}</td>
                <td><b>Grupo {r.group}</b></td><td>{r.required}</td><td>{r.planned}</td>
                <td>{r.absent}</td><td>{r.available}</td>
                <td><span className={"ft-status "+(r.deficit?"ft-status-red":"ft-status-green")}>{r.deficit?("−"+r.deficit):"OK"}</span></td>
                <td>{r.baseline}/{r.required}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">PROPOSTA DE JORNADAS</p><h2>Como ficam os horários de trabalho</h2>
            <p>Os grupos permanecem fixos; os horários abaixo são apenas propostas para discussão.</p></div></div>
          <div className="ft-scroll-table"><table className="ft-table ft-shifts"><thead><tr><th>Equipe</th><th>Atual 6×1</th>
            <th>Proposta {parameters.weeklyLimit}h/semana</th><th>Expediente normal diário</th><th>Observação</th></tr></thead>
            <tbody>{GROUP_IDS.map(g=>{
              const current=GROUPS[g].shift;const proposal=PROPOSED_SHIFTS[parameters.weeklyLimit][g];
              const typical=proposedShift(g,parameters.weeklyLimit,dateOffset(parameters.start,0));
              return <tr key={g}><td><b>{g} · {GROUPS[g].name}</b></td>
                <td>{current.start}–{current.breakStart} / {current.breakEnd}–{current.end}</td>
                <td>{proposal.start}–{proposal.breakStart} / {proposal.breakEnd}–{proposal.end}</td>
                <td><b>{minutes(typical.minutes)} por jornada</b></td>
                <td>{g==="C"?"Preserva encerramento às 22h": "Intervalo proposto de 1h; validar acordo e funcionamento"}</td>
              </tr>;
            })}</tbody></table></div>
          <div className="ft-note"><Info size={16}/> Domingos e feriados exigem dimensionamento próprio. Turnos dominicais
            são menores (6h15 nos exemplos), de forma que alguns colaboradores terão menos horas na semana.
            Não completar automaticamente o saldo com banco de horas nem estender jornada além de acordo aprovado.</div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">IMPACTO FINANCEIRO HIPOTÉTICO</p>
            <h2>Quanto custaria o reforço?</h2>
            <p>Estimativa opcional, para discussão do orçamento. Não calcula folha, adicionais ou encargos automaticamente.</p></div></div>
          <div className="ft-finance">
            <label className="ft-field"><span>Custo mensal médio total por novo colaborador (R$)</span>
              <input aria-label="Custo mensal estimado por contratação" type="number" min={0} step={1}
                placeholder="Informe o valor de referência" value={monthlyCost}
                onChange={e=>setMonthlyCost(e.target.value)}/></label>
            <div><span>Novos colaboradores hipotéticos</span><strong>{summary.newHires}</strong></div>
            <div><span>Custo adicional ilustrativo / mês</span>
              <strong>{costValid?(summary.newHires*estimatedCost).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"Aguardando custo"}</strong></div>
          </div>
          <div className="ft-note"><Info size={16}/> Utilize custo completo validado pelo financeiro (salário, benefícios, encargos e provisões).
            O resultado é apenas a multiplicação do reforço pelo custo informado; não contempla produtividade,
            alterações de horário, treinamento, despesas extraordinárias ou negociação coletiva.</div>
        </section>
        {preview&&<section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">COMPARAÇÃO RÁPIDA</p><h2>Diferença entre cenários</h2>
            <p>Quantidades não substituem qualificação, treinamento nem produtividade real.</p></div></div>
          <div className="ft-comparison">
            <div><b>Com {result.people.length} pessoas</b><strong>{summary.deficitCount} postos-dia em déficit</strong></div>
            <ArrowRight size={20}/><div><b>Com {preview.people.length} pessoas</b>
              <strong>{preview.metrics.deficitCount} postos-dia em déficit</strong></div></div>
        </section>}
      </>}
      {tab==="escala"&&<section className="ft-panel">
        <div className="ft-heading"><div><p className="op-eyebrow">PROPOSTA INDIVIDUAL · 4 SEMANAS</p>
          <h2>Folgas e jornadas por colaborador</h2><p>Consulte a previsão das pessoas atuais e dos reforços fictícios, sem alterar a escala oficial.</p></div>
          <button type="button" className="ft-secondary no-print" onClick={csv}><Download size={15}/> CSV completo</button></div>
        <div className="ft-filter-row no-print"><label className="ft-search"><Search size={16}/>
            <input value={staffSearch} onChange={e=>setStaffSearch(e.target.value)}
              aria-label="Buscar colaborador do simulador" placeholder="Nome ou matrícula"/></label>
          <select aria-label="Filtrar equipe" value={group} onChange={e=>setGroup(e.target.value as "all"|GroupId)}>
            <option value="all">Todos os grupos</option>{GROUP_IDS.map(g=><option key={g} value={g}>Grupo {g}</option>)}
          </select>
          <select aria-label="Semana individual" value={week} onChange={e=>setWeek(Number(e.target.value))}>
            {[0,1,2,3].map(w=><option key={w} value={w}>Semana {w+1}</option>)}
          </select>
          <span className="ft-pill">{staff.length} pessoas</span></div>
        <div className="ft-roster-legend"><span className="ft-work-chip ft-working">Trabalha</span>
          <span className="ft-work-chip ft-resting">Folga</span>
          <span className="ft-work-chip ft-holiday-work">Trabalha · feriado</span>
          <span className="ft-work-chip ft-holiday-rest">Folga · feriado</span>
          <HelpBubble label="Legenda da escala" description="Sábado todos trabalham. Domingos são alternados. Os demais descansos são em dias úteis não consecutivos. No feriado, o trabalhador pode estar escalado ou em folga; as obrigações de compensação dependem da legislação e acordo aplicável."/>
        </div>
        <div className="ft-scroll-table ft-roster" role="region" aria-label="Escala individual semanal" tabIndex={0}>
          <table className="ft-table"><thead><tr><th>Colaborador</th><th>Grupo</th>
            {daysWeek.map((d,i)=><th key={d}>{DAYS[i]}<small>{dBR(d).slice(0,5)}</small></th>)}
            <th>Horas/semana</th><th>Domingos livres/4</th></tr></thead>
            <tbody>{staff.map(p=>{
              const w=p.weeks[week]!;
              return <tr key={p.employee.id}>
                <td><b>{p.employee.name}</b><small>{p.employee.id}{p.employee.hired?" · Reforço proposto":""}</small></td>
                <td>{p.employee.group}</td>
                {daysWeek.map(day=>{
                  const works=w.workingDates.includes(day);
                  const holiday=sources.schedule.rules.holidays.includes(day);
                  return <td key={day}><span className={"ft-work-chip "+(holiday?(works?"ft-holiday-work":"ft-holiday-rest"):(works?"ft-working":"ft-resting"))}
                    title={holiday?(works?"Trabalho no feriado: validar regras coletivas.":"Folga coincidente com feriado; evitar folga adjacente."):(works?"Trabalha no dia previsto.":"Folga semanal prevista, sem dia consecutivo.")}>
                    {holiday?(works?"Feriado · trabalha":"Feriado · folga"):(works?"Trabalha":"Folga")}</span></td>;
                })}
                <td className={w.overWeeklyLimit?"ft-danger":""}><b>{minutes(w.hours)}</b></td>
                <td>{p.sundaysOff}</td></tr>;
            })}</tbody></table>
        </div>
        <div className="ft-note"><CalendarDays size={16}/> Em cada uma das quatro semanas, cada colaborador possui cinco jornadas e duas folgas não consecutivas. Sábado é sempre dia escalado e domingo alterna trabalho e descanso. Feriados não geram uma terceira folga automática; consultar regras de compensação com RH. Nenhum reforço hipotético representa contratação realizada.</div>
      </section>}
      {tab==="orientacoes"&&<>
        <section className="ft-panel"><div className="ft-heading"><div>
          <p className="op-eyebrow">DA LEI À OPERAÇÃO</p><h2>Roteiro de transição segura</h2>
          <p>Um processo gradual, inspirado em boas práticas de implementação em redes de varejo.</p></div></div>
          <div className="ft-steps">{STEPS.map(item=><div key={item.n}><span>{item.n}</span>
            <div><b>{item.name}</b><p>{item.desc}</p></div></div>)}</div></section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">PRONTIDÃO DO PILOTO</p>
            <h2>Conferência antes de implantar</h2>
            <p>Marque os preparativos concluídos. Esta lista é temporária e não substitui as aprovações empresariais.</p></div>
            <span className="ft-pill">{pilotChecks.length} de {STEPS.length} etapas conferidas</span>
          </div></div>
          <div className="ft-checklist">{STEPS.map(step=><label key={step.n}>
            <input type="checkbox" checked={pilotChecks.includes(step.n)}
              onChange={e=>setPilotChecks(prev=>e.target.checked?[...prev,step.n]:prev.filter(x=>x!==step.n))}/>
            <span><b>{step.n} · {step.name}</b><small>{step.desc}</small></span>
          </label>)}</div>
          <div className="ft-note"><AlertTriangle size={16}/> Mesmo com todas as etapas assinaladas,
            o simulador não certifica cumprimento da legislação e não autoriza publicar escalas.</div>
        </section>
        <section className="ft-panel">
          <div className="ft-heading"><div><p className="op-eyebrow">MONITORAMENTO DO PROJETO-PILOTO</p>
            <h2>Indicadores para acompanhar a transição</h2>
            <p>Métricas e sinais de atenção recomendados, sem inventar valores de desempenho.</p></div></div>
          <div className="ft-scroll-table" role="region" aria-label="Indicadores de acompanhamento do piloto" tabIndex={0}>
            <table className="ft-table"><thead><tr><th>Indicador</th><th>Frequência</th><th>Sinal de atenção</th><th>Ação sugerida</th></tr></thead>
              <tbody>{PILOT_METRICS.map(item=><tr key={item.name}>
                <td><b>{item.name}</b></td><td>{item.cadence}</td><td>{item.signal}</td><td>{item.action}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="ft-note"><Info size={16}/> O quadro indica o que medir durante o piloto.
            São recomendações de gestão, não medições reais, nem dados extraídos de sistemas de vendas.</div>
        </section>
        <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">PERGUNTAS PRÁTICAS</p>
          <h2>O que o gerente precisa compreender</h2></div></div>
          <div className="ft-faq">{INSIGHTS.map(([q,a],i)=><div key={q}>
            <button type="button" aria-expanded={expanded===q} onClick={()=>setExpanded(v=>v===q?null:q)}>
              <b>{String(i+1).padStart(2,"0")} · {q}</b><ChevronDown size={16}/></button>
            {expanded===q&&<p>{a}</p>}</div>)}</div></section>
        <section className="ft-panel"><div className="ft-heading"><div><p className="op-eyebrow">REFERÊNCIAS VERIFICÁVEIS</p>
          <h2>Legislação e experiências do setor</h2></div></div>
          <div className="ft-sources">{SOURCES.map(s=><a href={s.url} key={s.title} target="_blank" rel="noopener noreferrer">
            <BookOpen size={17}/><span><b>{s.title}</b><small>{s.desc}</small></span><ArrowRight size={17}/></a>)}</div>
          <div className="ft-note">Supernosso: o piloto inicial preservou 44 horas em cinco dias, hipótese de 8h48
            que NÃO deve ser adotada automaticamente sob a nova EC 141/2026. Usamos o método de implantação gradual,
            não a distribuição de horas anterior.</div></section>
      </>}
      <div className="ft-bottom"><ShieldCheck size={15}/>
        Simulação isolada · não altera <b>Escala & trocas</b>, <b>Ponto simulado</b>, <b>Férias</b> ou <b>Banco de horas</b>.
        Resultados heurísticos não são garantia de cobertura ótima nem avaliação jurídica.</div>
    </>}
  </div>;
}
function LayoutIcon(){return <Workflow size={16}/>;}
