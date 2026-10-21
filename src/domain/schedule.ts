import { DEFAULT_SUNDAY_SLOTS, DEFAULT_WEEKDAY_TARGETS, GROUPS, GROUP_IDS, RULES, SPECIAL_SLOT_LABEL, SUNDAY_SHIFTS } from "./config";
import { movementKind, type MovementKind } from "./movement";
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
  /** Meta mínima de segunda a sexta, por período de movimento (alta/baixa). */
  weekday: Record<MovementKind, Record<GroupId, number>>;
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
  rules: { sunday: { ...DEFAULT_SUNDAY_SLOTS }, holiday: { A: 1, B: 6, C: 6 }, holidayByDate: {}, holidays: [],
    weekday: { alta: { ...DEFAULT_WEEKDAY_TARGETS.alta }, baixa: { ...DEFAULT_WEEKDAY_TARGETS.baixa } } },
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
/* ------------------------------------------------------------------
 * Revezamento real da Formosa (escala 6×1 com domingo sim, domingo não):
 * - metade dos operadores ativos de cada grupo trabalha em cada domingo;
 * - quem trabalha o domingo recebe a FOLGA ANTECIPADA (segunda a sexta da mesma
 *   semana) e a FOLGA DO 7º DIA exatamente sete dias depois, como na folha de 25/10;
 * - o sábado é dia de equipe completa;
 * - o turno de domingo independe do grupo habitual. Quem fecha o sábado às 22h
 *   (grupo C) fica no turno das 15h15; os demais preenchem as manhãs.
 * O gerente pode mudar qualquer dia; estas são apenas sugestões automáticas.
 * ------------------------------------------------------------------ */
export type PlannedRest = "antecipada" | "setimo";
const WEEKDAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta"];
function epochDay(date: ISODate) { return Math.floor(Date.parse(date + "T12:00:00Z") / 86400000); }
function weekIndex(date: ISODate) { return Math.floor(epochDay(startOfWeek(date)) / 7); }
function activeOfGroup(group: GroupId) { return DEMO_EMPLOYEES.filter(e => e.group === group && e.status === "ativo"); }
function rankOf(employee: Employee) { return activeOfGroup(employee.group).findIndex(e => e.id === employee.id); }
/** Segunda=0 … domingo=6. */
export function weekdayIndex(date: ISODate) { return (dayOfWeek(date) + 6) % 7; }
/** Domingo sim, domingo não: alterna metade de cada grupo a cada semana. */
export function worksSundayByRotation(employee: Employee, sunday: ISODate) {
  const r = rankOf(employee);
  return r >= 0 && (r + weekIndex(sunday)) % 2 === 0;
}
/** Dia útil sugerido (0=segunda … 4=sexta) para as duas folgas ligadas ao domingo trabalhado. */
export function restWeekdayFor(employee: Employee, sunday: ISODate) {
  const r = Math.max(0, rankOf(employee));
  const k = Math.floor(weekIndex(sunday) / 2);
  return (Math.floor(r / 2) + k + 3 * (r % 2)) % 5;
}
export function plannedRestFor(employee: Employee, date: ISODate): PlannedRest | null {
  const w = weekdayIndex(date);
  if (w > 4 || employee.status !== "ativo") return null;
  const sunday = sundayOf(date);
  if (worksSundayByRotation(employee, sunday) && restWeekdayFor(employee, sunday) === w) return "antecipada";
  const previous = dateOffset(sunday, -7);
  if (worksSundayByRotation(employee, previous) && restWeekdayFor(employee, previous) === w) return "setimo";
  return null;
}
export function restWeekdayName(index: number) { return WEEKDAY_NAMES[index] ?? ""; }
const sundayPlans = new Map<string, Map<string, GroupId>>();
/** Distribui os escalados do domingo nos três turnos, respeitando o descanso de 11h. */
export function sundayPlan(store: ScheduleStore, sunday: ISODate): Map<string, GroupId> {
  const targets = store.rules.sunday;
  const key = sunday + JSON.stringify(targets);
  const cached = sundayPlans.get(key);
  if (cached) return cached;
  const pool = DEMO_EMPLOYEES.filter(e => e.status === "ativo" && worksSundayByRotation(e, sunday));
  const plan = new Map<string, GroupId>();
  const count: Record<GroupId, number> = { A: 0, B: 0, C: 0 };
  const put = (e: Employee, slot: GroupId) => { plan.set(e.id, slot); count[slot]++; };
  // Quem fecha o sábado às 22h não pode abrir o domingo de manhã.
  for (const e of pool.filter(e => e.group === "C")) put(e, "C");
  const morning = pool.filter(e => e.group !== "C");
  // Abertura/intermediário só vão para a noite se folgarem na segunda (7º dia).
  for (const e of morning) {
    if (count.C < targets.C && restWeekdayFor(e, sunday) === 0) put(e, "C");
  }
  for (const e of morning.filter(e => !plan.has(e.id))) {
    const slot: GroupId = count.A < targets.A ? "A" : count.B < targets.B ? "B" :
      (count.A / Math.max(1, targets.A) <= count.B / Math.max(1, targets.B) ? "A" : "B");
    put(e, slot);
  }
  if (sundayPlans.size > 400) sundayPlans.clear();
  sundayPlans.set(key, plan);
  return plan;
}
/** Sugestão automática (base) antes dos ajustes do gerente. */
export function baseAssignment(store: ScheduleStore, employee: Employee, date: ISODate, _policyStart = SATURDAY_POLICY_START): Assignment {
  if (employee.status !== "ativo") return null;
  const group = employee.group;
  const weekday = dayOfWeek(date);
  if (weekday === 0) return sundayPlan(store, date).get(employee.id) ?? null;
  if (store.rules.holidays.includes(date)) {
    const members = activeOfGroup(group);
    return rotatingSelection(members, date, holidayTargetsFor(store.rules, date)[group]).has(employee.id) ? group : null;
  }
  if (weekday === 6) return group;
  return plannedRestFor(employee, date) ? null : group;
}
/** Motivo da folga em linguagem simples (ou null se trabalha). */
export function restReason(store: ScheduleStore, employee: Employee, date: ISODate): string | null {
  if (assignmentFor(store, employee, date) !== null) return null;
  if (employee.status !== "ativo") return "Indisponível";
  if (Object.prototype.hasOwnProperty.call(store.overrides, overrideKey(date, employee.id))) return "Folga ajustada pelo gerente";
  if (dayOfWeek(date) === 0) return "Folga de domingo (revezamento)";
  if (store.rules.holidays.includes(date)) return "Folga no feriado";
  const planned = plannedRestFor(employee, date);
  if (planned === "antecipada") return "Folga antecipada (trabalha no domingo)";
  if (planned === "setimo") return "Folga do 7º dia (trabalhou no domingo)";
  return "Folga";
}
/** Nome do grupo ou do turno, conforme o dia (domingo/feriado usa turno especial). */
export function slotLabel(date: ISODate, slot: GroupId, rules?: ScheduleRules) {
  const special = dayOfWeek(date) === 0 || Boolean(rules?.holidays.includes(date));
  return special ? SPECIAL_SLOT_LABEL[slot] : "Grupo " + slot + " · " + GROUPS[slot].name;
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
  // Sábado: equipe completa. Segunda a sexta: meta do período (alto ou baixo movimento).
  if (dayOfWeek(date) === 6) return GROUPS[group].requiredStaff;
  return (store.rules.weekday ?? DEFAULT_SCHEDULE.rules.weekday)[movementKind(date)][group];
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
  const total = DEMO_EMPLOYEES.length;
  const targets = (input: unknown, fallback: Record<GroupId, number>, perGroup = false) => {
    const x = input && typeof input === "object" ? input as Record<string, unknown> : {};
    return Object.fromEntries(GROUP_IDS.map(id => {
      const value = typeof x[id] === "number" && Number.isFinite(x[id]) ? x[id] as number : fallback[id];
      return [id, Math.max(0, Math.min(perGroup ? GROUPS[id].requiredStaff : total, Math.floor(value)))];
    })) as Record<GroupId, number>;
  };
  // Migração: o padrão antigo (1/6/6 por grupo) não representa a escala real de domingo.
  const legacySunday = v.rules.sunday && typeof v.rules.sunday === "object" &&
    JSON.stringify(v.rules.sunday) === JSON.stringify({ A: 1, B: 6, C: 6 });
  const weekdayRaw = (v.rules as Partial<ScheduleRules>).weekday;
  const validOverrides: Record<string, Assignment> = {};
  for (const [key, value] of Object.entries(v.overrides)) {
    if (/^\d{4}-\d{2}-\d{2}:FM-\d{3}$/.test(key) &&
        (value === null || GROUP_IDS.includes(value as GroupId))) validOverrides[key] = value as Assignment;
  }
  return {
    version: 1,
    rules: {
      sunday: legacySunday ? { ...DEFAULT_SUNDAY_SLOTS } : targets(v.rules.sunday, DEFAULT_SCHEDULE.rules.sunday),
      holiday: targets(v.rules.holiday, DEFAULT_SCHEDULE.rules.holiday, true),
      holidayByDate: Object.fromEntries(Object.entries(
        v.rules.holidayByDate && typeof v.rules.holidayByDate === "object" ? v.rules.holidayByDate : {},
      ).filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(0, 70)
        .map(([date, values]) => [date, targets(values, DEFAULT_SCHEDULE.rules.holiday, true)])),
      holidays: Array.isArray(v.rules.holidays)
        ? [...new Set(v.rules.holidays.filter(d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(0, 70)
        : [],
      weekday: {
        alta: targets(weekdayRaw?.alta, DEFAULT_WEEKDAY_TARGETS.alta, true),
        baixa: targets(weekdayRaw?.baixa, DEFAULT_WEEKDAY_TARGETS.baixa, true),
      },
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
