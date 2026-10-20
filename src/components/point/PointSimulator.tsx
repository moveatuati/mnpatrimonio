import { useEffect, useMemo, useRef, useState } from "react";
import { RULES } from "@/domain/config";
import {
  AlertTriangle, CalendarDays, Check, Clock3, Fingerprint, History, Info,
  Pencil, Play, RotateCcw, Search, ShieldCheck, Users, X,
} from "lucide-react";
import { GROUPS, GROUP_IDS, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { isValidReferenceDate } from "@/domain/operation-query";
import {
  EMPTY_POINT_STORE, MARKS, MARK_LABELS, analysePoint, clearPointDay, markPoint,
  nextMark, plannedMarks, pointKey, pointSummary, readPointStore, requiredMarks,
  seedPointDay, validTime, type Mark, type PointStore,
} from "@/domain/point-simulator";
import { DEFAULT_SCHEDULE, assignmentFor, reviseStore, type ScheduleStore } from "@/domain/schedule";
import type { Employee, GroupId } from "@/domain/types";
import "./PointSimulator.css";

const POINT_STORAGE = "formosa:augusto-montenegro:ponto-demo:v1";
const SCHEDULE_STORAGE = "formosa:augusto-montenegro:escala-demo:v1";
const REFERENCE_DATE = "2026-10-20";
function dateLabel(date: string) {
  const [y,m,d] = date.split("-");
  return d + "/" + m + "/" + y;
}
function timeLabel(time: string | undefined) { return time || "—"; }
function readSchedule(): ScheduleStore {
  try { const raw = window.localStorage.getItem(SCHEDULE_STORAGE); return raw ? reviseStore(JSON.parse(raw)) : DEFAULT_SCHEDULE; }
  catch { return DEFAULT_SCHEDULE; }
}
function markTone(status: string) {
  return status === "completo" ? "good" : status === "atenção" ? "warn" :
    status === "em andamento" ? "progress" : "muted";
}
function PunchField({ mark, current, planned, onEdit }: {
  mark: Mark; current?: string | undefined; planned?: string | undefined; onEdit: (mark: Mark) => void;
}) {
  return <div className={"fp-moment " + (current ? "fp-moment-filled" : "")}>
    <span>{MARK_LABELS[mark]}</span>
    <strong>{timeLabel(current)}</strong>
    <small>Previsto: {timeLabel(planned)}</small>
    {current && <button type="button" onClick={() => onEdit(mark)}
      aria-label={"Corrigir " + MARK_LABELS[mark]}><Pencil size={13}/> Corrigir</button>}
  </div>;
}

export function PointSimulator() {
  const [store, setStore] = useState<PointStore>(EMPTY_POINT_STORE);
  const [schedule, setSchedule] = useState<ScheduleStore>(DEFAULT_SCHEDULE);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(REFERENCE_DATE);
  const [employeeId, setEmployeeId] = useState("FM-001");
  const [time, setTime] = useState("07:00");
  const [correction, setCorrection] = useState<Mark | null>(null);
  const [reason, setReason] = useState("");
  const [group, setGroup] = useState<"all" | GroupId>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [clock, setClock] = useState("--:--");
  const [showHistory, setShowHistory] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(POINT_STORAGE);
      if (raw) setStore(readPointStore(JSON.parse(raw)));
      else setStore({...EMPTY_POINT_STORE, alertMinutes:RULES.lateAlertMinutes});
    } catch { /* apenas demonstração local */ }
    setSchedule(readSchedule());
    setReady(true);
    const tick = () => setClock(new Date().toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}));
    tick();
    const interval = window.setInterval(tick, 30000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SCHEDULE_STORAGE) setSchedule(readSchedule());
    };
    window.addEventListener("storage", onStorage);
    return () => { window.clearInterval(interval); window.removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(POINT_STORAGE, JSON.stringify(store)); }
    catch { setFeedback("O navegador não permitiu salvar os registros; as alterações valem apenas nesta sessão."); }
  }, [store, ready]);
  const employee = DEMO_EMPLOYEES.find(item => item.id === employeeId) ?? DEMO_EMPLOYEES[0]!;
  const row = store.records[pointKey(date, employee.id)];
  const analysis = analysePoint(schedule, store, employee, date);
  const next = nextMark(schedule, employee, date, row);
  const operation: Mark | null = correction || next;
  const expected = plannedMarks(schedule, employee, date);
  const plannedShift = assignmentFor(schedule, employee, date);
  const summary = useMemo(() => pointSummary(schedule, store, date), [schedule, store, date]);
  const roster = useMemo(() => DEMO_EMPLOYEES.map(person => ({
    employee: person, ...analysePoint(schedule, store, person, date),
  })), [schedule,store,date]);
  const filtered = roster.filter(item => {
    if (group !== "all" && item.employee.group !== group) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return (item.employee.name + " " + item.employee.id).toLocaleLowerCase("pt-BR")
      .includes(query.trim().toLocaleLowerCase("pt-BR"));
  });
  const logs = [...store.history].filter(log => log.date === date).reverse();
  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [date, group, statusFilter, query]);
  useEffect(() => {
    const target = plannedMarks(schedule, employee, date);
    const day = store.records[pointKey(date, employee.id)];
    const upcoming = nextMark(schedule, employee, date, day);
    const active = correction || upcoming;
    setTime(active ? (correction ? day?.marks[correction] : target[active]) || "" : "");
  }, [schedule, store, employee, date, correction]);
  const setDateSafe = (value: string) => {
    if (!isValidReferenceDate(value)) return;
    setDate(value); setCorrection(null); setReason(""); setFeedback("");
  };
  function register() {
    if (!ready || !operation) return;
    const result = markPoint(store, schedule, employee, date, operation, time, {
      correctionReason: reason, recordedAt: new Date().toISOString(),
    });
    if (!result.ok) { setFeedback(result.error); return; }
    setStore(result.store);
    setFeedback((correction ? "Correção" : "Marcação") + " demonstrativa registrada: " +
      MARK_LABELS[operation] + " às " + time + " para " + employee.name + ".");
    setCorrection(null); setReason("");
  }
  function generate() {
    if (!window.confirm("Gerar marcações fictícias para os colaboradores escalados nesta data? Registros anteriores serão preservados.")) return;
    const result = seedPointDay(store, schedule, date);
    setStore(result);
    setFeedback(result === store ? "Todos os funcionários desta data já têm registros, ou estão de folga." :
      "Amostra fictícia gerada. Você pode corrigir qualquer marcação com justificativa.");
  }
  function resetDay() {
    if (!window.confirm("Excluir apenas as marcações fictícias da data escolhida? A ação não pode ser desfeita.")) return;
    setStore(prev => clearPointDay(prev, date));
    setCorrection(null); setReason("");
    setFeedback("Registros da data removidos da demonstração. Histórico local preservado.");
  }
  function selectPerson(id: string) {
    setEmployeeId(id); setCorrection(null); setReason("");
    setFeedback("");
  }
  function editPerson(id: string) {
    selectPerson(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <div className="fp-app formosa-operation">
    <header className="fp-head">
      <div><p className="op-eyebrow">Formosa · Gestão de Pessoas · {UNIT.unit}</p>
        <h1>Ponto <span>simulado.</span></h1>
        <p>Registre quatro marcações fictícias, confira desvios e acompanhe o movimento do dia.</p>
      </div>
      <div className="fp-head-tools">
        <div className="fp-live"><Clock3 size={17}/><div><span>Relógio do dispositivo</span><strong>{clock}</strong></div></div>
        <label className="fp-date"><CalendarDays size={17}/><span>Data de referência</span>
          <input type="date" value={date} aria-label="Data do ponto" onChange={e => setDateSafe(e.target.value)} />
        </label>
      </div>
    </header>
    <div className="fp-demo"><ShieldCheck size={17}/><div><strong>DEMONSTRAÇÃO — SEM REGISTRO OFICIAL DE PONTO.</strong>
      Dados fictícios, sem conexão com o relógio físico ou banco de dados. O histórico é local ao navegador.
      Os horários de escala são consultados, mas a Visão da operação mantém seu gerador fictício independente.</div></div>
    {feedback && <div className="fp-feedback" role="status"><Info size={16}/><span>{feedback}</span>
      <button type="button" onClick={() => setFeedback("")} aria-label="Fechar aviso"><X size={15}/></button></div>}
    <section className="fp-stats" aria-label="Indicadores do ponto simulado">
      <div className="fp-stat"><span><Users size={16}/> Escalados</span><strong>{summary.planned}</strong><small>Previsão da escala</small></div>
      <div className="fp-stat"><span><Fingerprint size={16}/> Com entrada</span><strong>{summary.started}</strong><small>Marcações demonstrativas</small></div>
      <div className="fp-stat"><span><Check size={16}/> Ciclos completos</span><strong>{summary.completed}</strong><small>Marcações previstas concluídas</small></div>
      <div className="fp-stat"><span><AlertTriangle size={16}/> Atenção</span><strong>{summary.attention}</strong><small>Atraso ou saída antecipada</small></div>
    </section>
    <div className="fp-workspace">
      <section className="fp-panel fp-clock-panel" aria-label="Relógio de ponto simulado">
        <div className="fp-panel-head"><div><p className="op-eyebrow">RELÓGIO DEMONSTRATIVO</p>
          <h2>Marcação individual</h2><p>Escolha um colaborador e registre cada etapa do turno.</p></div>
          <span className="fp-chip">{UNIT.unit}</span>
        </div>
        <div className="fp-clock-content">
          <label className="fp-field"><span>Colaborador</span>
            <select aria-label="Selecionar colaborador" value={employeeId} onChange={e => selectPerson(e.target.value)}>
              {DEMO_EMPLOYEES.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id} · Grupo {item.group}</option>)}
            </select></label>
          <div className="fp-worker">
            <div className="fp-avatar">{employee.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
            <div><strong>{employee.name}</strong><small>{employee.id} · Grupo {employee.group}
              {plannedShift ? " · Turno " + plannedShift : " · Folga na escala"}</small></div>
          </div>
          <div className="fp-moments">
            {MARKS.map(mark => <PunchField key={mark} mark={mark} current={analysis.marks[mark]}
              planned={expected[mark]} onEdit={type => { setCorrection(type); setReason(""); }}/>)}
          </div>
          {analysis.required.length === 2 && <p className="fp-special">
            Turno especial: a escala fornece apenas entrada e saída final. Intervalo ainda não foi configurado pelo RH.</p>}
          {analysis.required.length === 0 && <p className="fp-special">Colaborador de folga ou sem turno previsto nesta data. Não há marcação disponível.</p>}
          <div className="fp-clock-action">
            <div className="fp-active-step"><span>{correction ? "Corrigir marcação" : "Próxima marcação"}</span>
              <strong>{operation ? MARK_LABELS[operation] : "Ciclo encerrado"}</strong></div>
            {correction && <button className="fp-cancel" type="button"
              onClick={() => { setCorrection(null);setReason(""); }}>Cancelar correção</button>}
            <div className="fp-time-controls">
              <label className="fp-field"><span>Horário a registrar</span>
                <input type="time" aria-label="Horário da marcação" value={time} onChange={e => setTime(e.target.value)}/>
              </label>
              <button type="button" className="fp-soft" onClick={()=>setTime(clock)}
                disabled={!operation||clock==="--:--"}>Usar hora atual</button>
            </div>
            {correction && <label className="fp-field"><span>Justificativa da correção (obrigatória)</span>
              <input type="text" value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Por que o horário foi corrigido?" maxLength={220}/></label>}
            <button type="button" className="fp-primary fp-record" disabled={!ready || !operation ||
              !validTime(time) || (Boolean(correction) && reason.trim().length < 8)}
              onClick={register}><Fingerprint size={19}/>
                {correction ? "Salvar correção" : "Registrar marcação simulada"}
            </button>
            <p className="fp-hint"><Info size={14}/> A hora sugerida é a prevista na escala.
              É possível informar outro horário para testar atrasos, intervalos e saídas antecipadas.</p>
          </div>
        </div>
      </section>
      <section className="fp-panel fp-monitor-panel">
        <div className="fp-panel-head"><div><p className="op-eyebrow">PREVISTO × REGISTRADO</p>
          <h2>Monitoramento da data</h2><p>Comparação com os turnos cadastrados na Escala & trocas.</p></div>
          <span className="fp-chip">{dateLabel(date)}</span></div>
        <div className="fp-checks">
          <div><span>Escalados sem entrada</span><strong>{summary.unregistered}</strong></div>
          <div><span>Marcações em andamento</span><strong>{summary.started - summary.completed}</strong></div>
          <div><span>Alertas acima do limite</span><strong>{summary.attention}</strong></div>
        </div>
        <div className="fp-monitor-explain">
          <h3><ShieldCheck size={16}/> Como o ponto é conferido</h3>
          <p><b>Entrada:</b> atraso acima do parâmetro configurado gera alerta operacional.</p>
          <p><b>Intervalo:</b> saída e retorno seguem ordem cronológica. O sistema não considera intervalo fictício para os turnos especiais.</p>
          <p><b>Saída:</b> antes do previsto gera atenção. Sem marcação, não significa falta confirmada.</p>
        </div>
        <p className="fp-explain"><Info size={15}/> Alerta operacional: <b>{store.alertMinutes} minutos</b>.
          Para mudar esse limite de forma integrada, acesse <a href="/regras">Regras & histórico</a>.
          As marcações existentes são preservadas.</p>
        <div className="fp-tools">
          <button className="fp-outline" type="button" onClick={generate} disabled={!ready}><Play size={15}/> Gerar amostra do dia</button>
          <button className="fp-outline fp-danger" type="button" onClick={resetDay} disabled={!ready}><RotateCcw size={15}/> Limpar data</button>
        </div>
        <p className="fp-explain"><AlertTriangle size={15}/> A amostra usa nomes e horários fictícios e preserva marcações já feitas. Não substitui espelho de ponto oficial.</p>
      </section>
    </div>
    <section className="fp-panel fp-table-panel" aria-label="Consulta de marcações simuladas">
      <div className="fp-panel-head"><div><p className="op-eyebrow">CONSULTA DA EQUIPE</p><h2>Registros do dia</h2>
        <p>Os 63 colaboradores permanecem disponíveis com cabeçalho fixo e rolagem vertical.</p></div>
        <span className="fp-chip">{filtered.length} resultado(s)</span></div>
      <div className="fp-filters">
        <label className="fp-search"><Search size={16}/><input aria-label="Buscar nome ou matrícula" value={query}
          placeholder="Buscar nome ou matrícula" onChange={e=>setQuery(e.target.value)}/></label>
        <select aria-label="Filtrar grupo" value={group} onChange={e=>setGroup(e.target.value as "all"|GroupId)}>
          <option value="all">Todos os grupos</option>{GROUP_IDS.map(id=><option key={id} value={id}>Grupo {id} · {GROUPS[id].name}</option>)}
        </select>
        <select aria-label="Filtrar situação" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">Todas as situações</option>
          <option value="sem registro">Sem registro</option><option value="em andamento">Em andamento</option>
          <option value="completo">Completo</option><option value="atenção">Atenção</option><option value="folga">Folga</option>
        </select>
      </div>
      <div className="fp-table-scroll" role="region" aria-label="Tabela com rolagem vertical do ponto simulado"
        ref={tableRef} tabIndex={0}>
        <table className="fp-table">
          <thead><tr><th>Colaborador</th><th>Grupo</th><th>Previsto</th><th>Entrada</th>
            <th>Saída intervalo</th><th>Retorno</th><th>Saída final</th><th>Situação</th><th>Ação</th></tr></thead>
          <tbody>
            {filtered.map(item=><tr key={item.employee.id}>
              <td><strong>{item.employee.name}</strong><small>{item.employee.id}</small></td>
              <td>{item.employee.group}</td>
              <td className="fp-tabular">{timeLabel(item.planned.entry)}–{timeLabel(item.planned.exit)}</td>
              {MARKS.map(mark=><td key={mark} className="fp-tabular">{timeLabel(item.marks[mark])}</td>)}
              <td><span className={"fp-status fp-status-"+markTone(item.status)}>{item.status}</span>
                {item.late!==null&&item.late>store.alertMinutes&&<small className="fp-attention">+{item.late} min entrada</small>}
                {item.earlyExit!==null&&item.earlyExit>0&&<small className="fp-attention">{item.earlyExit} min saída antecipada</small>}
              </td>
              <td><button className="fp-row-action" type="button"
                onClick={()=>editPerson(item.employee.id)}>Abrir relógio</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!filtered.length&&<p className="fp-empty">Nenhum colaborador corresponde aos filtros.</p>}
      <div className="fp-table-foot"><span>{filtered.length} colaboradores na lista · rolagem vertical sem paginação</span>
        <span>Dados exclusivamente demonstrativos</span></div>
    </section>
    <section className="fp-panel fp-history">
      <div className="fp-panel-head"><div><p className="op-eyebrow">HISTÓRICO DA SIMULAÇÃO</p>
        <h2>Movimentações de {dateLabel(date)}</h2><p>Registros locais de lançamentos, correções e amostras.</p></div>
        <button type="button" className="fp-outline" aria-expanded={showHistory}
          onClick={()=>setShowHistory(prev=>!prev)}><History size={15}/>{showHistory?"Ocultar histórico":"Mostrar histórico"} ({logs.length})</button>
      </div>
      {showHistory&&<div className="fp-history-list">{!logs.length?<p className="fp-empty">Nenhuma marcação realizada nesta data.</p>:
        logs.map(log=><div key={log.id}>
          <span>{new Date(log.recordedAt).toLocaleString("pt-BR")}</span>
          <strong>{log.description}</strong><small>{log.action} · demonstração local</small>
        </div>)}</div>}
    </section>
  </div>;
}
