import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, Clock3, Monitor, Printer, Smartphone, Users, Wallet } from "lucide-react";
import { GROUPS, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { BANK_LEVEL_TEXT, balanceOf, bankBoard, bankLevel, canUseBank, hoursText, requestBankUse, type HourStore } from "@/domain/hour-bank";
import {
  ARRIVAL_TEXT, DEMO_MANAGERS, OCCURRENCE_TEXT, STATUS_TEXT, TOLERANCE_MINUTES, acknowledge, archiveSigned, arrivalBoard,
  informEarlyExit, issueWarning, liveAlerts, managersOnDuty, monthlyLateCount, sendToRH,
  type ManagerId, type ManagerStore, type Occurrence,
} from "@/domain/manager-app";
import { movementPeriod } from "@/domain/movement";
import { assignmentFor, restReason, sundayOf, type ScheduleStore } from "@/domain/schedule";
import { fromMinutes, toMinutes } from "@/domain/time";
import type { AbsenceStore } from "@/domain/absences";
import { PrintHeader } from "@/components/print/PrintHeader";
import { loadAbsences, loadHours, loadManager, loadSchedule, saveHours, saveManager, todayISO } from "@/lib/demo-storage";
import { DEFAULT_SCHEDULE } from "@/domain/schedule";
import { demoHourStore } from "@/domain/hour-bank";
import { EMPTY_MANAGER_STORE } from "@/domain/manager-app";
import { printNode } from "@/lib/print";
import "./ManagerApp.css";

type PhoneTab = "agora" | "alertas" | "banco" | "equipe";
const br = (d: string) => d.split("-").reverse().join("/");
const nameOf = (id: string) => DEMO_EMPLOYEES.find(e => e.id === id)?.name ?? id;
const ICON = { no_horario: "✅", atrasado: "🔴", aguardando: "⏳", sem_entrada: "❌", ainda_nao: "·" } as const;

/** Dados da demonstração compartilhados entre a prévia no computador e o modo celular. */
function useManagerDemo() {
  const [date, setDate] = useState("2026-10-21");
  const [now, setNow] = useState("07:15");
  const [manager, setManager] = useState<ManagerId>("GM");
  const [schedule, setSchedule] = useState<ScheduleStore>(DEFAULT_SCHEDULE);
  const [absences, setAbsences] = useState<AbsenceStore | null>(null);
  const [hours, setHours] = useState<HourStore>(() => demoHourStore());
  const [store, setStore] = useState<ManagerStore>(EMPTY_MANAGER_STORE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSchedule(loadSchedule()); setAbsences(loadAbsences()); setHours(loadHours()); setStore(loadManager());
    setDate(todayISO()); setReady(true);
  }, []);
  useEffect(() => { if (ready) saveManager(store); }, [store, ready]);
  useEffect(() => { if (ready) saveHours(hours); }, [hours, ready]);

  const me = DEMO_MANAGERS.find(m => m.id === manager)!;
  const board = useMemo(() => arrivalBoard(schedule, absences, date, now), [schedule, absences, date, now]);
  const alerts = useMemo(() => liveAlerts(board, store, date), [board, store, date]);
  // Cada gerente só recebe os alertas que aconteceram enquanto ele estava na loja.
  const myAlerts = alerts.filter(a => {
    const at = toMinutes(a.actual ?? fromMinutes(toMinutes(a.planned) + TOLERANCE_MINUTES));
    return at >= toMinutes(me.from) && at <= toMinutes(me.to);
  });
  const fresh = myAlerts.filter(a => a.status === "novo").length;
  const onDuty = managersOnDuty(now);
  return { date, setDate, now, setNow, manager, setManager, schedule, absences, hours, setHours, store, setStore, me, board, myAlerts, fresh, onDuty };
}

/** Tela do celular (cabeçalho com logo, conteúdo e 4 abas). Usada na prévia e no modo celular. */
function PhoneScreen({ d, tab, setTab, onSettings }: {
  d: ReturnType<typeof useManagerDemo>; tab: PhoneTab; setTab: (t: PhoneTab) => void; onSettings?: () => void;
}) {
  return <>
    <div className="ma-brand">
      <img src="/formosa-logo-oficial.png" alt="Formosa" className="ma-brand-logo" />
      <div className="ma-brand-text"><b>App do Gerente</b><span>{UNIT.unit}</span></div>
      {onSettings && <button type="button" className="ma-gear" aria-label="Controles da demonstração" onClick={onSettings}>⚙️</button>}
    </div>
    <div className="ma-phone-head">
      <div className="ma-phone-hello">
        <b>Olá, Gerente</b>
        <span>{d.me.name.replace(" (demo)", "")} · {br(d.date)} · {d.now}</span>
        <span>{movementPeriod(d.date).kind === "alta" ? "🔴 Alto movimento" : "🟢 Baixo movimento"}</span>
      </div>
    </div>
    <div className="ma-phone-body">
      {tab === "agora" && <NowTab board={d.board} />}
      {tab === "alertas" && <AlertsTab alerts={d.myAlerts} store={d.store} setStore={d.setStore} manager="Gerente" date={d.date} />}
      {tab === "banco" && <BankTab hours={d.hours} setHours={d.setHours} store={d.store} setStore={d.setStore} manager="Gerente" date={d.date} schedule={d.schedule} />}
      {tab === "equipe" && <TeamTab schedule={d.schedule} absences={d.absences} hours={d.hours} date={d.date} />}
    </div>
    <nav className="ma-tabs">
      {([["agora", Clock3, "Agora"], ["alertas", Bell, "Alertas"], ["banco", Wallet, "Banco"], ["equipe", Users, "Equipe"]] as const).map(([id, Icon, label]) =>
        <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
          <Icon size={21} /><span>{label}</span>{id === "alertas" && d.fresh > 0 && <b>{d.fresh}</b>}
        </button>)}
    </nav>
  </>;
}

/** Controles da simulação (hora, dia e turno do gerente) — só para conduzir a demonstração. */
function SimControls({ d }: { d: ReturnType<typeof useManagerDemo> }) {
  return <>
    <label>Dia <input type="date" value={d.date} onChange={e => e.target.value && d.setDate(e.target.value)} /></label>
    <label>Hora simulada <input type="time" value={d.now} onChange={e => e.target.value && d.setNow(e.target.value)} /></label>
    <div className="ma-steps">
      {[["−10 min", -10], ["+5 min", 5], ["+10 min", 10], ["+1 h", 60]].map(([t, n]) =>
        <button key={t} type="button" onClick={() => d.setNow(fromMinutes(Math.min(23 * 60 + 59, Math.max(0, toMinutes(d.now) + (n as number)))))}>{t}</button>)}
    </div>
    <label>Gerente <select value={d.manager} onChange={e => d.setManager(e.target.value as ManagerId)}>
      {DEMO_MANAGERS.map(m => <option key={m.id} value={m.id}>{m.name.replace(" (demo)", "")} ({m.from}–{m.to})</option>)}
    </select></label>
  </>;
}

/** Modo celular de verdade: tela cheia, sem menu do sistema. Endereço: /celular */
export function MobileManagerApp() {
  const d = useManagerDemo();
  const [tab, setTab] = useState<PhoneTab>("agora");
  const [settings, setSettings] = useState(false);
  return <div className="mm">
    <PhoneScreen d={d} tab={tab} setTab={setTab} onSettings={() => setSettings(true)} />
    {settings && <div className="mm-sheet-bg" onClick={() => setSettings(false)}>
      <div className="mm-sheet ma-sim" onClick={e => e.stopPropagation()}>
        <b>Controles da demonstração</b>
        <SimControls d={d} />
        <p className="ma-muted">Avance a hora para ver as batidas de ponto e os alertas acontecendo.</p>
        <button type="button" className="ma-big" onClick={() => setSettings(false)}>Fechar</button>
      </div>
    </div>}
  </div>;
}

export function ManagerApp() {
  const [view, setView] = useState<"gerente" | "rh">("gerente");
  const [tab, setTab] = useState<PhoneTab>("agora");
  const d = useManagerDemo();
  const { date, store, setStore, onDuty } = d;

  return <div className="ma formosa-operation">
    <header className="ma-top">
      <div>
        <p className="op-eyebrow">FORMOSA · GESTÃO DE PESSOAS · {UNIT.unit.toUpperCase()}</p>
        <h1>App do gerente <span>(prévia)</span></h1>
        <p>Simulação do aplicativo de celular dos gerentes e do painel do RH. Batidas de ponto fictícias.</p>
      </div>
      <div className="ma-switch" role="tablist">
        <button type="button" className={view === "gerente" ? "on" : ""} onClick={() => setView("gerente")}><Smartphone size={16} /> Celular do gerente</button>
        <button type="button" className={view === "rh" ? "on" : ""} onClick={() => setView("rh")}><Monitor size={16} /> Computador do RH</button>
      </div>
    </header>

    <section className="ma-sim" aria-label="Controles da simulação">
      <SimControls d={d} />
      <span className="ma-duty">Na loja agora: {onDuty.length ? onDuty.map(m => m.name.replace(" (demo)", "")).join(", ") : "nenhum gerente"}</span>
      <a className="ma-mobile-link" href="/celular" target="_blank" rel="noopener noreferrer">📱 Abrir modo celular</a>
    </section>

    {view === "gerente"
      ? <div className="ma-layout">
          <div className="ma-phone" aria-label="Tela do celular">
            <PhoneScreen d={d} tab={tab} setTab={setTab} />
          </div>
          <GuideCard />
        </div>
      : <RhPanel store={store} setStore={setStore} date={date} />}
  </div>;
}

function NowTab({ board }: { board: ReturnType<typeof arrivalBoard> }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!board.length) return <p className="ma-empty">Ninguém escalado neste dia.</p>;
  return <div className="ma-list">
    {board.map(card => {
      const arrived = card.counts.no_horario + card.counts.atrasado;
      const total = card.rows.length;
      const started = card.counts.ainda_nao === 0;
      return <div key={card.slot} className="ma-card">
        <button type="button" className="ma-card-head" onClick={() => setOpen(open === card.slot ? null : card.slot)}>
          <div><b>{card.label}</b><small>{card.start} às {card.end} · tolerância {TOLERANCE_MINUTES} min</small></div>
          <strong>{started ? arrived + "/" + total : "—"}</strong>
        </button>
        {started && <div className="ma-chips">
          <span className="c-ok">✅ {card.counts.no_horario} no horário</span>
          {card.counts.atrasado > 0 && <span className="c-late">🔴 {card.counts.atrasado} atrasado(s)</span>}
          {card.counts.aguardando > 0 && <span className="c-wait">⏳ {card.counts.aguardando} na tolerância</span>}
          {card.counts.sem_entrada > 0 && <span className="c-miss">❌ {card.counts.sem_entrada} sem entrada</span>}
        </div>}
        {!started && <p className="ma-muted">Turno começa às {card.start}.</p>}
        {open === card.slot && <ul className="ma-rows">
          {card.rows.map(r => <li key={r.employee.id} className={"s-" + r.state}>
            <span>{ICON[r.state]}</span><b>{r.employee.name}</b>
            <small>{r.punch ? r.punch + (r.state === "atrasado" ? " (+" + r.lateMinutes + " min)" : "") : ARRIVAL_TEXT[r.state]}</small>
          </li>)}
        </ul>}
        <button type="button" className="ma-link" onClick={() => setOpen(open === card.slot ? null : card.slot)}>{open === card.slot ? "Fechar lista" : "Ver nomes"}</button>
      </div>;
    })}
  </div>;
}

function AlertsTab({ alerts, store, setStore, manager, date }: {
  alerts: Occurrence[]; store: ManagerStore; setStore: (s: ManagerStore) => void; manager: string; date: string;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!alerts.length) return <p className="ma-empty">Nenhum atraso no seu horário até agora. 👍</p>;
  return <div className="ma-list">
    {alerts.map(a => <div key={a.id} className={"ma-alert st-" + a.status}>
      <div className="ma-alert-top">
        <b>{a.type === "atraso" ? "🔴" : "❌"} {nameOf(a.employeeId)}</b>
        <span className="ma-status">{STATUS_TEXT[a.status]}</span>
      </div>
      <p>{a.type === "atraso" ? "Chegou às " + a.actual + " · " + a.minutes + " min após " + a.planned : "Sem entrada · turno das " + a.planned}</p>
      <small>Atrasos enviados ao RH no mês: {monthlyLateCount(store, a.employeeId, date)}</small>
      {(a.status === "novo" || a.status === "ciente") && <>
        <input placeholder="Observação para o RH (opcional)" value={notes[a.id] ?? ""} onChange={e => setNotes({ ...notes, [a.id]: e.target.value })} />
        <div className="ma-actions">
          {a.status === "novo" && <button type="button" onClick={() => setStore(acknowledge(store, a, manager))}>👍 Ciente</button>}
          <button type="button" className="primary" onClick={() => setStore(sendToRH(store, a, manager, notes[a.id] ?? ""))}>Enviar ao RH</button>
        </div>
      </>}
    </div>)}
  </div>;
}

function BankTab({ hours, setHours, store, setStore, manager, date, schedule }: {
  hours: HourStore; setHours: (h: HourStore) => void; store: ManagerStore; setStore: (s: ManagerStore) => void;
  manager: string; date: string; schedule: ScheduleStore;
}) {
  const [q, setQ] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [need, setNeed] = useState(120);
  const [kind, setKind] = useState<"saida_antecipada" | "entrada_tardia">("saida_antecipada");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const query = q.trim().toLocaleLowerCase("pt-BR");
  const matches = query.length >= 2 ? DEMO_EMPLOYEES.filter(e => (e.name + " " + e.id).toLocaleLowerCase("pt-BR").includes(query)).slice(0, 5) : [];
  const person = DEMO_EMPLOYEES.find(e => e.id === id);
  const balance = person ? balanceOf(hours, person.id, date) : 0;
  const check = canUseBank(balance, need);
  const slot = person ? assignmentFor(schedule, person, date) : null;
  function authorize() {
    if (!person) return;
    const result = requestBankUse(hours, person, date, kind, need, reason || "Pedido no app do gerente", manager);
    if (!result.ok) { setMsg(result.message); return; }
    setHours(result.store);
    setStore(informEarlyExit(store, person, date, kind, need, reason, manager, result.approved, hoursText(balance)));
    setMsg(result.approved ? "✅ Autorizado por " + manager.replace(" (demo)", "") + ". O RH já foi informado." : "⏳ Sem saldo: pedido enviado ao RH para decisão.");
  }
  return <div className="ma-list">
    <input className="ma-search" placeholder="Digite o nome do colaborador" value={q} onChange={e => { setQ(e.target.value); setMsg(""); }} />
    {matches.map(e => <button key={e.id} type="button" className="ma-pick" onClick={() => { setId(e.id); setQ(""); setMsg(""); }}>
      {e.name} <small>{GROUPS[e.group].name}</small></button>)}
    {person && <div className={"ma-card bl-" + bankLevel(balance)}>
      <div className="ma-card-head static"><div><b>{person.name}</b><small>{slot ? "Trabalha hoje" : restReason(schedule, person, date) ?? "Folga hoje"}</small></div>
        <strong>{hoursText(balance)}</strong></div>
      <p className="ma-muted">{BANK_LEVEL_TEXT[bankLevel(balance)].label}: {BANK_LEVEL_TEXT[bankLevel(balance)].advice}</p>
      <div className="ma-row">
        <select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="saida_antecipada">Sair mais cedo</option><option value="entrada_tardia">Entrar mais tarde</option></select>
        <select value={need} onChange={e => setNeed(Number(e.target.value))}>{[30, 60, 90, 120, 180, 240].map(m => <option key={m} value={m}>{hoursText(m)}</option>)}</select>
      </div>
      <p className={"ma-answer " + (check.ok ? "yes" : "no")}>{check.ok ? "✅ " : "⛔ "}{check.message}</p>
      <input placeholder="Motivo (ex.: exame médico)" value={reason} onChange={e => setReason(e.target.value)} />
      <button type="button" className="ma-big" onClick={authorize}>{check.ok ? "Autorizar e informar o RH" : "Enviar ao RH para decidir"}</button>
    </div>}
    {msg && <p className="ma-msg">{msg}</p>}
  </div>;
}

function TeamTab({ schedule, absences, hours, date }: { schedule: ScheduleStore; absences: AbsenceStore | null; hours: HourStore; date: string }) {
  const off = DEMO_EMPLOYEES.filter(e => assignmentFor(schedule, e, date) === null);
  const away = (absences?.entries ?? []).filter(a => a.status === "aprovado" && a.start <= date && a.end >= date);
  const sunday = sundayOf(date);
  const sundayCount = DEMO_EMPLOYEES.filter(e => assignmentFor(schedule, e, sunday) !== null).length;
  const due = bankBoard(hours, date).filter(r => r.level === "vermelho");
  return <div className="ma-list">
    <div className="ma-card"><div className="ma-card-head static"><div><b>De folga hoje</b><small>conforme a escala</small></div><strong>{off.length}</strong></div>
      <ul className="ma-rows">{off.slice(0, 20).map(e => <li key={e.id}><span>🏖️</span><b>{e.name}</b><small>{restReason(schedule, e, date)}</small></li>)}</ul></div>
    <div className="ma-card"><div className="ma-card-head static"><div><b>Férias / atestado</b><small>sem detalhes médicos</small></div><strong>{away.length}</strong></div>
      <ul className="ma-rows">{away.map(a => <li key={a.id}><span>📋</span><b>{nameOf(a.employeeId)}</b><small>{a.type === "ferias" ? "Férias" : "Ausência aprovada"} até {br(a.end)}</small></li>)}</ul></div>
    <div className="ma-card"><div className="ma-card-head static"><div><b>Domingo {br(sunday)}</b><small>domingo sim, domingo não</small></div><strong>{sundayCount}</strong></div></div>
    <div className="ma-card"><div className="ma-card-head static"><div><b>Precisam de folga (banco ≥ 7h)</b><small>programar do dia 19 ao 27</small></div><strong>{due.length}</strong></div>
      <ul className="ma-rows">{due.map(r => <li key={r.employee.id}><span>🔴</span><b>{r.employee.name}</b><small>{hoursText(r.minutes)}</small></li>)}</ul></div>
  </div>;
}

function GuideCard() {
  return <aside className="ma-guide">
    <h2>O que o gerente vê no app</h2>
    <ul className="see">
      <li><b>Agora:</b> cada turno do dia, quem chegou, quem está atrasado e quem não bateu o ponto (tolerância de {TOLERANCE_MINUTES} min).</li>
      <li><b>Alertas:</b> aviso no momento da batida atrasada, só para os gerentes que estão na loja naquele horário. Botões <i>Ciente</i> e <i>Enviar ao RH</i>.</li>
      <li><b>Banco:</b> busca pelo nome, saldo na hora, “pode sair mais cedo?” e autorização que já informa o RH.</li>
      <li><b>Equipe:</b> quem está de folga, de férias, quantos trabalham no domingo e quem precisa de folga do banco.</li>
    </ul>
    <h2>O que o gerente NÃO vê</h2>
    <ul className="hide">
      <li>Salário, descontos e folha de pagamento.</li>
      <li>Atestados com diagnóstico (só “ausência aprovada”).</li>
      <li>Advertências e histórico disciplinar completo (ficam no RH).</li>
      <li>Simulador 5×2, regras e configurações do sistema.</li>
      <li>Colaboradores de outros setores.</li>
    </ul>
    <p className="ma-muted">Fluxo: batida atrasada → alerta ao gerente → ciência → envio ao RH → advertência impressa → assinatura → arquivo na ficha.</p>
  </aside>;
}

function RhPanel({ store, setStore, date }: { store: ManagerStore; setStore: (s: ManagerStore) => void; date: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const docRef = useRef<HTMLElement | null>(null);
  const rh = "RH (demo)";
  const list = [...store.occurrences].sort((a, b) => b.date.localeCompare(a.date) || (b.events.at(-1)?.at ?? "").localeCompare(a.events.at(-1)?.at ?? ""));
  const pending = list.filter(o => o.status === "enviado_rh");
  const current = list.find(o => o.id === selected) ?? null;
  const employee = current ? DEMO_EMPLOYEES.find(e => e.id === current.employeeId) : null;
  return <div className="ma-rh">
    <div className="ma-rh-cards">
      <span><b>{pending.length}</b> aguardando o RH</span>
      <span><b>{list.filter(o => o.status === "advertencia").length}</b> advertências para assinar</span>
      <span><b>{list.filter(o => o.status === "arquivado").length}</b> arquivadas</span>
      <span><b>{list.filter(o => o.status === "informado").length}</b> saídas/entradas informadas</span>
    </div>
    {!list.length && <p className="ma-empty">Nenhuma ocorrência ainda. No celular do gerente, avance a hora, abra <b>Alertas</b> e clique em <b>Enviar ao RH</b>.</p>}
    {list.length > 0 && <table className="ma-table"><thead><tr><th>Data</th><th>Colaborador</th><th>Ocorrência</th><th>Detalhe</th><th>Situação</th><th></th></tr></thead>
      <tbody>{list.map(o => <tr key={o.id} className={o.id === selected ? "sel" : ""}>
        <td>{br(o.date)}</td><td><b>{nameOf(o.employeeId)}</b><small> {o.employeeId}</small></td>
        <td>{OCCURRENCE_TEXT[o.type]}</td>
        <td>{o.type === "atraso" ? "Entrada " + o.actual + " (previsto " + o.planned + ", +" + o.minutes + " min)" : o.type === "sem_entrada" ? "Turno das " + o.planned : hoursText(o.minutes) + " · " + (o.events[0]?.text ?? "")}</td>
        <td><span className={"ma-status st-" + o.status}>{STATUS_TEXT[o.status]}</span></td>
        <td className="ma-td-actions">
          {o.status === "enviado_rh" && (o.type === "atraso" || o.type === "sem_entrada") &&
            <button type="button" onClick={() => { setStore(issueWarning(store, o, rh)); setSelected(o.id); }}>Gerar advertência</button>}
          {(o.status === "advertencia" || o.status === "arquivado") && <button type="button" onClick={() => setSelected(o.id)}>Ver advertência</button>}
          {o.status === "advertencia" && <button type="button" onClick={() => setStore(archiveSigned(store, o, rh))}>Assinada ✔</button>}
        </td>
      </tr>)}</tbody></table>}

    {current && employee && current.warningNumber && <article className="ma-doc" ref={docRef}>
      <PrintHeader title={"ADVERTÊNCIA DISCIPLINAR Nº " + current.warningNumber} subtitle={UNIT.legalName + " · CNPJ " + UNIT.cnpj} right={"Unidade " + UNIT.unit + " · " + UNIT.city} />
      <table className="ma-doc-data"><tbody>
        <tr><th>Colaborador(a)</th><td>{employee.name}</td><th>Matrícula</th><td>{employee.id}</td></tr>
        <tr><th>Setor</th><td>Operadora de caixa</td><th>Horário</th><td>{GROUPS[employee.group].name} · {GROUPS[employee.group].shift.start} às {GROUPS[employee.group].shift.end}</td></tr>
        <tr><th>Data da ocorrência</th><td>{br(current.date)}</td><th>Registro de entrada</th><td>{current.actual ?? "sem registro"} (previsto {current.planned})</td></tr>
      </tbody></table>
      <p>Prezado(a) colaborador(a),</p>
      <p>Pela presente, fica V.Sa. formalmente <b>advertido(a)</b> em razão de {current.type === "atraso"
        ? <>atraso no início da jornada no dia {br(current.date)}: horário previsto às {current.planned} e registro de entrada às {current.actual}, ou seja, {current.minutes} minutos após o horário, além da tolerância de {TOLERANCE_MINUTES} minutos.</>
        : <>ausência de registro de entrada no dia {br(current.date)}, turno com início às {current.planned}.</>}</p>
      <p>Solicitamos que a pontualidade seja observada. A repetição da conduta poderá resultar em outras medidas disciplinares previstas na legislação trabalhista e no regulamento interno.</p>
      {current.managerNote && <p><b>Observação do gerente:</b> {current.managerNote}</p>}
      <p className="ma-doc-place">{UNIT.city}, {br(date)}.</p>
      <div className="ma-sign">
        <span>Assinatura do(a) colaborador(a)<small>Ciente em ___/___/______</small></span>
        <span>Responsável pelo RH</span>
        <span>Gerente do setor</span>
      </div>
      <div className="ma-sign">
        <span>Testemunha 1<small>(em caso de recusa em assinar)</small></span>
        <span>Testemunha 2</span>
      </div>
      <p className="ma-doc-note no-print">Modelo demonstrativo. Validar texto com o jurídico antes de usar.</p>
      <div className="ma-doc-actions no-print">
        <button type="button" onClick={() => printNode(docRef.current, { title: "Advertência " + current.warningNumber })}><Printer size={16} /> Imprimir advertência</button>
        <button type="button" onClick={() => setSelected(null)}>Fechar</button>
      </div>
    </article>}

    {current && <div className="ma-history"><h3><CalendarDays size={16} /> Histórico da ocorrência</h3>
      <ul>{current.events.map((e, i) => <li key={i}><b>{e.at.length > 5 ? new Date(e.at).toLocaleString("pt-BR") : e.at}</b> · {e.who}: {e.text}</li>)}</ul></div>}
  </div>;
}
