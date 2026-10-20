import { GROUPS, GROUP_IDS, RULES, SUNDAY_SHIFTS } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { checkRestBetween } from "./rules/rest";
import type { Employee, GroupId, ISODate } from "./types";

/** Base de demonstração local: não publica escala, não grava ponto e não dá aprovação oficial. */
export type Assignment = GroupId | null;
export type AssignmentChange = { employeeId: string; date: ISODate; group: Assignment };
export type ScheduleRules = {
  sunday: Record<GroupId, number>;
  holiday: Record<GroupId, number>;
  holidayByDate: Record<ISODate, Record<GroupId, number>>;
  holidays: ISODate[];
};
export type SwapRequest = {
  id: string;
  date: ISODate;
  sourceId: string;
  targetId: string;
  reason: string;
  createdAt: string;
  status: "pendente" | "aprovada" | "recusada";
  decidedAt?: string;
  decisionNote?: string;
};
export type ChangeLog = {
  id: string;
  date: ISODate;
  actor: string;
  detail: string;
  createdAt: string;
};
export type ScheduleStore = {
  version: 1;
  rules: ScheduleRules;
  overrides: Record<string, Assignment>;
  requests: SwapRequest[];
  history: ChangeLog[];
};
export const DEFAULT_SCHEDULE: ScheduleStore = {
  version: 1,
  rules: { sunday: { A: 1, B: 6, C: 6 }, holiday: { A: 1, B: 6, C: 6 }, holidayByDate: {}, holidays: [] },
  overrides: {},
  requests: [],
  history: [],
};

export function dateOffset(date: ISODate, n: number): ISODate {
  const time = Date.parse(date + "T12:00:00Z");
  return new Date(time + n * 86400000).toISOString().slice(0, 10);
}
export function dayOfWeek(date: ISODate) {
  return new Date(date + "T12:00:00Z").getUTCDay();
}
export function startOfWeek(date: ISODate) {
  const weekday = dayOfWeek(date);
  return dateOffset(date, weekday === 0 ? -6 : 1 - weekday);
}
export function sundayOf(date: ISODate) { return dateOffset(startOfWeek(date), 6); }
export function holidayTargetsFor(rules: ScheduleRules, date: ISODate) {
  return rules.holidayByDate[date] ?? rules.holiday;
}
export function shiftFor(date: ISODate, group: GroupId, rules: ScheduleRules) {
  if (dayOfWeek(date) === 0 || rules.holidays.includes(date)) {
    const shift = SUNDAY_SHIFTS[GROUP_IDS.indexOf(group)]!;
    return { start: shift.start, end: shift.end, label: shift.name };
  }
  const shift = GROUPS[group].shift;
  return { start: shift.start, end: shift.end, label: GROUPS[group].name };
}
export function overrideKey(date: ISODate, employeeId: string) { return date + ":" + employeeId; }
function rotatingSelection(employees: Employee[], date: ISODate, count: number) {
  if (!employees.length || count <= 0) return new Set<string>();
  const days = Math.floor(Date.parse(date + "T12:00:00Z") / 86400000);
  const round = Math.floor(days / 7);
  const n = Math.min(Math.max(0, Math.trunc(count)), employees.length);
  const start = ((round * n) % employees.length + employees.length) % employees.length;
  return new Set(Array.from({ length: n }, (_, k) => employees[(start + k) % employees.length]!.id));
}
/** Escala-base: segunda a sábado. Domingo com revezamento, compensação automática na segunda.
 * Feriado: contingente próprio, sem transformar automaticamente hora extra/folga em direito liquidado.
 */
export function baseAssignment(store: ScheduleStore, employee: Employee, date: ISODate): Assignment {
  if (employee.status !== "ativo") return null;
  const group = employee.group;
  const members = DEMO_EMPLOYEES.filter(e => e.group === group && e.status === "ativo");
  const weekday = dayOfWeek(date);
  if (weekday === 0) {
    return rotatingSelection(members, date, store.rules.sunday[group]).has(employee.id) ? group : null;
  }
  if (weekday === 1) {
    const previousSunday = dateOffset(date, -1);
    // Compensação após trabalho no domingo para evitar sete dias de trabalho consecutivos.
    if (baseAssignment(store, employee, previousSunday) !== null) return null;
  }
  if (store.rules.holidays.includes(date)) {
    const eligible = members.filter(e =>
      !(weekday === 1 && baseAssignment(store, e, dateOffset(date, -1)) !== null));
    return rotatingSelection(eligible, date, holidayTargetsFor(store.rules, date)[group]).has(employee.id) ? group : null;
  }
  return group;
}
export function assignmentFor(store: ScheduleStore, employee: Employee, date: ISODate): Assignment {
  const key = overrideKey(date, employee.id);
  return Object.prototype.hasOwnProperty.call(store.overrides, key)
    ? store.overrides[key]! : baseAssignment(store, employee, date);
}
export function withChanges(store: ScheduleStore, changes: AssignmentChange[]): ScheduleStore {
  const overrides = { ...store.overrides };
  for (const change of changes) overrides[overrideKey(change.date, change.employeeId)] = change.group;
  return { ...store, overrides };
}
export function scheduleForDate(store: ScheduleStore, date: ISODate) {
  return DEMO_EMPLOYEES.map(employee => {
    const group = assignmentFor(store, employee, date);
    return { employee, group, shift: group ? shiftFor(date, group, store.rules) : null };
  });
}
export function requiredFor(store: ScheduleStore, date: ISODate, group: GroupId) {
  if (dayOfWeek(date) === 0) return store.rules.sunday[group];
  if (store.rules.holidays.includes(date)) return holidayTargetsFor(store.rules, date)[group];
  // Quadro completo é o alvo de cobertura configurado para dias regulares.
  return GROUPS[group].requiredStaff;
}
export function coverageFor(store: ScheduleStore, date: ISODate) {
  const roster = scheduleForDate(store, date);
  return GROUP_IDS.map(group => ({
    group, required: requiredFor(store, date, group),
    assigned: roster.filter(row => row.group === group).length,
  }));
}
function adjacentRestProblems(store: ScheduleStore, employee: Employee, date: ISODate): string[] {
  const rows = Array.from({ length: 17 }, (_, i) => {
    const d = dateOffset(date, i - 8);
    const g = assignmentFor(store, employee, d);
    return g === null ? null : { date: d, ...shiftFor(d, g, store.rules) };
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!, curr = rows[i]!;
    const rest = checkRestBetween(prev.date, prev.end, curr.date, curr.start, RULES.minRestHours);
    if (!rest.ok && (prev.date === date || curr.date === date))
      errors.push(employee.name + ": " + rest.message);
  }
  // No modelo de demonstração 6×1, bloquear qualquer janela de sete dias consecutivos.
  for (let first = -6; first <= 0; first++) {
    const days = Array.from({ length: 7 }, (_, n) =>
      assignmentFor(store, employee, dateOffset(date, first + n)) !== null);
    if (days.every(Boolean)) {
      errors.push(employee.name + ": sete dias consecutivos previstos; programar descanso compensatório.");
      break;
    }
  }
  return errors;
}
export type Validation = { ok: boolean; errors: string[]; coverageBefore: ReturnType<typeof coverageFor>; coverageAfter: ReturnType<typeof coverageFor> };
export function validateChanges(store: ScheduleStore, changes: AssignmentChange[]): Validation {
  const date = changes[0]?.date ?? "";
  const before = coverageFor(store, date);
  const errors: string[] = [];
  if (!changes.length || changes.some(change => change.date !== date)) errors.push("Use uma única data por operação.");
  if (new Set(changes.map(change => change.employeeId)).size !== changes.length)
    errors.push("Um colaborador não pode receber dois destinos na mesma operação.");
  for (const change of changes) {
    const employee = DEMO_EMPLOYEES.find(item => item.id === change.employeeId);
    if (!employee || employee.status !== "ativo") errors.push("Colaborador inexistente ou indisponível.");
    if (change.group !== null && !GROUP_IDS.includes(change.group)) errors.push("Grupo inválido.");
  }
  if (errors.length) return { ok: false, errors, coverageBefore: before, coverageAfter: before };
  const next = withChanges(store, changes);
  const after = coverageFor(next, date);
  for (let i = 0; i < before.length; i++) {
    const b = before[i]!, a = after[i]!;
    if (a.assigned < Math.min(b.assigned, a.required)) {
      errors.push("Grupo " + a.group + ": troca reduziria cobertura de " + b.assigned + " para " +
        a.assigned + " (necessidade " + a.required + ").");
    }
  }
  for (const change of changes) {
    const employee = DEMO_EMPLOYEES.find(item => item.id === change.employeeId)!;
    errors.push(...adjacentRestProblems(next, employee, date));
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)], coverageBefore: before, coverageAfter: after };
}
export function swapProposal(store: ScheduleStore, date: ISODate, sourceId: string, targetId: string) {
  const source = DEMO_EMPLOYEES.find(e => e.id === sourceId);
  const target = DEMO_EMPLOYEES.find(e => e.id === targetId);
  if (!source || !target || sourceId === targetId) return [];
  return [
    { employeeId: source.id, date, group: assignmentFor(store, target, date) },
    { employeeId: target.id, date, group: assignmentFor(store, source, date) },
  ] as AssignmentChange[];
}
export function hasPendingConflict(store: ScheduleStore, date: ISODate, ids: string[]) {
  return store.requests.some(r => r.status === "pendente" && r.date === date &&
    ids.some(id => id === r.sourceId || id === r.targetId));
}
export function reviseStore(raw: unknown): ScheduleStore {
  if (!raw || typeof raw !== "object") return DEFAULT_SCHEDULE;
  const v = raw as Partial<ScheduleStore>;
  if (v.version !== 1 || !v.rules || typeof v.rules !== "object" ||
      !v.overrides || typeof v.overrides !== "object" ||
      !Array.isArray(v.requests) || !Array.isArray(v.history)) return DEFAULT_SCHEDULE;
  const targets = (input: unknown, fallback: Record<GroupId, number>) => {
    const x = input && typeof input === "object" ? input as Record<string, unknown> : {};
    return Object.fromEntries(GROUP_IDS.map(id => {
      const value = typeof x[id] === "number" ? x[id] as number : fallback[id];
      return [id, Math.max(0, Math.min(GROUPS[id].requiredStaff, Math.floor(value)))];
    })) as Record<GroupId, number>;
  };
  const validOverrides: Record<string, Assignment> = {};
  for (const [key, value] of Object.entries(v.overrides)) {
    if (/^\d{4}-\d{2}-\d{2}:FM-\d{3}$/.test(key) &&
        (value === null || GROUP_IDS.includes(value as GroupId))) validOverrides[key] = value as Assignment;
  }
  return {
    version: 1,
    rules: {
      sunday: targets(v.rules.sunday, DEFAULT_SCHEDULE.rules.sunday),
      holiday: targets(v.rules.holiday, DEFAULT_SCHEDULE.rules.holiday),
      holidayByDate: Object.fromEntries(Object.entries(
        v.rules.holidayByDate && typeof v.rules.holidayByDate === "object" ? v.rules.holidayByDate : {},
      ).filter(([date]) => /^d{4}-d{2}-d{2}$/.test(date)).slice(0, 70)
        .map(([date, values]) => [date, targets(values, DEFAULT_SCHEDULE.rules.holiday)])),
      holidays: Array.isArray(v.rules.holidays)
        ? [...new Set(v.rules.holidays.filter(d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(0, 70)
        : [],
    },
    overrides: validOverrides,
    requests: v.requests.filter(r => r && typeof r.id === "string" && DEMO_EMPLOYEES.some(e => e.id === r.sourceId) && DEMO_EMPLOYEES.some(e => e.id === r.targetId)).slice(-250),
    history: v.history.filter(h => h && typeof h.id === "string").slice(-350),
  };
}
