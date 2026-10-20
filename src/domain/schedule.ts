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
  sourceGroup: Assignment;
  targetGroup: Assignment;
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
/** Correção prospectiva: datas anteriores conservam a interpretação histórica do demo. */
export const SATURDAY_POLICY_START = "2026-10-20";

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
    const shift = SUNDAY_SHIFTS[GROUP_IDS.indexOf(group)];
    if (!shift) throw new Error("Turno especial não cadastrado para " + group);
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
  return new Set(Array.from({ length: n }, (_, k) => employees[(start + k) % employees.length]?.id)
    .filter((id): id is string => typeof id === "string"));
}
/** Rascunho demonstrativo: preserva sábados; folgas úteis exigem alterações explícitas da gerência.
 * Não é referência homologada: domingos sem folga confirmada podem gerar conflitos.
 */
export function baseAssignment(store: ScheduleStore, employee: Employee, date: ISODate, policyStart = SATURDAY_POLICY_START): Assignment {
  if (employee.status !== "ativo") return null;
  const group = employee.group;
  const members = DEMO_EMPLOYEES.filter(e => e.group === group && e.status === "ativo");
  const weekday = dayOfWeek(date);
  if (weekday === 0) {
    return rotatingSelection(members, date, store.rules.sunday[group]).has(employee.id) ? group : null;
  }
  if (date < policyStart && weekday === 6 &&
      assignmentFor(store, employee, dateOffset(date, 1), policyStart) !== null) return null;
  if (store.rules.holidays.includes(date)) {
    const eligible = date < policyStart && weekday === 6
      ? members.filter(e => assignmentFor(store,e,dateOffset(date,1),policyStart) === null) : members;
    return rotatingSelection(eligible, date, holidayTargetsFor(store.rules, date)[group]).has(employee.id) ? group : null;
  }
  return group;
}
export function assignmentFor(store: ScheduleStore, employee: Employee, date: ISODate, policyStart = SATURDAY_POLICY_START): Assignment {
  const key = overrideKey(date, employee.id);
  return Object.prototype.hasOwnProperty.call(store.overrides, key)
    ? store.overrides[key] ?? null : baseAssignment(store, employee, date, policyStart);
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
export function adjacentRestProblems(store: ScheduleStore, employee: Employee, date: ISODate): string[] {
  const rows = Array.from({ length: 17 }, (_, i) => {
    const d = dateOffset(date, i - 8);
    const g = assignmentFor(store, employee, d);
    return g === null ? null : { date: d, ...shiftFor(d, g, store.rules) };
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], curr = rows[i];
    if (!prev || !curr) continue;
    const rest = checkRestBetween(prev.date, prev.end, curr.date, curr.start, RULES.minRestHours);
    if (!rest.ok && (prev.date === date || curr.date === date))
      errors.push(employee.name + ": " + rest.message);
  }
  // No modelo de demonstração 6×1, bloquear qualquer janela de sete dias consecutivos.
  for (let first = -6; first <= 0; first++) {
    const days = Array.from({ length: 7 }, (_, n) =>
      assignmentFor(store, employee, dateOffset(date, first + n)) !== null);
    if (days.every(Boolean)) {
      errors.push(employee.name + " em " + date + ": sete dias consecutivos previstos; programar descanso compensatório confirmado pela gerência.");
      break;
    }
  }
  return errors;
}
export type Validation = { ok: boolean; errors: string[]; coverageBefore: ReturnType<typeof coverageFor>; coverageAfter: ReturnType<typeof coverageFor> };
export type DailyCoverageTargets = Record<ISODate, Record<GroupId, number>>;
export function isScheduleDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + "T12:00:00Z")) &&
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date;
}
/** Validação atômica de uma ou mais datas. Metas informadas são parâmetros, não homologação. */
export function validateChanges(store: ScheduleStore, changes: AssignmentChange[], targets: DailyCoverageTargets = {}): Validation {
  const date = changes[0]?.date ?? "";
  const before = isScheduleDate(date) ? coverageFor(store, date) : [];
  const errors: string[] = [];
  if (!changes.length) errors.push("Informe ao menos uma alteração.");
  if (changes.some(change => !isScheduleDate(change.date))) errors.push("Data inválida na operação.");
  if (new Set(changes.map(change => overrideKey(change.date, change.employeeId))).size !== changes.length)
    errors.push("Um colaborador não pode receber dois destinos na mesma data.");
  for (const change of changes) {
    const employee = DEMO_EMPLOYEES.find(item => item.id === change.employeeId);
    if (!employee || employee.status !== "ativo") errors.push("Colaborador inexistente ou indisponível.");
    if (change.group !== null && !GROUP_IDS.includes(change.group)) errors.push("Grupo inválido.");
  }
  if (errors.length) return { ok: false, errors, coverageBefore: before, coverageAfter: before };
  const next = withChanges(store, changes);
  const after = coverageFor(next, date);
  const affectedDates = [...new Set(changes.flatMap(change => dayOfWeek(change.date) === 0 &&
    dateOffset(change.date,-1) < SATURDAY_POLICY_START ? [change.date,dateOffset(change.date,-1)] : [change.date]))];
  for (const checkDate of affectedDates) {
    const oldCoverage = checkDate === date ? before : coverageFor(store, checkDate);
    const newCoverage = checkDate === date ? after : coverageFor(next, checkDate);
    for (let i = 0; i < oldCoverage.length; i++) {
      const b = oldCoverage[i], a = newCoverage[i];
      if (!b || !a) continue;
      const required = targets[checkDate]?.[a.group];
      if (required !== undefined && (!Number.isInteger(required) || required < 0)) {
        errors.push("Meta de cobertura inválida em " + checkDate + ", Grupo " + a.group + ".");
        continue;
      }
      const minimum = required ?? Math.min(b.assigned, a.required);
      if (a.assigned < minimum) {
        errors.push("Em " + checkDate + ", Grupo " + a.group +
          ": troca reduziria cobertura de " + b.assigned + " para " +
          a.assigned + " (necessidade " + minimum + ").");
      }
    }
  }
  for (const change of changes) {
    const employee = DEMO_EMPLOYEES.find(item => item.id === change.employeeId);
    if (employee) {
      const existing = adjacentRestProblems(store,employee,change.date);
      errors.push(...adjacentRestProblems(next, employee, change.date).filter(error =>
        !error.includes("sete dias") || !existing.includes(error)));
    }
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
export function requestStillCurrent(store: ScheduleStore, request: SwapRequest) {
  const source = DEMO_EMPLOYEES.find(e => e.id === request.sourceId);
  const target = DEMO_EMPLOYEES.find(e => e.id === request.targetId);
  return Boolean(source && target &&
    assignmentFor(store, source, request.date) === request.sourceGroup &&
    assignmentFor(store, target, request.date) === request.targetGroup);
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
      ).filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(0, 70)
        .map(([date, values]) => [date, targets(values, DEFAULT_SCHEDULE.rules.holiday)])),
      holidays: Array.isArray(v.rules.holidays)
        ? [...new Set(v.rules.holidays.filter(d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(0, 70)
        : [],
    },
    overrides: validOverrides,
    requests: v.requests.filter(r => r && typeof r.id === "string" &&
      (r.sourceGroup === null || GROUP_IDS.includes(r.sourceGroup)) &&
      (r.targetGroup === null || GROUP_IDS.includes(r.targetGroup)) &&
      DEMO_EMPLOYEES.some(e => e.id === r.sourceId) &&
      DEMO_EMPLOYEES.some(e => e.id === r.targetId)).slice(-250),
    history: v.history.filter(h => h && typeof h.id === "string").slice(-350),
  };
}
