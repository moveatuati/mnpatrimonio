import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeftRight, CalendarDays, Check, ChevronLeft, ChevronRight,
  History, Info, Printer, RotateCcw, Search, Settings2,
  ShieldCheck, Users, X,
} from "lucide-react";
import { GROUPS, GROUP_IDS, RULES, SPECIAL_SLOT_LABEL, UNIT } from "@/domain/config";
import { movementPeriod } from "@/domain/movement";
import { PaperSheets } from "@/components/sheets/PaperSheets";
import { RestAuditPanel } from "./RestAuditPanel";
import { loadAbsences } from "@/lib/demo-storage";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { isValidReferenceDate } from "@/domain/operation-query";
import {
  DEFAULT_SCHEDULE, assignmentFor, coverageFor, dateOffset, dayOfWeek,
  hasPendingConflict, requestStillCurrent, restReason, reviseStore, scheduleForDate, slotLabel, startOfWeek,
  swapProposal, validateChanges, withChanges,
  type Assignment, type ScheduleStore,
} from "@/domain/schedule";
import type { GroupId } from "@/domain/types";
import "./ScheduleWorkspace.css";

const STORAGE_KEY = "formosa:augusto-montenegro:escala-demo:v1";
const REFERENCE_DATE = "2026-10-20";
const DAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

function prettyDate(value: string) {
  const [year, month, day] = value.split("-");
  return [day, month, year].join("/");
}
function employeeLabel(id: string) {
  const found = DEMO_EMPLOYEES.find(e => e.id === id);
  return found ? found.name + " · " + id + " · Grupo " + found.group : id;
}
const STAMP_ACTOR = "Gestão (demonstração)";
function stamp(date: string, detail: string) {
  return { id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    date, actor: STAMP_ACTOR, detail, createdAt: new Date().toISOString() };
}
function monthDay(date: string) { return DAYS[dayOfWeek(date)] + " " + date.slice(8, 10); }
function groupName(group: Assignment, date?: string) {
  if (!group) return "Folga";
  return date && dayOfWeek(date) === 0 ? SPECIAL_SLOT_LABEL[group] : "Grupo " + group + " — " + GROUPS[group].name;
}
function SelectEmployee({ value, onChange, label }: {
  value: string; onChange: (id: string) => void; label: string;
}) {
  return <label className="fs-field"><span>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Selecione colaborador</option>
      {DEMO_EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name} · {e.id} · {e.group}</option>)}
    </select>
  </label>;
}
function Notice({ items, positive }: { items: string[]; positive?: boolean | undefined }) {
  return <div className={"fs-notice " + (positive ? "fs-notice-good" : "fs-notice-bad")} role="status">
    {positive ? <Check size={15} /> : <AlertTriangle size={15} />}
    <div>{items.map((item, index) => <p key={index}>{item}</p>)}</div>
  </div>;
}

export function ScheduleWorkspace() {
  const [store, setStore] = useState<ScheduleStore>(DEFAULT_SCHEDULE);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(REFERENCE_DATE);
  const [group, setGroup] = useState<"all" | GroupId>("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"roster" | "audit" | "sheets" | "swap" | "rules" | "history">("roster");
  const [editEmployee, setEditEmployee] = useState("");
  const [editDest, setEditDest] = useState<"off" | GroupId>("off");
  const [editReason, setEditReason] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [holidayInput, setHolidayInput] = useState("");
  const [message, setMessage] = useState("");
  const [showOnlyScheduled, setShowOnlyScheduled] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const editRef = useRef<HTMLElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setStore(reviseStore(JSON.parse(stored)));
    } catch { /* Modo demonstrativo: manter dados padrão se storage estiver inacessível. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch { /* O usuário continua com a simulação desta sessão. */ }
  }, [ready, store]);
  useEffect(() => { if (tableRef.current) tableRef.current.scrollTop = 0; },
    [date, group, search, showOnlyScheduled]);

  const period = movementPeriod(date);
  const absences = useMemo(() => (ready ? loadAbsences() : null), [ready]);
  const week = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => dateOffset(week, i));
  const roster = useMemo(() => scheduleForDate(store, date), [store, date]);
  const coverage = useMemo(() => coverageFor(store, date), [store, date]);
  const missing = coverage.reduce((n, c) => n + Math.max(0, c.required - c.assigned), 0);
  const assigned = roster.filter(r => r.group !== null).length;
  const sunday = dayOfWeek(date) === 0;
  const holiday = store.rules.holidays.includes(date);
  const filtered = roster.filter(row => {
    if (group !== "all" && row.employee.group !== group) return false;
    if (showOnlyScheduled && row.group === null) return false;
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return !q || (row.employee.name + " " + row.employee.id).toLocaleLowerCase("pt-BR").includes(q);
  });
  const chosen = DEMO_EMPLOYEES.find(e => e.id === editEmployee);
  const current = chosen ? assignmentFor(store, chosen, date) : null;
  const editGroup = editDest === "off" ? null : editDest;
  const manualChanges = editEmployee ? [{ employeeId: editEmployee, date, group: editGroup }] : [];
  const editValidation = editEmployee ? validateChanges(store, manualChanges) : null;
  const noEditChange = Boolean(chosen && current === editGroup);
  const swapChanges = fromId && toId ? swapProposal(store, date, fromId, toId) : [];
  const swapValidation = swapChanges.length ? validateChanges(store, swapChanges) : null;
  const duplicatePending = hasPendingConflict(store, date, [fromId, toId]);
  const pending = store.requests.filter(r => r.status === "pendente");
  const history = [...store.history].reverse().filter(h =>
    !historySearch.trim() || (h.detail + " " + h.date).toLocaleLowerCase("pt-BR")
      .includes(historySearch.trim().toLocaleLowerCase("pt-BR")));

  function updateDate(value: string) {
    if (!isValidReferenceDate(value)) return;
    setDate(value); setMessage("");
  }
  function applyManual() {
    if (!chosen || !editValidation?.ok || noEditChange || editReason.trim().length < 8) return;
    setStore(prev => {
      const check = validateChanges(prev, [{ employeeId: chosen.id, date, group: editGroup }]);
      if (!check.ok) return prev;
      const next = withChanges(prev, [{ employeeId: chosen.id, date, group: editGroup }]);
      return { ...next, history: [...prev.history, stamp(date,
        "Ajuste manual: " + chosen.name + " · " + groupName(current, date) + " → " +
        groupName(editGroup, date) + " · Motivo: " + editReason.trim())].slice(-350) };
    });
    setMessage("Ajuste demonstrativo registrado. A escala e o histórico foram atualizados neste navegador.");
    setEditReason("");
  }
  function requestSwap() {
    if (!swapValidation?.ok || duplicatePending || !swapChanges.length ||
        swapChanges[0]!.group === assignmentFor(store, DEMO_EMPLOYEES.find(e => e.id === fromId)!, date) ||
        swapReason.trim().length < 8) return;
    const request = {
      id: "TR-" + Date.now().toString(36) + "-" + (store.requests.length + 1),
      date, sourceId: fromId, targetId: toId,
      sourceGroup: assignmentFor(store, DEMO_EMPLOYEES.find(e=>e.id===fromId)!, date),
      targetGroup: assignmentFor(store, DEMO_EMPLOYEES.find(e=>e.id===toId)!, date),
      reason: swapReason.trim(),
      createdAt: new Date().toISOString(), status: "pendente" as const,
    };
    setStore(prev => ({ ...prev, requests: [...prev.requests, request].slice(-250),
      history: [...prev.history, stamp(date,
        "Troca solicitada: " + employeeLabel(fromId) + " ↔ " + employeeLabel(toId) +
        " · Motivo: " + request.reason)].slice(-350) }));
    setSwapReason("");
    setMessage("Solicitação enviada à fila demonstrativa. A escala NÃO foi alterada; aguarda decisão.");
  }
  function decide(id: string, approve: boolean) {
    const req = store.requests.find(r => r.id === id && r.status === "pendente");
    if (!req) return;
    const note = (reviewNotes[id] ?? "").trim();
    if (!approve && note.length < 5) {
      setMessage("Para recusar uma troca, informe o motivo da decisão com pelo menos 5 caracteres.");
      return;
    }
    if (approve && !requestStillCurrent(store, req)) {
      setMessage("A escala mudou desde a solicitação. Recuse esta troca e registre uma nova.");
      return;
    }
    const changes = swapProposal(store, req.date, req.sourceId, req.targetId);
    const check = changes.length ? validateChanges(store, changes) : null;
    if (approve && (!check?.ok || !changes.length)) {
      setMessage("Troca bloqueada na revisão: " + (check?.errors.join(" ") ?? "sem colaboradores válidos."));
      return;
    }
    setStore(prev => {
      const currentRequest = prev.requests.find(r => r.id === id && r.status === "pendente");
      if (!currentRequest) return prev;
      const liveChanges = swapProposal(prev, currentRequest.date, currentRequest.sourceId, currentRequest.targetId);
      const liveCheck = liveChanges.length ? validateChanges(prev, liveChanges) : null;
      if (approve && (!liveCheck?.ok || !requestStillCurrent(prev, currentRequest))) return prev;
      const next = approve ? withChanges(prev, liveChanges) : prev;
      return {
        ...next,
        requests: prev.requests.map(r => r.id === id ? {
          ...r, status: approve ? "aprovada" as const : "recusada" as const,
          decidedAt: new Date().toISOString(),
          decisionNote: note || "Decisão gerencial demonstrativa",
        } : r),
        history: [...prev.history, stamp(currentRequest.date,
          (approve ? "Troca aprovada e aplicada" : "Troca recusada") +
          ": " + employeeLabel(currentRequest.sourceId) + " ↔ " +
          employeeLabel(currentRequest.targetId) + " · Registro " + id +
          " · Parecer: " + (note || "Aprovado em simulação"))].slice(-350),
      };
    });
    setMessage(approve ? "Troca aprovada na demonstração e escala recalculada." : "Troca recusada; escala preservada.");
  }
  function setTarget(kind: "sunday" | "holiday", g: GroupId, value: number) {
    if (!Number.isFinite(value)) return;
    const n = Math.max(0, Math.min(kind === "sunday" ? DEMO_EMPLOYEES.length : GROUPS[g].requiredStaff, Math.trunc(value)));
    setStore(prev => {
      if (prev.rules[kind][g] === n) return prev;
      return {
        ...prev,
        rules: { ...prev.rules, [kind]: { ...prev.rules[kind], [g]: n } },
        history: [...prev.history, stamp(date, "Parâmetro de " +
          (kind === "sunday" ? "domingo · " + SPECIAL_SLOT_LABEL[g] : "feriado-padrão · Grupo " + g) + ": " + prev.rules[kind][g] + " → " + n)].slice(-350),
      };
    });
  }
  function setWeekdayTarget(kind: "alta" | "baixa", g: GroupId, value: number) {
    if (!Number.isFinite(value)) return;
    const n = Math.max(0, Math.min(GROUPS[g].requiredStaff, Math.trunc(value)));
    setStore(prev => {
      if (prev.rules.weekday[kind][g] === n) return prev;
      return {
        ...prev,
        rules: { ...prev.rules, weekday: { ...prev.rules.weekday, [kind]: { ...prev.rules.weekday[kind], [g]: n } } },
        history: [...prev.history, stamp(date, "Meta de dia útil (" + (kind === "alta" ? "alto" : "baixo") +
          " movimento) · " + GROUPS[g].name + ": " + prev.rules.weekday[kind][g] + " → " + n)].slice(-350),
      };
    });
  }
  function setHolidayDayTarget(day: string, g: GroupId, value: number) {
    if (!Number.isFinite(value)) return;
    const count = Math.max(0, Math.min(GROUPS[g].requiredStaff, Math.trunc(value)));
    setStore(prev => {
      const before = (prev.rules.holidayByDate[day] ?? prev.rules.holiday)[g];
      if (before === count) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          holidayByDate: {
            ...prev.rules.holidayByDate,
            [day]: { ...(prev.rules.holidayByDate[day] ?? prev.rules.holiday), [g]: count },
          },
        },
        history: [...prev.history, stamp(day,
          "Efetivo de feriado: " + prettyDate(day) + " · Grupo " + g +
          ": " + before + " → " + count)].slice(-350),
      };
    });
  }
  function changeHoliday(day: string, add: boolean) {
    if (add && !isValidReferenceDate(day)) { setMessage("Informe uma data de feriado válida."); return; }
    setStore(prev => {
      const holidays = add
        ? [...new Set([...prev.rules.holidays, day])].sort()
        : prev.rules.holidays.filter(h => h !== day);
      const holidayByDate = { ...prev.rules.holidayByDate };
      if (!add) delete holidayByDate[day];
      return { ...prev, rules: { ...prev.rules, holidays, holidayByDate },
        history: [...prev.history, stamp(day, (add ? "Feriado cadastrado: " : "Feriado retirado: ") + prettyDate(day))].slice(-350) };
    });
    setHolidayInput("");
    setMessage(add ? "Feriado incluído na demonstração; o quadro foi recalculado." : "Feriado removido.");
  }
  function resetDemo() {
    if (!window.confirm("Limpar todas as trocas, ajustes e configurações desta demonstração no navegador?")) return;
    setStore(DEFAULT_SCHEDULE);
    setMessage("Demonstração restaurada aos padrões iniciais.");
  }

  return <div className="fs-app formosa-operation">
    <header className="fs-page-head">
      <div>
        <p className="op-eyebrow">MN Patrimônios · Gestão de Pessoas · {UNIT.unit}</p>
        <h1>Escala <span>&</span> trocas</h1>
        <p>Domingo sim, domingo não. Quem trabalha no domingo folga um dia antes (folga antecipada) e um dia na semana seguinte (folga do 7º dia).</p>
      </div>
      <div className="fs-ref"><CalendarDays size={17} /><label>Data de referência
        <input aria-label="Data da escala" type="date" value={date}
          onChange={e => updateDate(e.target.value)} />
      </label></div>
    </header>
    <div className="fs-demo"><ShieldCheck size={17} />
      <span><strong>Ambiente demonstrativo · {UNIT.unit}.</strong> Colaboradores fictícios. Configurações, decisões e histórico ficam somente neste navegador; não há ponto, aprovação oficial, sincronização entre gerentes ou conexão com banco.</span>
    </div>
    <div className={"fs-period fs-period-" + period.kind}><b>{period.kind === "alta" ? "🔴" : "🟢"} {period.label}</b>
      <span>de {prettyDate(period.from)} a {prettyDate(period.until)} · {period.advice}</span></div>
    {message && <div role="status" className="fs-toast"><Info size={16}/><span>{message}</span>
      <button type="button" aria-label="Dispensar aviso" onClick={() => setMessage("")}><X size={15}/></button></div>}

    <section className="fs-stats" aria-label="Indicadores da escala">
      <div className="fs-stat"><span><Users size={17}/> Quadro demonstrativo</span><strong>63</strong><small>Colaboradores cadastrados</small></div>
      <div className="fs-stat"><span><CalendarDays size={17}/> Escalados na data</span><strong>{assigned}</strong><small>{sunday ? "Domingo / revezamento" : holiday ? "Efetivo de feriado" : "Dia de operação"}</small></div>
      <div className="fs-stat"><span><ShieldCheck size={17}/> Cobertura operacional</span><strong>{missing === 0 ? "OK" : missing}</strong><small>{missing === 0 ? "Metas atendidas" : "Postos abaixo da meta"}</small></div>
      <div className="fs-stat"><span><ArrowLeftRight size={17}/> Trocas em análise</span><strong>{pending.length}</strong><small>Dependem de aprovação</small></div>
    </section>

    <nav className="fs-tabs" aria-label="Áreas de escalas e trocas">
      {([
        ["roster", "Escala semanal", CalendarDays],
        ["audit", "Conferência de folgas", Check],
        ["sheets", "Folhas para imprimir", Printer],
        ["swap", "Trocas & autorização", ArrowLeftRight],
        ["rules", "Parâmetros e feriados", Settings2],
        ["history", "Histórico", History],
      ] as const).map(([id, text, Icon]) =>
        <button key={id} type="button" aria-current={tab === id ? "page" : undefined}
          className={tab === id ? "fs-tab-active" : ""} onClick={() => setTab(id)}>
          <Icon size={16}/>{text}{id === "swap" && pending.length > 0 && <b>{pending.length}</b>}
        </button>
      )}
    </nav>

    {tab === "roster" && <>
      <section className="fs-panel">
        <div className="fs-panel-heading">
          <div><p className="op-eyebrow">PLANEJAMENTO E COBERTURA</p><h2>Semana de {prettyDate(week)}</h2>
            <p>Clique em um dia para ver quem trabalha e quem está de folga.</p></div>
          <div className="fs-inline-actions">
            <button type="button" onClick={() => updateDate(dateOffset(date, -7))} aria-label="Semana anterior"><ChevronLeft size={17}/></button>
            <button type="button" onClick={() => updateDate(REFERENCE_DATE)}>Semana inicial</button>
            <button type="button" onClick={() => updateDate(dateOffset(date, 7))} aria-label="Próxima semana"><ChevronRight size={17}/></button>
          </div>
        </div>
        <div className="fs-week">
          {days.map(day => {
            const cover = coverageFor(store, day);
            const total = cover.reduce((n, c) => n + c.assigned, 0);
            const deficit = cover.reduce((n, c) => n + Math.max(0, c.required - c.assigned), 0);
            const isSunday = dayOfWeek(day) === 0;
            const isHoliday = store.rules.holidays.includes(day);
            return <button type="button" key={day} className={"fs-day " + (day === date ? "fs-day-active " : "") +
              (deficit ? "fs-day-warning " : "")} aria-pressed={day === date} onClick={() => updateDate(day)}>
              <span>{monthDay(day)}</span><strong>{total}<small> pessoas</small></strong>
              <em>{isSunday ? "Domingo" : isHoliday ? "Feriado" : deficit ? deficit + " abaixo" : "Regular"}</em>
            </button>;
          })}
        </div>
        <div className="fs-coverage">
          {coverage.map(c => <div key={c.group} className="fs-coverage-item">
            <div><b>{sunday ? SPECIAL_SLOT_LABEL[c.group] : c.group + " · " + GROUPS[c.group].name}</b><strong>{c.assigned}/{c.required}</strong></div>
            <div className="fs-meter"><span style={{width: c.required ? Math.min(100,c.assigned/c.required*100)+"%" : "100%"}} /></div>
            <small className={c.assigned < c.required ? "fs-warn-text" : "fs-good-text"}>
              {c.assigned < c.required ? "Faltam " + (c.required - c.assigned) + " pessoa(s)" : c.assigned > c.required ? "Sobram " + (c.assigned - c.required) + " pessoa(s)" : "Quantidade certa"}
            </small>
          </div>)}
        </div>
        <p className="fs-note"><Info size={14}/> Sábado: equipe completa. Segunda a sexta: cada pessoa tem uma folga, sugerida pelo sistema e
          ajustável pelo gerente. Meta do dia útil muda conforme o período ({period.label.toLowerCase()}).</p>
      </section>
      <section className="fs-panel">
        <div className="fs-panel-heading">
          <div><p className="op-eyebrow">CONSULTA E AJUSTE DE ESCALA</p><h2>Equipe em {prettyDate(date)}</h2>
            <p>{roster.filter(e=>e.group===null).length} folga(s) · {assigned} escalado(s)</p></div>
          <span className="fs-count">{filtered.length} resultado(s)</span>
        </div>
        <div className="fs-filters">
          <label className="fs-search"><Search size={16}/><input aria-label="Buscar colaborador"
            placeholder="Buscar nome ou matrícula" value={search} onChange={e=>setSearch(e.target.value)} /></label>
          <select aria-label="Filtrar grupo de origem" value={group} onChange={e=>setGroup(e.target.value as "all"|GroupId)}>
            <option value="all">Todos os grupos</option>{GROUP_IDS.map(id => <option key={id} value={id}>Grupo {id}</option>)}
          </select>
          <label className="fs-check"><input type="checkbox" checked={showOnlyScheduled}
            onChange={e=>setShowOnlyScheduled(e.target.checked)} /> Só escalados</label>
        </div>
        <div className="fs-table-scroll" ref={tableRef} role="region" aria-label="Tabela de escala com rolagem vertical" tabIndex={0}>
          <table className="fs-table"><thead><tr>
            <th>Colaborador</th><th>Horário da semana</th><th>Turno do dia</th><th>Horário</th><th>Situação</th><th>Ação</th>
          </tr></thead><tbody>
            {filtered.map(row => <tr key={row.employee.id}>
              <td><b>{row.employee.name}</b><small>{row.employee.id}</small></td>
              <td>{GROUPS[row.employee.group].name}</td>
              <td>{row.group ? slotLabel(date, row.group, store.rules) : "—"}</td>
              <td className="fs-time">{row.shift ? row.shift.start + "–" + row.shift.end : "—"}</td>
              <td><span className={"fs-pill " + (row.group ? "fs-pill-good" : "fs-pill-neutral")}>{row.group ? "Trabalha" : restReason(store, row.employee, date) ?? "Folga"}</span></td>
              <td><button className="fs-row-action" type="button" onClick={() => {
                setEditEmployee(row.employee.id);setEditDest(row.group ?? "off");setEditReason("");
                editRef.current?.scrollIntoView({behavior:"smooth",block:"center"});
              }}>Ajustar</button></td>
            </tr>)}
          </tbody></table>
        </div>
        {filtered.length === 0 && <p className="fs-empty">Nenhum colaborador encontrado com os filtros atuais.</p>}
        <p className="fs-note">{filtered.length} colaboradores na lista · role para consultar todos. Os títulos permanecem visíveis na tabela.</p>
      </section>
      <section ref={editRef} className="fs-panel fs-action-panel">
        <div className="fs-panel-heading"><div><p className="op-eyebrow">GESTÃO DA ESCALA</p><h2>Ajustar turno ou folga</h2>
          <p>Escolha a pessoa, destino e motivo. A mudança é validada antes de gravar.</p></div></div>
        <div className="fs-form-grid">
          <SelectEmployee label="Colaborador" value={editEmployee} onChange={id=>{
            setEditEmployee(id);const e=DEMO_EMPLOYEES.find(x=>x.id===id);
            setEditDest(e ? assignmentFor(store,e,date) ?? "off" : "off");}}/>
          <label className="fs-field"><span>Nova situação em {prettyDate(date)}</span>
            <select value={editDest} onChange={e=>setEditDest(e.target.value as "off"|GroupId)}>
              <option value="off">Folga / dispensado da escala</option>
              {GROUP_IDS.map(id => <option value={id} key={id}>{sunday ? SPECIAL_SLOT_LABEL[id] : "Grupo " + id + " · " + GROUPS[id].name}</option>)}
            </select>
          </label>
          <label className="fs-field fs-wide"><span>Motivo do ajuste (obrigatório)</span>
            <input value={editReason} onChange={e=>setEditReason(e.target.value)}
              placeholder="Ex.: cobertura de setor, compromisso, revezamento..." maxLength={240} />
          </label>
        </div>
        {chosen && (noEditChange
          ? <Notice items={["Nenhuma alteração selecionada. Escolha um destino diferente da escala atual."]} />
          : <Notice positive={editValidation?.ok} items={editValidation?.ok
            ? ["Descanso e cobertura conferidos. Alteração disponível para registro demonstrativo."]
            : editValidation?.errors ?? ["Verificação pendente."]}/>)}
        <div className="fs-form-footer">
          <span><ShieldCheck size={15}/> O ajuste é feito apenas neste navegador.</span>
          <button type="button" className="fs-primary" disabled={!ready || !chosen || noEditChange || !editValidation?.ok || editReason.trim().length < 8}
            onClick={applyManual}>Registrar ajuste de escala</button>
        </div>
      </section>
    </>}

    {tab === "audit" && <RestAuditPanel store={store} date={date} />}

    {tab === "sheets" && <section className="fs-panel" style={{padding:16}}>
      <PaperSheets store={store} absences={absences} initialDate={date} />
    </section>}

    {tab === "swap" && <>
      <section className="fs-panel fs-action-panel">
        <div className="fs-panel-heading"><div><p className="op-eyebrow">SOLICITAÇÃO E VALIDAÇÃO</p><h2>Registrar uma troca</h2>
          <p>Duas pessoas trocam os respectivos turnos (ou turno e folga) na mesma data. O gestor deve autorizar.</p></div></div>
        <div className="fs-form-grid">
          <SelectEmployee value={fromId} onChange={setFromId} label="Colaborador de origem"/>
          <SelectEmployee value={toId} onChange={setToId} label="Colega / destino"/>
          <label className="fs-field fs-wide"><span>Motivo informado (obrigatório)</span>
            <input placeholder="Descreva o compromisso e o motivo da troca" value={swapReason}
              maxLength={240} onChange={e=>setSwapReason(e.target.value)} />
          </label>
        </div>
        {swapChanges.length>0 && <div className="fs-swap-preview">
          {swapChanges.map(ch => <div key={ch.employeeId}>
            <b>{employeeLabel(ch.employeeId)}</b><span>Passará para: {groupName(ch.group, date)}</span>
          </div>)}
        </div>}
        {fromId && toId && (duplicatePending
          ? <Notice items={["Há outra solicitação pendente para um dos colaboradores nesta data. Resolva-a antes de abrir nova troca."]}/>
          : !swapChanges.length || swapChanges[0]!.group === assignmentFor(store,DEMO_EMPLOYEES.find(e=>e.id===fromId)!,date)
            ? <Notice items={["Selecione duas pessoas com situações diferentes; troca idêntica não modifica a escala."]}/>
            : <Notice positive={swapValidation?.ok} items={swapValidation?.ok
                ? ["Troca pode ser solicitada. Cobertura e descanso conferidos; a escala somente mudará após autorização."]
                : swapValidation?.errors ?? ["Troca indisponível."]}/>)}
        <div className="fs-form-footer">
          <span><Info size={15}/> A solicitação fica pendente; não troca automaticamente.</span>
          <button className="fs-primary" type="button" onClick={requestSwap} disabled={!ready || !swapValidation?.ok || duplicatePending ||
            swapReason.trim().length<8 || !swapChanges.length ||
            swapChanges[0]!.group === assignmentFor(store, DEMO_EMPLOYEES.find(e=>e.id===fromId)!,date)}>
            Solicitar troca</button>
        </div>
      </section>
      <section className="fs-panel">
        <div className="fs-panel-heading"><div><p className="op-eyebrow">PARECER DO RESPONSÁVEL</p>
          <h2>Autorizações pendentes</h2><p>Revalidamos a troca no momento da aprovação.</p></div>
          <span className="fs-count">{pending.length} pendente(s)</span></div>
        <div className="fs-pending-list">
          {!pending.length && <p className="fs-empty">Nenhuma troca aguardando análise.</p>}
          {pending.map(req => {
            const changes = swapProposal(store,req.date,req.sourceId,req.targetId);
            const check = changes.length ? validateChanges(store,changes):null;
            const unchanged = requestStillCurrent(store, req);
            return <article key={req.id} className="fs-request">
              <div className="fs-request-top"><strong>{req.id}</strong><span>{prettyDate(req.date)}</span></div>
              <p><b>{employeeLabel(req.sourceId)}</b> ↔ <b>{employeeLabel(req.targetId)}</b></p>
              <small>Motivo: {req.reason}</small>
              {!unchanged && <Notice items={["A escala de um participante mudou desde esta solicitação. Recuse e abra nova troca."]}/>}
              {check && !check.ok && <Notice items={check.errors}/>}
              <label className="fs-field"><span>Parecer / motivo de recusa</span>
                <input value={reviewNotes[req.id]??""} onChange={e=>setReviewNotes(prev=>({...prev,[req.id]:e.target.value}))}
                  placeholder="Observação do gestor" maxLength={240}/></label>
              <div className="fs-inline-actions fs-review">
                <button type="button" className="fs-primary" disabled={!check?.ok || !unchanged} onClick={()=>decide(req.id,true)}>
                  <Check size={15}/> Aprovar e aplicar</button>
                <button type="button" className="fs-outline" onClick={()=>decide(req.id,false)}>
                  <X size={15}/> Recusar</button>
              </div>
            </article>;
          })}
        </div>
      </section>
    </>}

    {tab === "rules" && <>
      <section className="fs-panel">
        <div className="fs-panel-heading"><div><p className="op-eyebrow">REGRAS OPERACIONAIS PARAMETRIZÁVEIS</p>
          <h2>Domingos, dias úteis e feriados</h2><p>Quantas pessoas são necessárias em cada turno. O revezamento é montado automaticamente.</p></div></div>
        <div className="fs-config-grid">
          {(["sunday","holiday"] as const).map(kind => <div className="fs-config-card" key={kind}>
            <h3>{kind==="sunday"?"Vagas por turno no domingo":"Efetivo especial dos feriados"}</h3>
            <p>{kind==="sunday"?"Domingo sim, domingo não: metade da equipe trabalha. Qualquer operador pode ficar em qualquer turno; quem fecha o sábado às 22h vai para o turno das 15h15.":
              "Padrão inicial para novos feriados; cada data cadastrada permite alterar os três grupos."}</p>
            <div className="fs-targets">{GROUP_IDS.map(g => <label key={g}>
              <span>{kind==="sunday" ? SPECIAL_SLOT_LABEL[g] : "Grupo " + g}</span>
              <input aria-label={(kind==="sunday"?"Domingo "+SPECIAL_SLOT_LABEL[g]:"Feriado grupo "+g)} type="number" min={0}
                max={kind==="sunday" ? DEMO_EMPLOYEES.length : GROUPS[g].requiredStaff} value={store.rules[kind][g]}
                onChange={e=>setTarget(kind,g,Number(e.target.value))}/>
              <small>{kind==="sunday" ? "pessoas" : "máx. " + GROUPS[g].requiredStaff}</small>
            </label>)}</div>
          </div>)}
        </div>
        <div className="fs-config-grid">
          {(["alta","baixa"] as const).map(kind => <div className="fs-config-card" key={kind}>
            <h3>{kind==="alta" ? "🔴 Dias úteis no ALTO movimento (dia 28 ao 18)" : "🟢 Dias úteis no BAIXO movimento (dia 19 ao 27)"}</h3>
            <p>Mínimo de operadores de segunda a sexta. Abaixo disso o sistema avisa “faltam pessoas”.</p>
            <div className="fs-targets">{GROUP_IDS.map(g => <label key={g}>
              <span>{GROUPS[g].name}</span>
              <input aria-label={"Meta "+kind+" "+GROUPS[g].name} type="number" min={0} max={GROUPS[g].requiredStaff}
                value={store.rules.weekday[kind][g]}
                onChange={e=>setWeekdayTarget(kind,g,Number(e.target.value))}/>
              <small>de {GROUPS[g].requiredStaff}</small>
            </label>)}</div>
          </div>)}
        </div>
        <div className="fs-holiday-box">
          <h3>Datas de feriado cadastradas</h3>
          <p>Preencha manualmente os feriados aplicáveis. Não importamos feriados automaticamente.</p>
          <div className="fs-inline-actions"><input aria-label="Nova data de feriado" type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)}/>
            <button className="fs-primary" type="button" onClick={()=>changeHoliday(holidayInput,true)}>Incluir feriado</button></div>
          <div className="fs-holidays">
            {!store.rules.holidays.length && <span className="fs-empty">Nenhum feriado cadastrado.</span>}
            {store.rules.holidays.map(day => <div className="fs-holiday-date" key={day}>
              <strong>{prettyDate(day)}</strong>
              {GROUP_IDS.map(g => <label key={g}>Grupo {g}
                <input type="number" min={0} max={GROUPS[g].requiredStaff}
                  aria-label={"Feriado "+prettyDate(day)+" grupo "+g}
                  value={(store.rules.holidayByDate[day] ?? store.rules.holiday)[g]}
                  onChange={e=>setHolidayDayTarget(day,g,Number(e.target.value))}/>
              </label>)}
              <button type="button" aria-label={"Excluir feriado "+prettyDate(day)}
                onClick={()=>changeHoliday(day,false)}><X size={15}/></button>
            </div>)}
          </div>
        </div>
        <div className="fs-policy"><ShieldCheck size={18}/><p><b>Regras de proteção:</b> ao aprovar trocas,
          bloqueamos menos de {RULES.minRestHours}h entre jornadas e sete dias consecutivos na simulação 6×1.
          Cobertura não pode piorar abaixo do necessário. Essas configurações não substituem validação das convenções coletivas,
          legislação vigente, repouso semanal, domingos e feriados específicos.</p></div>
      </section>
    </>}

    {tab === "history" && <section className="fs-panel">
      <div className="fs-panel-heading"><div><p className="op-eyebrow">RASTREABILIDADE DEMONSTRATIVA</p>
        <h2>Histórico de decisões e mudanças</h2><p>Registros desta instância do navegador.</p></div>
        <span className="fs-count">{history.length} evento(s)</span></div>
      <div className="fs-filters"><label className="fs-search"><Search size={16}/>
        <input aria-label="Pesquisar histórico" placeholder="Filtrar histórico por data ou texto" value={historySearch}
          onChange={e=>setHistorySearch(e.target.value)}/></label>
        <button className="fs-outline" type="button" onClick={resetDemo}><RotateCcw size={15}/> Restaurar demonstração</button>
      </div>
      <div className="fs-history">
        {!history.length && <p className="fs-empty">Ainda não há alterações registradas nesta demonstração.</p>}
        {history.map(item=><article key={item.id}>
          <span>{prettyDate(item.date)} · {new Date(item.createdAt).toLocaleString("pt-BR")}</span>
          <strong>{item.detail}</strong><small>{item.actor} · uso demonstrativo</small>
        </article>)}
      </div>
      <p className="fs-note"><History size={14}/> Este histórico não é auditoria oficial: registros ficam no navegador, podem ser apagados e não identificam usuários autenticados.</p>
    </section>}
  </div>;
}
