import { useMemo, useState } from "react";
import { CalendarCheck, Clock3, Search, UserRound } from "lucide-react";
import { BANK_RULES, GROUPS } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import {
  BANK_LEVEL_TEXT, balanceOf, bankBoard, bankSummary, canUseBank, compensationMinutesFor, hoursText, requestBankUse,
  scheduleCompensation, suggestCompensationDate, type BankLevel, type HourStore,
} from "@/domain/hour-bank";
import { assignmentFor, restReason, shiftFor, withChanges } from "@/domain/schedule";
import { loadSchedule, saveSchedule } from "@/lib/demo-storage";
import "./BankManagerPanel.css";

const br = (date: string) => date.split("-").reverse().join("/");
const LEVEL_ORDER: BankLevel[] = ["vermelho", "amarelo", "verde", "negativo"];
const TIME_OPTIONS = [30, 60, 90, 120, 180, 240];

export function BankManagerPanel({ store, onStore, date }: {
  store: HourStore; onStore: (next: HourStore) => void; date: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [level, setLevel] = useState<BankLevel | "all">("all");
  const [need, setNeed] = useState(120);
  const [kind, setKind] = useState<"saida_antecipada" | "entrada_tardia">("saida_antecipada");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [folgaDate, setFolgaDate] = useState("");

  const board = useMemo(() => bankBoard(store, date), [store, date]);
  const summary = useMemo(() => bankSummary(store, date), [store, date]);
  const q = query.trim().toLocaleLowerCase("pt-BR");
  const matches = q.length >= 2
    ? DEMO_EMPLOYEES.filter(e => (e.name + " " + e.id).toLocaleLowerCase("pt-BR").includes(q)).slice(0, 6)
    : [];
  const person = DEMO_EMPLOYEES.find(e => e.id === selectedId) ?? null;
  const balance = person ? balanceOf(store, person.id, date) : 0;
  const personLevel = person ? board.find(r => r.employee.id === person.id)!.level : "verde";
  const check = canUseBank(balance, need);
  const schedule = useMemo(() => loadSchedule(), [store]);
  const suggested = person ? suggestCompensationDate(schedule, person, date) : "";
  const todaySlot = person ? assignmentFor(schedule, person, date) : null;
  const todayText = person
    ? todaySlot ? "Trabalha hoje: " + shiftFor(date, todaySlot, schedule.rules, person).start + " às " + shiftFor(date, todaySlot, schedule.rules, person).end
      : (restReason(schedule, person, date) ?? "Folga hoje")
    : "";
  const list = board.filter(r => level === "all" || r.level === level);

  function pick(id: string) {
    setSelectedId(id); setQuery(""); setMessage(""); setReason(""); setFolgaDate("");
  }
  function registerUse() {
    if (!person) return;
    const result = requestBankUse(store, person, date, kind, need, reason, "Supervisor(a) do condomínio");
    if (!result.ok) { setMessage(result.message); return; }
    onStore(result.store); setMessage(result.message);
  }
  function giveFolga(employeeId: string, when: string) {
    const employee = DEMO_EMPLOYEES.find(e => e.id === employeeId);
    if (!employee) return;
    const result = scheduleCompensation(store, employee, when, "Supervisor(a) do condomínio");
    if (!result.ok || !result.change) { setMessage(result.message); return; }
    const current = loadSchedule();
    const next = withChanges(current, [result.change]);
    const log = { id: "BH-" + Date.now().toString(36), date: when, actor: "Supervisor(a) do condomínio",
      detail: employee.name + ": folga de compensação do banco de horas (−" + hoursText(compensationMinutesFor(employee, when)) + ")",
      createdAt: new Date().toISOString() };
    saveSchedule({ ...next, history: [...next.history, log] });
    onStore(result.store);
    setMessage(employee.name + ": " + result.message + " Já aparece na escala.");
  }

  return <section className="bm" aria-label="Consulta rápida do supervisor">
    <div className="bm-period bm-period-baixa">
      <b>⏱️ Ponto eletrônico + banco de horas</b>
      <span>Minutos após a saída (além de {BANK_RULES.creditToleranceMinutes} min de tolerância, art. 58, § 1º) viram crédito. Compensar em até {BANK_RULES.compensationMonths} meses (acordo individual) ou 12 meses (acordo coletivo).</span>
    </div>

    <div className="bm-lights">
      {LEVEL_ORDER.map(l => <button type="button" key={l} className={"bm-light bm-" + l + (level === l ? " bm-on" : "")}
        onClick={() => setLevel(level === l ? "all" : l)}>
        <strong>{summary[l]}</strong>
        <span>{BANK_LEVEL_TEXT[l].label}</span>
        <small>{l === "vermelho" ? "7h ou mais" : l === "amarelo" ? "de 4h a 7h" : l === "verde" ? "até 4h" : "devem horas"}</small>
      </button>)}
    </div>

    <div className="bm-grid">
      <div className="bm-card">
        <h2><Search size={20} /> Consultar colaborador</h2>
        <p className="bm-help">Digite o nome. O saldo aparece na hora, sem precisar chamar o RH.</p>
        <input className="bm-search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Ex.: Ana, Bruno, MN-012" aria-label="Buscar colaborador pelo nome" />
        {matches.length > 0 && <ul className="bm-matches">
          {matches.map(e => <li key={e.id}><button type="button" onClick={() => pick(e.id)}>
            <UserRound size={16} /> {e.name} <small>{e.id} · {GROUPS[e.group].name}</small>
          </button></li>)}
        </ul>}
        {q.length >= 2 && !matches.length && <p className="bm-help">Ninguém encontrado com esse nome.</p>}

        {person && <div className={"bm-person bm-" + personLevel}>
          <div className="bm-person-head">
            <div><b>{person.name}</b><small>{person.id} · {GROUPS[person.group].name} · {todayText}</small></div>
            <div className="bm-balance"><span>Saldo</span><strong>{hoursText(balance)}</strong></div>
          </div>
          <p className="bm-advice"><b>{BANK_LEVEL_TEXT[personLevel].label}.</b> {BANK_LEVEL_TEXT[personLevel].advice}</p>

          <div className="bm-ask">
            <h3><Clock3 size={17} /> Precisa sair mais cedo ou entrar mais tarde?</h3>
            <div className="bm-row">
              <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} aria-label="Tipo de pedido">
                <option value="saida_antecipada">Sair mais cedo</option>
                <option value="entrada_tardia">Entrar mais tarde</option>
              </select>
              <select value={need} onChange={e => setNeed(Number(e.target.value))} aria-label="Quanto tempo">
                {TIME_OPTIONS.map(m => <option key={m} value={m}>{hoursText(m)}</option>)}
              </select>
            </div>
            <p className={"bm-answer " + (check.ok ? "bm-yes" : "bm-no")}>{check.ok ? "✅ " : "⛔ "}{check.message}</p>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (ex.: exame médico)" aria-label="Motivo" />
            <button type="button" className="bm-btn" onClick={registerUse}>Registrar pedido</button>
          </div>

          {balance >= BANK_RULES.attentionMinutes && <div className="bm-ask">
            <h3><CalendarCheck size={17} /> Programar folga de compensação (−{hoursText(compensationMinutesFor(person, folgaDate || suggested))} = 1 jornada)</h3>
            <p className="bm-help">Sugestão: <b>{br(suggested)}</b> — próximo {person.group === "P" ? "plantão da turma (12×36)" : "dia útil de trabalho"}. Compense dentro de {BANK_RULES.compensationMonths} meses (art. 59, § 5º, da CLT).</p>
            <div className="bm-row">
              <input type="date" value={folgaDate || suggested} onChange={e => setFolgaDate(e.target.value)} aria-label="Data da folga" />
              <button type="button" className="bm-btn" onClick={() => giveFolga(person.id, folgaDate || suggested)}>Marcar folga</button>
            </div>
            {person.group === "P" && <p className="bm-warn">⚠️ Portaria 12×36: combine o folguista ou a troca de turma para cobrir o plantão.</p>}
          </div>}
        </div>}
        {message && <p className="bm-message" role="status">{message}</p>}
      </div>

      <div className="bm-card">
        <h2>Quem tem mais horas {level !== "all" && <small>· {BANK_LEVEL_TEXT[level].label}</small>}</h2>
        <p className="bm-help">Ordem do maior para o menor saldo. Clique nas cores acima para filtrar.</p>
        <ol className="bm-rank">
          {list.map(r => <li key={r.employee.id} className={"bm-" + r.level}>
            <button type="button" className="bm-rank-name" onClick={() => pick(r.employee.id)}>
              <b>{r.employee.name}</b><small>{r.employee.id} · {GROUPS[r.employee.group].name}{r.deadline ? " · compensar até " + br(r.deadline) : ""}</small>
            </button>
            <span className="bm-bar"><i style={{ width: Math.max(2, Math.min(100, Math.abs(r.minutes) / 6)) + "%" }} /></span>
            <strong>{hoursText(r.minutes)}</strong>
            {r.level === "vermelho"
              ? <button type="button" className="bm-mini" onClick={() => giveFolga(r.employee.id, suggestCompensationDate(schedule, r.employee, date))}>Dar folga</button>
              : <span className="bm-mini-space" />}
          </li>)}
        </ol>
      </div>
    </div>
  </section>;
}
