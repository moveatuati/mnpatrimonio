import { DEFAULT_DAILY_TARGETS, DEFAULT_SUNDAY_SLOTS, GROUPS, GROUP_IDS, GROUP_REGIME, RULES, REGIME_LABEL, employeeShift, serviceRegime } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { checkRestBetween } from "./rules/rest";
import type { Employee, GroupId, ISODate } from "./types";

/** Base de demonstração local: não publica escala, não grava ponto e não dá aprovação oficial. */
export type Assignment = GroupId | null;
export type AssignmentChange = { employeeId: string; date: ISODate; group: Assignment };
export type ScheduleRules = {
  /** Agentes por dia (portaria: diurno + noturno) e serviços gerais em dia útil. */
  daily: Record<GroupId, number>;
  /** Escalados no domingo (portaria segue a 12×36; serviços gerais: 0 = DSR para todos). */
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
  rules: { daily: { ...DEFAULT_DAILY_TARGETS }, sunday: { ...DEFAULT_SUNDAY_SLOTS }, holiday: { P: DEFAULT_DAILY_TARGETS.P, S: 0 },
    holidayByDate: {}, holidays: [] },
  overrides: {},
  requests: [],
  history: [],
};
/** Mantido por compatibilidade com telas antigas (sem efeito nas regras atuais). */
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
/** Horário na data. Com o colaborador, usa o turno dele (portaria diurna/noturna). */
export function shiftFor(date: ISODate, group: GroupId, _rules?: ScheduleRules, employee?: Employee) {
  const shift = employee && employee.group === group ? employeeShift(employee, date) : employeeShift({ group }, date);
  return { start: shift.start, end: shift.end, label: shift.label };
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
 * Escalas dos condomínios:
 * - PORTARIA 12×36 (art. 59-A da CLT): cada turma trabalha 12h e descansa 36h, em dias
 *   alternados (turma 0 nos dias pares, turma 1 nos ímpares). DSR e feriados já compensados.
 * - SERVIÇOS GERAIS: 6×1 de segunda a sábado com DSR no domingo (Lei 605/1949) até a
 *   transição da EC 141/2026; depois 5×2 de segunda a sexta. Se o condomínio pedir equipe
 *   no domingo, quem trabalha recebe a folga ANTECIPADA (mesma semana) e a folga do 7º DIA.
 * O gestor pode mudar qualquer dia; estas são sugestões automáticas.
 * ------------------------------------------------------------------ */
export type PlannedRest = "antecipada" | "setimo";
const WEEKDAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta"];
function epochDay(date: ISODate) { return Math.floor(Date.parse(date + "T12:00:00Z") / 86400000); }
function weekIndex(date: ISODate) { return Math.floor(epochDay(startOfWeek(date)) / 7); }
function activeOfGroup(group: GroupId) { return DEMO_EMPLOYEES.filter(e => e.group === group && e.status === "ativo"); }
function rankOf(employee: Employee) { return activeOfGroup(employee.group).findIndex(e => e.id === employee.id); }
/** Segunda=0 … domingo=6. */
export function weekdayIndex(date: ISODate) { return (dayOfWeek(date) + 6) % 7; }
/** 12×36: a turma trabalha em dias alternados. */
export function works12x36(employee: Employee, date: ISODate) {
  return (epochDay(date) + (employee.team ?? 0)) % 2 === 0;
}
/** Serviços gerais escalados no domingo (revezamento conforme a quantidade pedida). */
export function worksSundayByRotation(employee: Employee, sunday: ISODate, store: ScheduleStore = DEFAULT_SCHEDULE) {
  if (employee.group === "P") return works12x36(employee, sunday);
  return rotatingSelection(activeOfGroup("S"), sunday, store.rules.sunday.S).has(employee.id);
}
/** Dia útil sugerido (0=segunda … 4=sexta) para as duas folgas ligadas ao domingo trabalhado. */
export function restWeekdayFor(employee: Employee, sunday: ISODate) {
  const r = Math.max(0, rankOf(employee));
  const k = Math.floor(weekIndex(sunday) / 2);
  return (Math.floor(r / 2) + k + 3 * (r % 2)) % 5;
}
export function plannedRestFor(employee: Employee, date: ISODate, store: ScheduleStore = DEFAULT_SCHEDULE): PlannedRest | null {
  const w = weekdayIndex(date);
  if (employee.group !== "S" || w > 4 || employee.status !== "ativo") return null;
  const sunday = sundayOf(date);
  if (worksSundayByRotation(employee, sunday, store) && restWeekdayFor(employee, sunday) === w) return "antecipada";
  const previous = dateOffset(sunday, -7);
  if (worksSundayByRotation(employee, previous, store) && restWeekdayFor(employee, previous) === w) return "setimo";
  return null;
}
export function restWeekdayName(index: number) { return WEEKDAY_NAMES[index] ?? ""; }
/** Sugestão automática (base) antes dos ajustes do gestor. */
export function baseAssignment(store: ScheduleStore, employee: Employee, date: ISODate, _policyStart = SATURDAY_POLICY_START): Assignment {
  if (employee.status !== "ativo") return null;
  if (employee.group === "P") return works12x36(employee, date) ? "P" : null;
  const weekday = dayOfWeek(date);
  if (weekday === 0) return worksSundayByRotation(employee, date, store) ? "S" : null;
  if (store.rules.holidays.includes(date)) {
    return rotatingSelection(activeOfGroup("S"), date, holidayTargetsFor(store.rules, date).S).has(employee.id) ? "S" : null;
  }
  if (weekday === 6) return serviceRegime(date) === "6x1" ? "S" : null;
  return plannedRestFor(employee, date, store) ? null : "S";
}
/** Motivo da folga em linguagem simples (ou null se trabalha). */
export function restReason(store: ScheduleStore, employee: Employee, date: ISODate): string | null {
  if (assignmentFor(store, employee, date) !== null) return null;
  if (employee.status !== "ativo") return "Indisponível";
  if (Object.prototype.hasOwnProperty.call(store.overrides, overrideKey(date, employee.id))) return "Folga ajustada pelo gestor";
  if (employee.group === "P") return "Folga da 12×36 (36h de descanso)";
  if (dayOfWeek(date) === 0) return "Descanso semanal (domingo)";
  if (store.rules.holidays.includes(date)) return "Folga no feriado";
  if (dayOfWeek(date) === 6) return "Folga do sábado (5×2)";
  const planned = plannedRestFor(employee, date, store);
  if (planned === "antecipada") return "Folga antecipada (trabalha no domingo)";
  if (planned === "setimo") return "Folga do 7º dia (trabalhou no domingo)";
  return "Folga";
}
/** Nome do grupo com o regime vigente na data. */
export function slotLabel(date: ISODate, slot: GroupId, _rules?: ScheduleRules) {
  return GROUPS[slot].name + " · " + (slot === "S" ? REGIME_LABEL[serviceRegime(date)] : GROUP_REGIME.P);
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
    return { employee, group, shift: group ? shiftFor(date, group, store.rules, employee) : null };
  });
}
export function requiredFor(store: ScheduleStore, date: ISODate, group: GroupId) {
  const rules = store.rules;
  if (rules.holidays.includes(date)) return holidayTargetsFor(rules, date)[group];
  if (dayOfWeek(date) === 0) return rules.sunday[group];
  if (group === "S" && dayOfWeek(date) === 6 && serviceRegime(date) !== "6x1") return 0;
  return rules.daily[group];
}
export function coverageFor(store: ScheduleStore, date: ISODate) {
  const roster = scheduleForDate(store, date);
  return GROUP_IDS.map(group => ({
    group, required: requiredFor(store, date, group),
    assigned: roster.filter(row => row.group === group).length,
  }));
}
/** Fim da jornada em data/hora absolutas (turno noturno termina no dia seguinte). */
function shiftEnd(date: ISODate, start: string, end: string) {
  return { date: end <= start ? dateOffset(date, 1) : date, time: end };
}
export function adjacentRestProblems(store: ScheduleStore, employee: Employee, date: ISODate): string[] {
  const rows = Array.from({ length: 17 }, (_, i) => {
    const d = dateOffset(date, i - 8);
    const g = assignmentFor(store, employee, d);
    return g === null ? null : { date: d, ...shiftFor(d, g, store.rules, employee) };
  }).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const errors: string[] = [];
  const minRest = employee.group === "P" ? RULES.rest12x36Hours : RULES.minRestHours;
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], curr = rows[i];
    if (!prev || !curr) continue;
    const end = shiftEnd(prev.date, prev.start, prev.end);
    const rest = checkRestBetween(end.date, end.time, curr.date, curr.start, minRest);
    if (!rest.ok && (prev.date === date || curr.date === date))
      errors.push(employee.name + ": " + rest.message + (employee.group === "P" ? " (12×36 exige 36h de descanso)." : ""));
  }
  if (employee.group === "S") {
    // 6×1: DSR a cada 7 dias (art. 67 da CLT). 5×2: no máximo 5 jornadas seguidas.
    const max = serviceRegime(date) === "6x1" ? RULES.maxConsecutiveDays6x1 : RULES.maxConsecutiveDays5x2;
    for (let first = -max; first <= 0; first++) {
      const days = Array.from({ length: max + 1 }, (_, n) =>
        assignmentFor(store, employee, dateOffset(date, first + n)) !== null);
      if (days.every(Boolean)) {
        errors.push(employee.name + " em " + date + ": " + (max + 1) + " dias consecutivos previstos (máximo " + max +
          "); programe a folga antes de confirmar.");
        break;
      }
    }
  }
  return errors;
}
/* ------------------------------------------------------------------
 * Serviços gerais escalados no domingo têm DUAS folgas:
 *   - uma ANTES (segunda a sábado da mesma semana) e
 *   - uma DEPOIS (segunda a sábado da semana seguinte).
 * Quem NÃO trabalha no domingo folga o próprio domingo (DSR). Portaria 12×36: não se aplica.
 * ------------------------------------------------------------------ */
const brDate = (d: ISODate) => d.slice(8, 10) + "/" + d.slice(5, 7);
export interface SundayRestCheck {
  sunday: ISODate;
  worked: boolean;
  before: ISODate | null;
  after: ISODate | null;
  ok: boolean;
  problems: string[];
}
function firstRestBetween(store: ScheduleStore, employee: Employee, from: ISODate, days: number): ISODate | null {
  for (let i = 0; i < days; i++) {
    const d = dateOffset(from, i);
    if (assignmentFor(store, employee, d) === null) return d;
  }
  return null;
}
export function sundayRestCheck(store: ScheduleStore, employee: Employee, sunday: ISODate): SundayRestCheck {
  const worked = employee.group === "S" && employee.status === "ativo" && assignmentFor(store, employee, sunday) !== null;
  if (!worked) return { sunday, worked, before: null, after: null, ok: true, problems: [] };
  const monday = startOfWeek(sunday);
  const before = firstRestBetween(store, employee, monday, 6);
  const after = firstRestBetween(store, employee, dateOffset(sunday, 1), 6);
  const problems: string[] = [];
  if (!before) problems.push(employee.name + " trabalha no domingo " + brDate(sunday) + " sem a folga ANTES (de " +
    brDate(monday) + " a " + brDate(dateOffset(monday, 5)) + ").");
  if (!after) problems.push(employee.name + " trabalha no domingo " + brDate(sunday) + " sem a folga DEPOIS (de " +
    brDate(dateOffset(sunday, 1)) + " a " + brDate(dateOffset(sunday, 6)) + ").");
  return { sunday, worked, before, after, ok: problems.length === 0, problems };
}
export interface RestAuditRow {
  employee: Employee;
  sundaysWorked: number;
  sundaysOff: number;
  restsBefore: number;
  restsAfter: number;
  consecutiveSundays: boolean;
  problems: string[];
  checks: SundayRestCheck[];
}
/** Conferência de folgas de TODO o pessoal em uma janela de semanas (padrão: 4). */
export function restAudit(store: ScheduleStore, start: ISODate, weeks = 4) {
  const sundays = Array.from({ length: weeks }, (_, i) => dateOffset(sundayOf(start), i * 7));
  const rows: RestAuditRow[] = DEMO_EMPLOYEES.filter(e => e.status === "ativo" && e.group === "S").map(employee => {
    const checks = sundays.map(s => sundayRestCheck(store, employee, s));
    const consecutiveSundays = checks.some((c, i) => c.worked && Boolean(checks[i + 1]?.worked));
    const problems = checks.flatMap(c => c.problems);
    return {
      employee, checks, consecutiveSundays, problems,
      sundaysWorked: checks.filter(c => c.worked).length,
      sundaysOff: checks.filter(c => !c.worked).length,
      restsBefore: checks.filter(c => c.before).length,
      restsAfter: checks.filter(c => c.after).length,
    };
  });
  return {
    sundays, rows,
    ok: rows.filter(r => r.problems.length === 0).length,
    pending: rows.filter(r => r.problems.length > 0).length,
    workersPerSunday: sundays.map(s => rows.filter(r => r.checks.find(c => c.sunday === s)?.worked).length),
  };
}
function sundayRuleProblems(store: ScheduleStore, employee: Employee, date: ISODate): string[] {
  const sundays = dayOfWeek(date) === 0 ? [date] : [sundayOf(date), dateOffset(sundayOf(date), -7)];
  const problems = sundays.flatMap(s => sundayRestCheck(store, employee, s).problems);
  return [...new Set(problems)];
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
    else if (employee && change.group !== null && change.group !== employee.group)
      errors.push(employee.name + " é de " + GROUPS[employee.group].name + " e não pode cobrir posto de " + GROUPS[change.group].name + ".");
  }
  if (errors.length) return { ok: false, errors, coverageBefore: before, coverageAfter: before };
  const next = withChanges(store, changes);
  const after = coverageFor(next, date);
  const affectedDates = [...new Set(changes.map(change => change.date))];
  for (const checkDate of affectedDates) {
    const oldCoverage = checkDate === date ? before : coverageFor(store, checkDate);
    const newCoverage = checkDate === date ? after : coverageFor(next, checkDate);
    for (let i = 0; i < oldCoverage.length; i++) {
      const b = oldCoverage[i], a = newCoverage[i];
      if (!b || !a) continue;
      const required = targets[checkDate]?.[a.group];
      if (required !== undefined && (!Number.isInteger(required) || required < 0)) {
        errors.push("Meta de cobertura inválida em " + checkDate + ", " + GROUPS[a.group].name + ".");
        continue;
      }
      const minimum = required ?? Math.min(b.assigned, a.required);
      if (a.assigned < minimum) {
        errors.push("Em " + checkDate + ", " + GROUPS[a.group].name +
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
      // Serviços gerais no domingo exigem uma folga antes e uma depois (só bloqueia problema novo).
      const sundayBefore = sundayRuleProblems(store, employee, change.date);
      errors.push(...sundayRuleProblems(next, employee, change.date).filter(p => !sundayBefore.includes(p)));
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
  const targets = (input: unknown, fallback: Record<GroupId, number>) => {
    const x = input && typeof input === "object" ? input as Record<string, unknown> : {};
    return Object.fromEntries(GROUP_IDS.map(id => {
      const value = typeof x[id] === "number" && Number.isFinite(x[id]) ? x[id] as number : fallback[id];
      return [id, Math.max(0, Math.min(total, Math.floor(value)))];
    })) as Record<GroupId, number>;
  };
  const validOverrides: Record<string, Assignment> = {};
  for (const [key, value] of Object.entries(v.overrides)) {
    if (/^\d{4}-\d{2}-\d{2}:MN-\d{3}$/.test(key) &&
        (value === null || GROUP_IDS.includes(value as GroupId))) validOverrides[key] = value as Assignment;
  }
  return {
    version: 1,
    rules: {
      daily: targets((v.rules as Partial<ScheduleRules>).daily, DEFAULT_SCHEDULE.rules.daily),
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
