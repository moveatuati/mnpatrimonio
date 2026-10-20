import { GROUP_IDS } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { isValidReferenceDate } from "./operation-query";
import { assignmentFor, dateOffset, requiredFor, type ScheduleStore } from "./schedule";
import type { GroupId, ISODate } from "./types";

/** Dados administrativos fictícios. Não guardar CID, diagnóstico, exames ou anexos neste navegador. */
export type AbsenceType = "ferias" | "atestado" | "afastamento";
export type AbsenceStatus = "pendente" | "aprovado" | "recusado" | "cancelado";
export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  ferias: "Férias", atestado: "Atestado", afastamento: "Afastamento",
};
export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
  pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado",
};
export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: ISODate;
  end: ISODate; // inclusive
  note: string; // somente observação operacional genérica, nunca informação médica
  status: AbsenceStatus;
  createdAt: string;
  updatedAt: string;
  responsible: string; // identificação demonstrativa, não autorização autenticada
  decisionNote?: string;
}
export interface AbsenceEvent {
  id: string;
  absenceId: string;
  occurredAt: string;
  actor: string;
  description: string;
}
export interface AbsenceStore {
  version: 1;
  entries: Absence[];
  history: AbsenceEvent[];
}
export interface AbsenceDraft {
  employeeId: string;
  type: AbsenceType;
  start: ISODate;
  end: ISODate;
  note: string;
}
export const ABSENCE_STORAGE_KEY = "formosa:augusto-montenegro:ausencias-demo:v1";
export const SCHEDULE_STORAGE_KEY = "formosa:augusto-montenegro:escala-demo:v1";
export const DEMO_ACTOR = "Gestão demonstrativa";
export const ABSENCE_DEMO_DATE = "2026-10-20";

const initial = [
  ["AUS-001", "FM-006", "ferias", "2026-10-12", "2026-10-26", "aprovado"],
  ["AUS-002", "FM-018", "atestado", "2026-10-19", "2026-10-21", "aprovado"],
  ["AUS-003", "FM-049", "afastamento", "2026-10-15", "2026-10-24", "aprovado"],
  ["AUS-004", "FM-032", "ferias", "2026-10-22", "2026-10-30", "aprovado"],
  ["AUS-005", "FM-003", "atestado", "2026-10-20", "2026-10-22", "pendente"],
  ["AUS-006", "FM-055", "ferias", "2026-10-28", "2026-11-08", "pendente"],
  ["AUS-007", "FM-025", "ferias", "2026-10-03", "2026-10-09", "aprovado"],
] as const;
export function demoAbsences(): AbsenceStore {
  return { version: 1, entries: initial.map(([id, employeeId, type, start, end, status]) => ({
    id, employeeId, type, start, end, status,
    note: "Registro ilustrativo, sem documentos anexados.",
    responsible: DEMO_ACTOR, createdAt: "2026-10-10T12:00:00.000Z",
    updatedAt: "2026-10-10T12:00:00.000Z",
  })), history: [] };
}
const employeeSet = new Set(DEMO_EMPLOYEES.map(e => e.id));
const types: AbsenceType[] = ["ferias", "atestado", "afastamento"];
const statuses: AbsenceStatus[] = ["pendente", "aprovado", "recusado", "cancelado"];
const tidy = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 240);
export function restoreAbsences(raw: unknown): AbsenceStore {
  if (!raw || typeof raw !== "object") return demoAbsences();
  const input = raw as Partial<AbsenceStore>;
  if (input.version !== 1 || !Array.isArray(input.entries) || !Array.isArray(input.history)) return demoAbsences();
  const entries: Absence[] = [];
  for (const item of input.entries.slice(-400)) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" ||
        !employeeSet.has(item.employeeId) || !types.includes(item.type) || !statuses.includes(item.status) ||
        !isValidReferenceDate(item.start) || !isValidReferenceDate(item.end) || item.end < item.start) continue;
    entries.push({
      id: item.id.slice(0, 60), employeeId: item.employeeId, type: item.type,
      start: item.start, end: item.end, status: item.status,
      note: typeof item.note === "string" ? tidy(item.note) : "",
      responsible: typeof item.responsible === "string" ? tidy(item.responsible).slice(0, 80) : DEMO_ACTOR,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      decisionNote: typeof item.decisionNote === "string" ? tidy(item.decisionNote) : undefined,
    });
  }
  const history = input.history.filter(h => h && typeof h.id === "string" &&
    typeof h.absenceId === "string" && typeof h.description === "string" &&
    typeof h.occurredAt === "string" && typeof h.actor === "string").slice(-750)
    .map(h => ({
      id: h.id.slice(0, 80), absenceId: h.absenceId.slice(0, 60),
      occurredAt: h.occurredAt, actor: tidy(h.actor).slice(0, 80),
      description: tidy(h.description),
    }));
  return { version: 1, entries, history };
}
export function nextWorkDate(schedule: ScheduleStore, employeeId: string, end: ISODate): ISODate | null {
  const employee = DEMO_EMPLOYEES.find(e => e.id === employeeId);
  if (!employee) return null;
  // Primeiro turno planejado após o término; não é alta clínica ou confirmação do retorno.
  for (let n = 1; n <= 32; n++) {
    const day = dateOffset(end, n);
    if (assignmentFor(schedule, employee, day) !== null) return day;
  }
  return null;
}
export function isActive(entry: Absence, date: ISODate): boolean {
  return entry.status === "aprovado" && entry.start <= date && date <= entry.end;
}
export function isConflicting(entry: Absence, draft: AbsenceDraft, exclude?: string): boolean {
  return entry.id !== exclude && entry.employeeId === draft.employeeId &&
    (entry.status === "pendente" || entry.status === "aprovado") &&
    entry.start <= draft.end && draft.start <= entry.end;
}
export function validateAbsence(store: AbsenceStore, draft: AbsenceDraft, exclude?: string) {
  const errors: string[] = [];
  if (!employeeSet.has(draft.employeeId)) errors.push("Selecione um colaborador válido.");
  if (!types.includes(draft.type)) errors.push("Tipo de ausência inválido.");
  if (!isValidReferenceDate(draft.start) || !isValidReferenceDate(draft.end)) errors.push("Informe datas válidas.");
  if (isValidReferenceDate(draft.start) && isValidReferenceDate(draft.end)) {
    if (draft.start > draft.end) errors.push("A data final deve ser igual ou posterior à inicial.");
    else if (Math.round((Date.parse(draft.end+"T12:00:00Z")-Date.parse(draft.start+"T12:00:00Z"))/86400000)>366)
      errors.push("Período superior a 367 dias; confirme com o RH antes de registrar.");
  }
  if (store.entries.some(entry => isConflicting(entry, draft, exclude)))
    errors.push("Já existe um pedido pendente ou aprovado para este colaborador em período sobreposto.");
  if (draft.note.length > 240) errors.push("Observação muito longa.");
  return errors;
}
function event(absenceId: string, description: string, now: string): AbsenceEvent {
  return { id: now+"-"+Math.random().toString(36).slice(2,8), absenceId,
    occurredAt: now, actor: DEMO_ACTOR, description: tidy(description) };
}
export function saveAbsence(store: AbsenceStore, draft: AbsenceDraft, currentId?: string,
  now: string = new Date().toISOString()) {
  const errors = validateAbsence(store, draft, currentId);
  if (errors.length) return { ok: false as const, errors, store };
  const existing = store.entries.find(e => e.id === currentId);
  if (currentId && (!existing || ["recusado", "cancelado"].includes(existing.status)))
    return { ok: false as const, errors: ["O registro não pode ser editado neste estado."], store };
  const record: Absence = {
    id: existing?.id ?? "AUS-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),
    employeeId: draft.employeeId, type: draft.type, start: draft.start, end: draft.end,
    note: tidy(draft.note),
    status: "pendente", // uma alteração de período aprovado requer nova análise
    responsible: DEMO_ACTOR,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
  const entries = existing ? store.entries.map(e => e.id === existing.id ? record : e) : [...store.entries, record];
  return { ok: true as const, errors: [], store: { version: 1 as const, entries,
    history: [...store.history, event(record.id,
      (existing ? "Período alterado e reenviado para análise" : "Pedido de ausência registrado")+
      ": "+record.type+" "+record.start+" a "+record.end, now)].slice(-750) } };
}
export function decideAbsence(store: AbsenceStore, id: string, action: "aprovar"|"recusar"|"cancelar",
  reason: string, now: string = new Date().toISOString()) {
  const original = store.entries.find(e => e.id === id);
  if (!original) return { ok: false as const, message: "Registro não localizado.", store };
  if ((action === "aprovar" || action === "recusar") && original.status !== "pendente")
    return { ok: false as const, message: "Somente solicitações pendentes podem receber parecer.", store };
  if (action === "cancelar" && !["pendente","aprovado"].includes(original.status))
    return { ok: false as const, message: "Não é possível cancelar esse estado.", store };
  if ((action === "recusar" || action === "cancelar") && reason.trim().length < 5)
    return { ok: false as const, message: "Informe o motivo da decisão (mínimo 5 caracteres).", store };
  if (action === "aprovar" && store.entries.some(e => isConflicting(e, original, original.id)))
    return { ok: false as const, message: "Há outra ausência no mesmo período.", store };
  const status: AbsenceStatus = action === "aprovar" ? "aprovado" : action === "recusar" ? "recusado" : "cancelado";
  const updated = { ...original, status, updatedAt: now, responsible: DEMO_ACTOR,
    decisionNote: tidy(reason || "Aprovação demonstrativa") };
  return { ok: true as const, message: "Decisão registrada somente na demonstração.",
    store: { version: 1 as const,
      entries: store.entries.map(e => e.id === id ? updated : e),
      history: [...store.history, event(id,
        "Pedido "+status+" · "+original.start+" a "+original.end+
        " · Parecer: "+updated.decisionNote, now)].slice(-750) } };
}
export function dailyAbsences(store: AbsenceStore, date: ISODate) {
  return store.entries.filter(item => isActive(item,date));
}
export function coverageWithAbsences(store: AbsenceStore, schedule: ScheduleStore, date: ISODate) {
  const active = new Set(dailyAbsences(store,date).map(item => item.employeeId));
  return GROUP_IDS.map(group => {
    const scheduled = DEMO_EMPLOYEES.filter(e => assignmentFor(schedule,e,date)===group);
    const absent = scheduled.filter(e => active.has(e.id)).length;
    const required = requiredFor(schedule,date,group);
    const available = scheduled.length-absent;
    return { group, required, scheduled:scheduled.length, absent, available,
      deficit: Math.max(0,required-available), deficitFromAbsences:
        Math.max(0,required-available)-Math.max(0,required-scheduled.length) };
  });
}
export function absenceSummary(store: AbsenceStore, schedule: ScheduleStore, date: ISODate) {
  const current = dailyAbsences(store,date);
  const futureLimit = dateOffset(date,7);
  const returning = store.entries.filter(e => e.status==="aprovado").map(e => ({
    ...e, returnDate: nextWorkDate(schedule,e.employeeId,e.end),
  })).filter(e => e.returnDate && e.returnDate>=date && e.returnDate<=futureLimit);
  const coverage = coverageWithAbsences(store,schedule,date);
  return {
    vacation: current.filter(e => e.type==="ferias").length,
    medical: current.filter(e => e.type!=="ferias").length,
    pending: store.entries.filter(e => e.status==="pendente").length,
    returning: returning.length,
    absent: current.length,
    scheduledAbsent: coverage.reduce((n,g)=>n+g.absent,0),
    extraDeficit: coverage.reduce((n,g)=>n+g.deficitFromAbsences,0),
    totalDeficit: coverage.reduce((n,g)=>n+g.deficit,0),
  };
}
