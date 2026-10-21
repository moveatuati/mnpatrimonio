import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, Info, RotateCcw, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { ABSENCE_STORAGE_KEY, restoreAbsences } from "@/domain/absences";
import { HOUR_KEY, restoreHours } from "@/domain/hour-bank";
import { readPointStore } from "@/domain/point-simulator";
import { BANK_RULES, GROUPS, GROUP_IDS, LABOR_LAW, RULES, SERVICE_SHIFTS } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { SCHEDULE_STORAGE_KEY } from "@/domain/absences";
import { DEFAULT_SCHEDULE, reviseStore, type ScheduleStore } from "@/domain/schedule";
import type { GroupId } from "@/domain/types";
import { RH_POINT_KEY, RH_SETTINGS_EVENT, SHIFT_KEYS, SHIFT_KEY_LABEL, defaultRhSettings, describeChanges, readRhSettingsStore,
  saveRhSettings, validateRhSettings, type RhSettings, type ShiftKey } from "@/domain/rh-settings";
import "./RulesWorkspace.css";

const SCHEDULE_KEY=SCHEDULE_STORAGE_KEY;
const groupSize=(g:GroupId)=>DEMO_EMPLOYEES.filter(e=>e.group===g&&e.status==="ativo").length;
const br=(d:string)=>d.split("-").reverse().join("/");
const number=(x:number)=>x.toLocaleString("pt-BR");
const dateLabel=(d:string)=>d.split("-").reverse().join("/");
const initialSchedule=():ScheduleStore=>DEFAULT_SCHEDULE;
function readSchedule():ScheduleStore{
  try{
    const raw=window.localStorage.getItem(SCHEDULE_KEY);
    return raw?reviseStore(JSON.parse(raw)):DEFAULT_SCHEDULE;
  }catch{return DEFAULT_SCHEDULE;}
}
function validDate(x:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
  const d=new Date(x+"T12:00:00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;
}
type Kind="daily"|"sunday"|"holiday";
const menu=["Horários regulares","Vagas, domingos e feriados","Parâmetros e histórico"] as const;
type Pane=typeof menu[number];
type HistoryView={id:string;date:string;who:string;details:string;source:string};
function readConnectedHistory():HistoryView[]{
  const rows:HistoryView[]=[];
  try {
    const raw=window.localStorage.getItem(ABSENCE_STORAGE_KEY);
    if(raw) for(const h of restoreAbsences(JSON.parse(raw)).history)
      rows.push({id:h.id,date:h.occurredAt,who:h.actor,details:h.description,source:"Férias e afastamentos"});
  }catch{/* não interferir na central por arquivo local inválido */}
  try {
    const raw=window.localStorage.getItem(HOUR_KEY);
    if(raw) for(const h of restoreHours(JSON.parse(raw)).history)
      rows.push({id:h.id,date:h.at,who:h.actor,details:h.detail,source:"Banco de horas"});
  }catch{/* não interferir na central por arquivo local inválido */}
  try {
    const raw=window.localStorage.getItem(RH_POINT_KEY);
    if(raw) for(const h of readPointStore(JSON.parse(raw)).history)
      rows.push({id:h.id,date:h.recordedAt,who:"Operação demonstrativa",details:h.description,source:"Ponto simulado"});
  }catch{/* não interferir na central por arquivo local inválido */}
  return rows;
}

export function RulesWorkspace(){
  const [draft,setDraft]=useState<RhSettings>(defaultRhSettings);
  const [schedule,setSchedule]=useState<ScheduleStore>(initialSchedule);
  const [pane,setPane]=useState<Pane>("Horários regulares");
  const [actor,setActor]=useState("Gestão demonstrativa");
  const [note,setNote]=useState("");
  const [holiday,setHoliday]=useState("");
  const [feedback,setFeedback]=useState("");
  const [historyFilter,setHistoryFilter]=useState("");
  const [stored,setStored]=useState(readRhSettingsStore);
  const [connectedHistory,setConnectedHistory]=useState<HistoryView[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const value=readRhSettingsStore();
    setDraft(value.settings);setStored(value);setSchedule(readSchedule());
    setConnectedHistory(readConnectedHistory());setLoaded(true);
  },[]);
  const changed=describeChanges(stored.settings,draft);
  const scheduleChanged=JSON.stringify(schedule.rules)!==JSON.stringify(readScheduleSafeOriginal());
  function readScheduleSafeOriginal(){
    // Apenas leitura da origem persistida; nenhuma gravação durante renderização.
    if(typeof window==="undefined")return DEFAULT_SCHEDULE.rules;
    return readSchedule().rules;
  }
  const errors=useMemo(()=>validateRhSettings(draft),[draft]);
  const history=useMemo(()=>{
    const rules=stored.history.map(h=>({id:h.id,date:h.at,who:h.actor,details:h.changes.join(" · "),source:"Central de regras"}));
    const scheduleEvents=schedule.history.map(h=>({id:h.id,date:h.createdAt,who:h.actor,details:h.detail,source:"Escalas e feriados"}));
    const filter=historyFilter.trim().toLocaleLowerCase("pt-BR");
    return [...rules,...scheduleEvents,...connectedHistory]
      .filter(h=>!filter||(h.details+" "+h.who+" "+h.date+" "+h.source).toLocaleLowerCase("pt-BR").includes(filter))
      .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,250);
  },[stored.history,schedule.history,connectedHistory,historyFilter]);
  const shiftField=(g:ShiftKey,field:"start"|"breakStart"|"breakEnd"|"end",value:string)=>{
    setDraft(prev=>({...prev,shifts:{...prev.shifts,[g]:{...prev.shifts[g],[field]:value}}}));
    setFeedback("");
  };
  const setTarget=(kind:Kind,g:GroupId,value:number)=>{
    if(!Number.isFinite(value))return;
    const n=Math.max(0,Math.min(groupSize(g),Math.trunc(value)));
    setSchedule(prev=>({...prev,rules:{...prev.rules,[kind]:{...prev.rules[kind],[g]:n}}}));
    setFeedback("");
  };
  const setHolidayTarget=(date:string,g:GroupId,value:number)=>{
    if(!Number.isFinite(value))return;
    const n=Math.max(0,Math.min(groupSize(g),Math.trunc(value)));
    setSchedule(prev=>({...prev,rules:{...prev.rules,holidayByDate:{
      ...prev.rules.holidayByDate,[date]:{...(prev.rules.holidayByDate[date]??prev.rules.holiday),[g]:n},
    }}}));
    setFeedback("");
  };
  const addHoliday=()=>{
    if(!validDate(holiday)){setFeedback("Informe uma data de feriado válida.");return;}
    if(!schedule.rules.holidays.includes(holiday) && schedule.rules.holidays.length>=70){
      setFeedback("O calendário demonstra até 70 datas de feriado.");return;
    }
    setSchedule(prev=>({...prev,rules:{...prev.rules,holidays:[...new Set([...prev.rules.holidays,holiday])].sort()}}));
    setHoliday("");setFeedback("");
  };
  const removeHoliday=(date:string)=>{
    setSchedule(prev=>{
      const byDate={...prev.rules.holidayByDate};delete byDate[date];
      return {...prev,rules:{...prev.rules,holidays:prev.rules.holidays.filter(x=>x!==date),holidayByDate:byDate}};
    });
    setFeedback("");
  };
  const save=()=>{
    if(errors.length){setFeedback(errors.join(" "));return;}
    if(!changed.length&&!scheduleChanged){setFeedback("Nenhuma alteração para salvar.");return;}
    const reason=note.trim();
    if(!reason || reason.length<5){setFeedback("Informe uma justificativa com pelo menos 5 caracteres para o histórico.");return;}
    // Usar a versão mais recente das trocas e aprovações; alterar somente as regras.
    const latest=readSchedule();
    const old=latest.rules;
    const diffs:string[]=[];
    for(const kind of ["daily","sunday","holiday"] as const)for(const g of GROUP_IDS){
      if(old[kind][g]!==schedule.rules[kind][g])
        diffs.push((kind==="daily"?"Dia útil":kind==="sunday"?"Domingo":"Feriado")+" · "+GROUPS[g].name+": "+old[kind][g]+" → "+schedule.rules[kind][g]);
    }
    for(const date of [...new Set([...old.holidays,...schedule.rules.holidays])]){
      if(old.holidays.includes(date)!==schedule.rules.holidays.includes(date))
        diffs.push("Feriado "+date+": "+(schedule.rules.holidays.includes(date)?"incluído":"removido"));
      if(schedule.rules.holidays.includes(date))for(const g of GROUP_IDS){
        const oldN=(old.holidayByDate[date]??old.holiday)[g];
        const newN=(schedule.rules.holidayByDate[date]??schedule.rules.holiday)[g];
        if(oldN!==newN)diffs.push("Feriado "+date+" / "+GROUPS[g].name+": "+oldN+" → "+newN);
      }
    }
    if(!changed.length&&!diffs.length){setFeedback("Não há diferenças em relação às configurações salvas.");return;}
    const now=new Date().toISOString();
    const stamp={id:now+"-rules",date:now.slice(0,10),actor:actor.trim().slice(0,80)||"Gestão demonstrativa",
      detail:"Central de regras: "+diffs.join("; ")+" · Motivo: "+reason.slice(0,250),createdAt:now};
    if(diffs.length){
      const next:ScheduleStore={...latest,rules:schedule.rules,
        history:[...latest.history,stamp].slice(-350)};
      try{window.localStorage.setItem(SCHEDULE_KEY,JSON.stringify(next));}
      catch{setFeedback("O navegador não permitiu salvar as regras da escala; nenhuma outra alteração foi aplicada.");return;}
      setSchedule(next);
    }
    if(changed.length){
      const result=saveRhSettings(draft,actor,reason);
      if(!result.ok){setFeedback(result.error);return;}
      setStored(result.store);
    }
    if(!changed.length)window.dispatchEvent(new Event(RH_SETTINGS_EVENT));
    setNote("");setFeedback("Configurações salvas. As demais abas usarão os novos parâmetros ao abrir ou atualizar.");
  };
  return <>
    <PageHeader title="Regras & histórico" subtitle="Central de parâmetros, políticas operacionais e rastreabilidade das alterações do RH."/>
    <main className="rh-config">
      <section className="rh-hero">
        <div><p className="rh-eyebrow">MN PATRIMÔNIOS · PORTARIA E SERVIÇOS GERAIS</p>
          <h2>Central de regras da operação</h2>
          <p>Configure horários, intervalos, limites e vagas em um só lugar. Os módulos de Escala, Ponto, Dashboard, Férias, Banco de horas, Relatórios e Simulador consultam essas referências.</p></div>
        <div className="rh-hero-count"><span>Equipe de referência</span><strong>{DEMO_EMPLOYEES.length}</strong><small>{groupSize("P")} portaria 12×36 · {groupSize("S")} serviços gerais</small></div>
      </section>
      <div className="rh-rule-banner"><ShieldCheck size={20}/>
        <div><b>Proteções que não podem ser desativadas pelo painel</b>
          <p>Descanso entre jornadas nunca inferior a 11 horas (art. 66 da CLT) e 36h após o plantão da 12×36 (art. 59-A); no máximo {RULES.maxConsecutiveDays6x1} dias seguidos no 6×1 e {RULES.maxConsecutiveDays5x2} na 5×2; histórico de ponto não pode ser adulterado. Alterações continuam demonstrativas e exigem validação do RH e da convenção coletiva.</p></div></div>
      <nav className="rh-nav" aria-label="Categorias das regras">{menu.map((item,i)=><button key={item} type="button" className={pane===item?"rh-active":""} onClick={()=>setPane(item)}>
        {i===0?<Clock3 size={16}/>:i===1?<CalendarDays size={16}/>:<SlidersHorizontal size={16}/>} {item}</button>)}</nav>
      {!loaded&&<p className="rh-notice">Carregando parâmetros demonstrativos...</p>}
      {pane==="Horários regulares"&&<section className="rh-panel">
        <div className="rh-panel-header"><div><p className="rh-eyebrow">PORTARIA 12×36 · SERVIÇOS GERAIS 6×1</p><h3>Jornadas e intervalos de trabalho</h3><p>A portaria trabalha 12h e descansa 36h (turmas diurna e noturna). Os serviços gerais fazem 6×1 de 44h até a transição para a 5×2. O intervalo não conta como tempo de trabalho.</p></div></div>
        <div className="rh-shift-grid">{SHIFT_KEYS.map(g=><div key={g} className="rh-shift-card">
          <div className="rh-shift-name"><b>{SHIFT_KEY_LABEL[g]}</b><span>{g==="servicos"?groupSize("S")+" pessoas":DEMO_EMPLOYEES.filter(e=>e.group==="P"&&(g==="portariaNoturno")===(e.turn==="noturno")).length+" agentes"}</span></div>
          <div className="rh-fields">{(["start","breakStart","breakEnd","end"] as const).map((key,i)=><label key={key}>
            <span>{["Entrada","Saída intervalo","Retorno intervalo","Saída final"][i]}</span>
            <input aria-label={SHIFT_KEY_LABEL[g]+" "+key} type="time" value={draft.shifts[g][key]}
              onChange={e=>shiftField(g,key,e.target.value)}/></label>)}</div>
          <p>{g==="portariaNoturno"?"Atravessa a meia-noite. Das 22h às 5h: adicional noturno de 20% e hora de 52min30s (art. 73 da CLT).":g==="servicos"?"Segunda a sábado, 7h20 líquidas = 44h semanais. Domingo é o descanso semanal (Lei 605/1949).":"12 horas seguidas com 1h de intervalo (observado ou indenizado, art. 59-A)."}</p>
        </div>)}</div>
        <div className="rh-immutable"><CalendarDays size={17}/><p><b>Transição legal ({LABOR_LAW.amendment}):</b> a partir de {br(LABOR_LAW.fiveTwoStart)} os serviços gerais passam para 5×2 com {SERVICE_SHIFTS["5x2-42h"].label.split("·")[1]?.trim()} e, a partir de {br(LABOR_LAW.fortyHoursStart)}, {SERVICE_SHIFTS["5x2-40h"].label.split("·")[1]?.trim()}. A escala muda sozinha nessas datas. A 6×1 só pode continuar com convenção ou acordo coletivo.</p></div>
        <p className="rh-footnote"><Info size={16}/> Os cadastros fictícios permanecem fixos na demonstração. Mudar horários não contrata, transfere nem troca automaticamente colaboradores.</p>
      </section>}
      {pane==="Vagas, domingos e feriados"&&<>
        <section className="rh-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">VAGAS POR DIA</p><h3>Dia útil, domingo e feriado</h3><p>Portaria: agentes por dia somando diurno e noturno (a 12×36 cobre o domingo e o feriado normalmente). Serviços gerais: 0 no domingo = todos descansam.</p></div></div>
          <div className="rh-target-grid">{(["daily","sunday","holiday"] as const).map(kind=><div key={kind}>
            <h4>{kind==="daily"?"Vagas em dia útil":kind==="sunday"?"Vagas no domingo":"Equipe-padrão nos feriados"}</h4>
            <div className="rh-fields">{GROUP_IDS.map(g=><label key={g}><span>{GROUPS[g].name}</span>
              <input aria-label={kind+" "+GROUPS[g].name} type="number" min={0} max={groupSize(g)}
                value={schedule.rules[kind][g]} onChange={e=>setTarget(kind,g,Number(e.target.value))}/>
              <small>Máximo: {groupSize(g)}</small></label>)}</div>
          </div>)}</div>
          <p className="rh-footnote"><AlertTriangle size={16}/> Serviços gerais escalados no domingo recebem a folga antecipada (mesma semana) e a folga do 7º dia (semana seguinte). Domingo trabalhado sem folga compensatória é pago em dobro.</p>
        </section>
        <section className="rh-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">CALENDÁRIO OPERACIONAL</p><h3>Feriados cadastrados</h3><p>Altere o efetivo de datas especiais, sem criar folgas adicionais ou mexer em registros de ponto. Na 12×36 o feriado já está compensado (art. 59-A, parágrafo único).</p></div></div>
          <div className="rh-holiday-add"><label><span>Data do feriado</span><input type="date" aria-label="Data do novo feriado" value={holiday} onChange={e=>setHoliday(e.target.value)}/></label>
            <button type="button" className="rh-outline" onClick={addHoliday}>Adicionar feriado</button></div>
          <div className="rh-holiday-list">{schedule.rules.holidays.length===0&&<p>Não há feriados cadastrados nesta demonstração.</p>}
            {schedule.rules.holidays.map(day=><div key={day} className="rh-holiday-row"><b>{dateLabel(day)}</b>
              {GROUP_IDS.map(g=><label key={g}><span>{GROUPS[g].name}</span><input type="number" min={0} max={groupSize(g)}
                aria-label={"Feriado "+day+" "+GROUPS[g].name} value={(schedule.rules.holidayByDate[day]??schedule.rules.holiday)[g]}
                onChange={e=>setHolidayTarget(day,g,Number(e.target.value))}/></label>)}
              <button type="button" className="rh-remove" onClick={()=>removeHoliday(day)}>Excluir data</button>
            </div>)}</div>
        </section>
      </>}
      {pane==="Parâmetros e histórico"&&<>
        <section className="rh-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">PONTO ELETRÔNICO E BANCO DE HORAS</p><h3>Como o saldo é calculado</h3><p>Regras usadas em todas as telas (art. 58 e 59 da CLT; Portaria MTP 671/2021).</p></div></div>
          <div className="rh-policy-grid" style={{padding:16,display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",fontSize:14}}>
            <div><b>🖐️ Ponto eletrônico</b><p>REP-C, REP-A ou REP-P (Portaria MTP 671/2021): entrada, intervalo e saída. Turno noturno conta no mesmo plantão.</p></div>
            <div><b>⏱️ Crédito no banco</b><p>Minutos após o horário de saída (acima de {BANK_RULES.creditToleranceMinutes} min por marcação, máx. 10 min/dia, art. 58, § 1º) viram crédito.</p></div>
            <div><b>🟡 Planejar folga</b><p>A partir de {BANK_RULES.attentionMinutes/60}h acumuladas.</p></div>
            <div><b>🔴 Dar folga</b><p>Com 1 jornada acumulada: folga de compensação (7h20 nos serviços gerais 6×1; 11h na portaria 12×36).</p></div>
            <div><b>📅 Prazo</b><p>Compensar em até {BANK_RULES.compensationMonths} meses (acordo individual escrito) ou 12 meses (acordo/convenção coletiva). Vencido o prazo, vira hora extra paga.</p></div>
            <div><b>🩺 Saída antecipada / entrada tarde</b><p>Usa o saldo do banco. Sem saldo, fica pendente para o RH.</p></div>
          </div>
        </section>
        <section className="rh-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">POLÍTICAS DE ACOMPANHAMENTO</p><h3>Alertas e descanso</h3><p>Parâmetros utilizados nos cálculos de ocorrências, relatórios, ponto e verificação de trocas.</p></div></div>
          <div className="rh-policy-grid">
            <label><span>Alerta operacional de atraso (minutos)</span><input type="number" aria-label="Alerta operacional em minutos" min={0} max={60}
              value={draft.lateAlertMinutes} onChange={e=>setDraft(prev=>({...prev,lateAlertMinutes:Number(e.target.value)}))}/>
              <small>0–60 min · sinaliza atenção, não altera tolerância legal ou marcações.</small></label>
            <label><span>Descanso mínimo entre jornadas (horas)</span><input type="number" aria-label="Descanso mínimo em horas" min={11} max={16}
              value={draft.minRestHours} onChange={e=>setDraft(prev=>({...prev,minRestHours:Number(e.target.value)}))}/>
              <small>11–16h · abaixo de 11h não é permitido no painel.</small></label>
          </div>
          <div className="rh-immutable"><ShieldCheck size={17}/><p>O descanso de 36h da 12×36, o limite de dias seguidos (6 no 6×1, 5 na 5×2) e a folga compensatória do domingo são regras fixas, não interruptores de flexibilização. Alterações de legislação e convenção coletiva dependem de revisão jurídica.</p></div>
        </section>
        <section className="rh-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">AUDITORIA DEMONSTRATIVA</p><h3>Histórico de decisões</h3><p>Consulta unificada dos históricos demonstrativos de regras, escalas, ponto, férias e banco de horas armazenados neste navegador.</p></div></div>
          <div className="rh-history-top"><label><span>Buscar evento</span><input aria-label="Pesquisar histórico de regras" placeholder="Data, gestor ou alteração" value={historyFilter}
              onChange={e=>setHistoryFilter(e.target.value)}/></label><strong>{number(history.length)} eventos exibidos</strong></div>
          <div className="rh-history">{!history.length&&<p>Não há eventos para este filtro.</p>}
            {history.map(h=><article key={h.source+h.id}><div><b>{h.source}</b><time>{h.date?new Date(h.date).toLocaleString("pt-BR"):"Data não informada"}</time></div>
              <strong>{h.who}</strong><p>{h.details}</p></article>)}</div>
        </section>
      </>}
      <section className="rh-panel rh-save-panel"><div className="rh-panel-header"><div><p className="rh-eyebrow">CONTROLE DE ALTERAÇÕES</p><h3>Revisar e salvar parâmetros</h3><p>As mudanças só entram em vigor após salvar. Nenhuma escala de funcionário é reescrita automaticamente.</p></div></div>
        <div className="rh-save-inner">
          {errors.length>0&&<div className="rh-error" role="alert"><AlertTriangle size={16}/>{errors.join(" ")}</div>}
          <div className="rh-snapshot"><span>{changed.length} alteração(ões) em horários/limites</span><span>{scheduleChanged?"Escalas especiais alteradas":"Escalas especiais sem modificações"}</span></div>
          {changed.length>0&&<div className="rh-changes">{changed.slice(0,12).map((v,i)=><p key={i}>{v}</p>)}{changed.length>12&&<small>+{changed.length-12} alterações</small>}</div>}
          <div className="rh-save-fields"><label><span>Responsável pela alteração</span><input aria-label="Responsável pela mudança" maxLength={80} value={actor} onChange={e=>setActor(e.target.value)}/></label>
            <label><span>Motivo obrigatório</span><input aria-label="Justificativa das novas regras" maxLength={250} placeholder="Ex.: adequação de horário aprovada em reunião" value={note} onChange={e=>setNote(e.target.value)}/></label></div>
          {feedback&&<p className="rh-notice" role="status">{feedback}</p>}
          <div className="rh-actions"><button type="button" className="rh-outline" onClick={()=>{setDraft(defaultRhSettings());setFeedback("Padrões de horários e limites carregados para revisão. Clique em salvar para registrar.");}}>
            <RotateCcw size={16}/> Restaurar padrões no rascunho</button>
            <button type="button" className="rh-save" disabled={!loaded||errors.length>0} onClick={save}><Save size={17}/> Salvar regras e registrar histórico</button></div>
          <p className="rh-disclaimer"><Info size={16}/> Configurações locais desta demonstração. Não sincroniza entre dispositivos nem concede aprovação legal; histórico do navegador não é trilha de auditoria oficial.</p>
        </div>
      </section>
    </main>
  </>;
}
