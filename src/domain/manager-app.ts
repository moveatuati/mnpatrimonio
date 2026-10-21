/**
 * App do supervisor (prévia) — regras puras, sem interface.
 * Chegada por turno com tolerância de 10 min, alertas de atraso no momento da batida,
 * ciência do gerente, envio ao RH e advertência; saída antecipada com consulta ao banco de horas.
 * Dados fictícios: o relógio de ponto oficial será conectado numa etapa futura.
 */
import { GROUPS, RULES, employeeShift } from "./config";
import { DEMO_EMPLOYEES, demoPunches } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { assignmentFor, type ScheduleStore } from "./schedule";
import { fromMinutes, toMinutes } from "./time";
import type { Employee, GroupId, ISODate } from "./types";

export const TOLERANCE_MINUTES = RULES.lateAlertMinutes; // 10 minutos

/** Supervisores fictícios e horário em que estão de plantão (recebem os alertas desse período). */
export const DEMO_MANAGERS = [
  { id: "GL", name: "Gestor(a) MN · administrativo (demo)", from: "08:00", to: "17:00" },
  { id: "GM", name: "Supervisor(a) diurno (demo)", from: "06:30", to: "19:30" },
  { id: "GN", name: "Supervisor(a) noturno (demo)", from: "18:30", to: "07:30" },
] as const;
export type ManagerId = (typeof DEMO_MANAGERS)[number]["id"];
export function managersOnDuty(time: string) {
  const t = toMinutes(time);
  return DEMO_MANAGERS.filter(m => {
    const a = toMinutes(m.from), b = toMinutes(m.to);
    return b >= a ? t >= a && t <= b : t >= a || t <= b;
  });
}

export type ArrivalState = "no_horario" | "atrasado" | "aguardando" | "sem_entrada" | "ainda_nao";
export const ARRIVAL_TEXT: Record<ArrivalState, string> = {
  no_horario: "Chegou no horário",
  atrasado: "Chegou atrasado",
  aguardando: "Na tolerância (aguardando)",
  sem_entrada: "Não registrou entrada",
  ainda_nao: "Turno ainda não começou",
};
export interface ArrivalRow {
  employee: Employee;
  slot: GroupId;
  planned: string;
  punch: string | null;
  lateMinutes: number;
  state: ArrivalState;
}
export interface ShiftCard {
  slot: GroupId;
  /** P-diurno, P-noturno ou S. */
  key: string;
  label: string;
  start: string;
  end: string;
  rows: ArrivalRow[];
  counts: Record<ArrivalState, number>;
}

/** Quadro "Agora": cada turno do dia com quem chegou, quem está atrasado e quem falta. */
export function arrivalBoard(schedule: ScheduleStore, absences: AbsenceStore | null, date: ISODate, now: string): ShiftCard[] {
  const away = new Set((absences?.entries ?? []).filter(a => a.status === "aprovado" && a.start <= date && a.end >= date).map(a => a.employeeId));
  const working = DEMO_EMPLOYEES.filter(e => e.status === "ativo" && !away.has(e.id))
    .map(e => ({ e, slot: assignmentFor(schedule, e, date) }))
    .filter((x): x is { e: Employee; slot: GroupId } => x.slot !== null && x.slot === x.e.group);
  const punches = demoPunches(date, working.map(x => x.e), e => employeeShift(e, date).start);
  const nowMin = toMinutes(now);
  const cards = [
    { key: "P-diurno", slot: "P" as GroupId, pick: (e: Employee) => e.group === "P" && e.turn !== "noturno" },
    { key: "P-noturno", slot: "P" as GroupId, pick: (e: Employee) => e.group === "P" && e.turn === "noturno" },
    { key: "S", slot: "S" as GroupId, pick: (e: Employee) => e.group === "S" },
  ];
  return cards.map(({ key, slot, pick }) => {
    const members = working.filter(x => pick(x.e));
    const shift = members[0] ? employeeShift(members[0].e, date) : employeeShift({ group: slot, turn: key === "P-noturno" ? "noturno" : "diurno" }, date);
    const rows = members.map(({ e }) => {
      const raw = punches.find(p => p.employeeId === e.id)?.entry ?? null;
      const punch = raw && toMinutes(raw) <= nowMin ? raw : null; // batida só aparece depois que acontece
      const late = punch ? Math.max(0, toMinutes(punch) - toMinutes(shift.start)) : Math.max(0, nowMin - toMinutes(shift.start));
      let state: ArrivalState;
      if (punch) state = late > TOLERANCE_MINUTES ? "atrasado" : "no_horario";
      else if (nowMin < toMinutes(shift.start)) state = "ainda_nao";
      else if (nowMin <= toMinutes(shift.start) + TOLERANCE_MINUTES) state = "aguardando";
      else state = "sem_entrada";
      return { employee: e, slot, planned: shift.start, punch, lateMinutes: late, state };
    }).sort((a, b) => order(a.state) - order(b.state) || a.employee.name.localeCompare(b.employee.name));
    const counts = { no_horario: 0, atrasado: 0, aguardando: 0, sem_entrada: 0, ainda_nao: 0 } as Record<ArrivalState, number>;
    for (const r of rows) counts[r.state]++;
    return { slot, key, label: GROUPS[slot].name + " · " + shift.label, start: shift.start, end: shift.end, rows, counts };
  }).filter(card => card.rows.length > 0);
}
function order(s: ArrivalState) { return { sem_entrada: 0, atrasado: 1, aguardando: 2, no_horario: 3, ainda_nao: 4 }[s]; }

/* ---------------------- Ocorrências (gerente → RH) ---------------------- */
export type OccurrenceType = "atraso" | "sem_entrada" | "saida_antecipada" | "entrada_tardia";
export type OccurrenceStatus = "novo" | "ciente" | "enviado_rh" | "advertencia" | "arquivado" | "informado";
export const OCCURRENCE_TEXT: Record<OccurrenceType, string> = {
  atraso: "Atraso na entrada",
  sem_entrada: "Sem registro de entrada",
  saida_antecipada: "Saída antecipada autorizada",
  entrada_tardia: "Entrada mais tarde autorizada",
};
export const STATUS_TEXT: Record<OccurrenceStatus, string> = {
  novo: "Novo alerta",
  ciente: "Gerente ciente",
  enviado_rh: "Enviado ao RH",
  advertencia: "Advertência emitida",
  arquivado: "Assinada e arquivada",
  informado: "RH informado",
};
export interface OccurrenceEvent { at: string; who: string; text: string }
export interface Occurrence {
  id: string;
  type: OccurrenceType;
  employeeId: string;
  date: ISODate;
  planned: string;
  actual: string | null;
  minutes: number;
  status: OccurrenceStatus;
  managerNote?: string;
  warningNumber?: string;
  events: OccurrenceEvent[];
}
export interface ManagerStore { version: 1; occurrences: Occurrence[]; warningSeq: number }
export const MANAGER_KEY = "mn:condominios:app-gestor-demo:v1";
export const EMPTY_MANAGER_STORE: ManagerStore = { version: 1, occurrences: [], warningSeq: 0 };

export function occurrenceId(date: ISODate, employeeId: string, type: OccurrenceType) { return date + ":" + employeeId + ":" + type; }

/** Alertas que o gerente de plantão vê: atrasos já batidos e quem passou da tolerância sem bater. */
export function liveAlerts(board: ShiftCard[], store: ManagerStore, date: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  for (const card of board) for (const r of card.rows) {
    const type: OccurrenceType | null = r.state === "atrasado" ? "atraso" : r.state === "sem_entrada" ? "sem_entrada" : null;
    if (!type) continue;
    const id = occurrenceId(date, r.employee.id, type);
    const saved = store.occurrences.find(o => o.id === id);
    out.push(saved ?? {
      id, type, employeeId: r.employee.id, date, planned: r.planned, actual: r.punch, minutes: r.lateMinutes,
      status: "novo", events: [{ at: r.punch ?? fromMinutes(toMinutes(r.planned) + TOLERANCE_MINUTES), who: "Relógio de ponto",
        text: type === "atraso" ? "Entrada às " + r.punch + " (" + r.lateMinutes + " min após " + r.planned + ")" : "Sem entrada após a tolerância" }],
    });
  }
  return out.sort((a, b) => (a.status === "novo" ? 0 : 1) - (b.status === "novo" ? 0 : 1) || b.minutes - a.minutes);
}

function upsert(store: ManagerStore, occ: Occurrence): ManagerStore {
  const others = store.occurrences.filter(o => o.id !== occ.id);
  return { ...store, occurrences: [...others, occ].slice(-800) };
}
const stamp = () => new Date().toISOString();

export function acknowledge(store: ManagerStore, occ: Occurrence, manager: string): ManagerStore {
  if (occ.status !== "novo") return store;
  return upsert(store, { ...occ, status: "ciente", events: [...occ.events, { at: stamp(), who: manager, text: "Gerente deu ciência e vai conversar com o colaborador" }] });
}
export function sendToRH(store: ManagerStore, occ: Occurrence, manager: string, note: string): ManagerStore {
  if (occ.status !== "novo" && occ.status !== "ciente") return store;
  const text = "Enviado ao RH para justificativa" + (note.trim() ? ": " + note.trim() : "");
  const events = occ.status === "novo"
    ? [...occ.events, { at: stamp(), who: manager, text: "Gerente deu ciência" }, { at: stamp(), who: manager, text }]
    : [...occ.events, { at: stamp(), who: manager, text }];
  return upsert(store, { ...occ, status: "enviado_rh", managerNote: note.trim(), events });
}
export function issueWarning(store: ManagerStore, occ: Occurrence, rhUser: string): ManagerStore {
  if (occ.status !== "enviado_rh") return store;
  const seq = store.warningSeq + 1;
  const number = String(seq).padStart(3, "0") + "/" + occ.date.slice(0, 4);
  return upsert({ ...store, warningSeq: seq }, { ...occ, status: "advertencia", warningNumber: number,
    events: [...occ.events, { at: stamp(), who: rhUser, text: "Advertência nº " + number + " emitida para impressão" }] });
}
export function archiveSigned(store: ManagerStore, occ: Occurrence, rhUser: string): ManagerStore {
  if (occ.status !== "advertencia") return store;
  return upsert(store, { ...occ, status: "arquivado", events: [...occ.events, { at: stamp(), who: rhUser, text: "Advertência assinada e arquivada na ficha" }] });
}
/** Saída antecipada / entrada tarde autorizada pelo gerente após verificar o banco de horas. */
export function informEarlyExit(store: ManagerStore, employee: Employee, date: ISODate, type: "saida_antecipada" | "entrada_tardia",
  minutes: number, reason: string, manager: string, approvedWithBalance: boolean, balanceText: string): ManagerStore {
  const id = occurrenceId(date, employee.id, type) + ":" + Date.now().toString(36);
  return upsert(store, {
    id, type, employeeId: employee.id, date, planned: "", actual: null, minutes, status: "informado", managerNote: reason.trim(),
    events: [{ at: stamp(), who: manager, text: (approvedWithBalance ? "Autorizado: saldo verificado (" + balanceText + ")" : "Sem saldo suficiente: aguardando decisão do RH") +
      (reason.trim() ? " · Motivo: " + reason.trim() : "") }],
  });
}
/** Quantas vezes a pessoa já foi enviada ao RH por atraso no mês (ajuda o RH a decidir). */
export function monthlyLateCount(store: ManagerStore, employeeId: string, date: ISODate) {
  const month = date.slice(0, 7);
  return store.occurrences.filter(o => o.employeeId === employeeId && o.date.startsWith(month) &&
    (o.type === "atraso" || o.type === "sem_entrada") && o.status !== "novo").length;
}
export function restoreManagerStore(raw: unknown): ManagerStore {
  if (!raw || typeof raw !== "object") return EMPTY_MANAGER_STORE;
  const v = raw as Partial<ManagerStore>;
  if (v.version !== 1 || !Array.isArray(v.occurrences)) return EMPTY_MANAGER_STORE;
  const known = new Set(DEMO_EMPLOYEES.map(e => e.id));
  return {
    version: 1,
    warningSeq: typeof v.warningSeq === "number" ? v.warningSeq : 0,
    occurrences: v.occurrences.filter(o => o && typeof o.id === "string" && known.has(o.employeeId) && Array.isArray(o.events)).slice(-800),
  };
}
