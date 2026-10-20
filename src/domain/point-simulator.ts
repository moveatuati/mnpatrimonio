import { GROUPS, RULES } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { isValidReferenceDate } from "./operation-query";
import { assignmentFor, dayOfWeek, shiftFor, type ScheduleStore } from "./schedule";
import { fromMinutes, toMinutes } from "./time";
import type { Employee, ISODate } from "./types";

/** Marcações exclusivamente fictícias; separadas do ponto oficial e do gerador da Visão da operação. */
export const MARKS = ["entry", "breakOut", "breakIn", "exit"] as const;
export type Mark = (typeof MARKS)[number];
export const MARK_LABELS: Record<Mark, string> = {
  entry: "Entrada", breakOut: "Saída para intervalo", breakIn: "Retorno do intervalo", exit: "Saída final",
};
export type PointDay = {
  employeeId: string;
  date: ISODate;
  marks: Partial<Record<Mark, string>>;
  updatedAt: string;
};
export type PointLog = {
  id: string;
  employeeId: string | null;
  date: ISODate;
  action: "registrar" | "corrigir" | "amostra" | "limpar";
  description: string;
  recordedAt: string;
};
export type PointStore = {
  version: 1;
  alertMinutes: number;
  records: Record<string, PointDay>;
  history: PointLog[];
};
export const EMPTY_POINT_STORE: PointStore = {
  version: 1, alertMinutes: RULES.lateAlertMinutes, records: {}, history: [],
};
export function pointKey(date: ISODate, employeeId: string) { return date + ":" + employeeId; }
export function validTime(time: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time); }
export function requiredMarks(schedule: ScheduleStore, employee: Employee, date: ISODate): Mark[] {
  if (assignmentFor(schedule, employee, date) === null) return [];
  // Turnos especiais de domingo/feriado têm somente entrada e saída na configuração atual;
  // não inventar intervalo, que dependerá de confirmação do RH.
  if (dayOfWeek(date) === 0 || schedule.rules.holidays.includes(date)) return ["entry", "exit"];
  return [...MARKS];
}
export function plannedMarks(schedule: ScheduleStore, employee: Employee, date: ISODate) {
  const group = assignmentFor(schedule, employee, date);
  if (!group) return {} as Partial<Record<Mark, string>>;
  const shift = shiftFor(date, group, schedule.rules);
  const special = dayOfWeek(date) === 0 || schedule.rules.holidays.includes(date);
  return special
    ? { entry: shift.start, exit: shift.end }
    : { entry: shift.start, breakOut: GROUPS[group].shift.breakStart,
        breakIn: GROUPS[group].shift.breakEnd, exit: shift.end };
}
export function nextMark(schedule: ScheduleStore, employee: Employee, date: ISODate, day?: PointDay) {
  return requiredMarks(schedule, employee, date).find(mark => !day?.marks[mark]) ?? null;
}
export function readPointStore(input: unknown): PointStore {
  if (!input || typeof input !== "object") return EMPTY_POINT_STORE;
  const raw = input as Partial<PointStore>;
  if (raw.version !== 1 || !raw.records || typeof raw.records !== "object" || !Array.isArray(raw.history)) return EMPTY_POINT_STORE;
  const employees = new Set(DEMO_EMPLOYEES.map(e => e.id));
  const records: Record<string, PointDay> = {};
  for (const [key, value] of Object.entries(raw.records).slice(-12000)) {
    if (!value || typeof value !== "object") continue;
    const record = value as PointDay;
    if (!employees.has(record.employeeId) || !isValidReferenceDate(record.date) ||
        key !== pointKey(record.date, record.employeeId) || !record.marks || typeof record.marks !== "object") continue;
    const marks: Partial<Record<Mark, string>> = {};
    for (const mark of MARKS) {
      const value = record.marks[mark];
      if (typeof value === "string" && validTime(value)) marks[mark] = value;
    }
    records[key] = { employeeId: record.employeeId, date: record.date, marks,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "" };
  }
  const alertMinutes = typeof raw.alertMinutes === "number" && Number.isFinite(raw.alertMinutes)
    ? Math.max(0, Math.min(60, Math.trunc(raw.alertMinutes))) : RULES.lateAlertMinutes;
  const history = raw.history.filter(event => event && typeof event.id === "string" &&
    typeof event.description === "string" && typeof event.date === "string").slice(-700);
  return { version: 1, records, history, alertMinutes };
}
function log(action: PointLog["action"], id: string | null, date: ISODate, description: string, now: string): PointLog {
  return { id: now + ":" + Math.random().toString(36).slice(2, 9), employeeId: id, date,
    description, recordedAt: now, action };
}
export function markPoint(store: PointStore, schedule: ScheduleStore, employee: Employee,
  date: ISODate, mark: Mark, time: string, options?: { correctionReason?: string; recordedAt?: string }) {
  const error = (detail: string) => ({ ok: false as const, error: detail, store });
  if (!isValidReferenceDate(date) || !validTime(time)) return error("Informe data e hora válidas.");
  const required = requiredMarks(schedule, employee, date);
  if (!required.includes(mark)) return error("Não há esse tipo de marcação planejada para a data/turno.");
  const key = pointKey(date, employee.id);
  const current = store.records[key];
  const existing = current?.marks[mark];
  if (existing === time) return error("Este horário já está registrado.");
  const correction = Boolean(existing);
  if (correction && (options?.correctionReason?.trim().length ?? 0) < 8)
    return error("Para corrigir uma marcação existente, informe motivo com pelo menos 8 caracteres.");
  if (!correction && nextMark(schedule, employee, date, current) !== mark)
    return error("Respeite a sequência das marcações de ponto.");
  const marks = { ...current?.marks, [mark]: time };
  const times = required.map(item => marks[item]).filter((t): t is string => Boolean(t)).map(toMinutes);
  if (times.some((v, i) => i > 0 && v <= times[i - 1]!))
    return error("As marcações devem seguir horários crescentes, sem sobreposição.");
  const now = options?.recordedAt ?? new Date().toISOString();
  const previous = existing ? existing + " → " : "";
  const next: PointStore = {
    ...store,
    records: { ...store.records, [key]: { employeeId: employee.id, date, marks, updatedAt: now } },
    history: [...store.history, log(correction ? "corrigir" : "registrar", employee.id, date,
      employee.name + " · " + MARK_LABELS[mark] + ": " + previous + time +
      (correction ? " · Justificativa: " + options!.correctionReason!.trim() : ""), now)].slice(-700),
  };
  return { ok: true as const, store: next, error: "" };
}
export function analysePoint(schedule: ScheduleStore, store: PointStore, employee: Employee, date: ISODate) {
  const planned = plannedMarks(schedule, employee, date);
  const required = requiredMarks(schedule, employee, date);
  const record = store.records[pointKey(date, employee.id)];
  const marks = record?.marks ?? {};
  const registered = required.filter(mark => Boolean(marks[mark])).length;
  const complete = required.length > 0 && registered === required.length;
  const late = typeof marks.entry === "string" && typeof planned.entry === "string"
    ? Math.max(0, toMinutes(marks.entry) - toMinutes(planned.entry)) : null;
  const earlyExit = typeof marks.exit === "string" && typeof planned.exit === "string"
    ? Math.max(0, toMinutes(planned.exit) - toMinutes(marks.exit)) : null;
  const orphanMarks = required.length === 0 && MARKS.some(mark => Boolean(marks[mark]));
  const anomaly = orphanMarks || (late !== null && late > store.alertMinutes) ||
    (earlyExit !== null && earlyExit > 0);
  const status = orphanMarks ? "atenção" : required.length === 0 ? "folga" :
    registered === 0 ? "sem registro" :
    complete ? (anomaly ? "atenção" : "completo") : "em andamento";
  return { planned, marks, required, registered, complete, late, earlyExit, anomaly, status };
}
export function pointSummary(schedule: ScheduleStore, store: PointStore, date: ISODate) {
  const analysis = DEMO_EMPLOYEES.map(e => analysePoint(schedule, store, e, date));
  return {
    planned: analysis.filter(a => a.required.length > 0).length,
    started: analysis.filter(a => a.registered > 0).length,
    completed: analysis.filter(a => a.complete).length,
    attention: analysis.filter(a => a.anomaly).length,
    unregistered: analysis.filter(a => a.status === "sem registro").length,
  };
}
/** Gera amostra determinística, sem sobrescrever marcações já existentes. */
export function seedPointDay(store: PointStore, schedule: ScheduleStore, date: ISODate, now: string = new Date().toISOString()) {
  if (!isValidReferenceDate(date)) return store;
  const records = { ...store.records };
  let count = 0;
  let sampleIndex = 0;
  for (const employee of DEMO_EMPLOYEES) {
    const key = pointKey(date, employee.id);
    if (records[key]) continue;
    const required = requiredMarks(schedule, employee, date);
    if (!required.length) continue;
    const planned = plannedMarks(schedule, employee, date);
    const offset = sampleIndex % 31 === 0 ? 14 : sampleIndex % 9 === 0 ? 6 : -(sampleIndex % 4);
    sampleIndex++;
    const marks: Partial<Record<Mark, string>> = {};
    for (const mark of required) {
      const expected = planned[mark];
      if (expected) marks[mark] = fromMinutes(toMinutes(expected) + (mark === "entry" ? offset : 0));
    }
    // Reduzir somente a entrada não altera outras marcações. Amostra, não ponto real.
    records[key] = { employeeId: employee.id, date, marks, updatedAt: now };
    count++;
  }
  if (!count) return store;
  return { ...store, records, history: [...store.history,
    log("amostra", null, date, "Amostra fictícia gerada para " + count + " colaborador(es). Registros anteriores preservados.", now)].slice(-700) };
}
export function clearPointDay(store: PointStore, date: ISODate, now: string = new Date().toISOString()) {
  const records = Object.fromEntries(Object.entries(store.records).filter(([, row]) => row.date !== date));
  const count = Object.keys(store.records).length - Object.keys(records).length;
  if (!count) return store;
  return { ...store, records, history: [...store.history,
    log("limpar", null, date, count + " registro(s) fictícios removidos da data.", now)].slice(-700) };
}
