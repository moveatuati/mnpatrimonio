import { DEFAULT_DAILY_TARGETS, PORTARIA_SHIFTS, SERVICE_SHIFTS, shiftMinutes } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { dateOffset, dayOfWeek, startOfWeek, type ScheduleStore } from "./schedule";
import type { ISODate } from "./types";

/**
 * Simulador da transição dos SERVIÇOS GERAIS de 6×1 para 5×2 (EC 141/2026).
 * Estudo isolado: nunca grava a escala oficial nem declara conformidade trabalhista.
 * A portaria 12×36 (art. 59-A da CLT) não muda de regime; o simulador só confere a média semanal dela.
 */
export const LEGAL_SOURCES = {
  law: "Emenda Constitucional 141/2026",
  promulgation: "2026-10-16",
  firstPhase: "2026-12-15",
  finalPhase: "2027-12-15",
  url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm",
  implementation: "https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/congresso-promulga-emenda-do-fim-da-6x1-escala-5x2-comeca-em-60-dias",
  senate: "https://www12.senado.leg.br/tv/programas/noticias-1/2026/10/fim-da-escala-6x1-emenda-e-promulgada-e-preve-jornada-de-40-horas-sem-reducao-salarial",
} as const;
export type WeeklyLimit = 42 | 40;
export interface SimulatorParameters {
  /** Segunda-feira inicial de 4 semanas. */
  start: ISODate;
  /** Quadro de serviços gerais simulado (atual + reforços). */
  people: number;
  weeklyLimit: WeeklyLimit;
  /** Pessoas necessárias de segunda a sexta, no sábado e no domingo. */
  weekdayStaff: number;
  saturdayStaff: number;
  sundayStaff: number;
}
export interface ScenarioPerson { id: string; name: string; hired: boolean }
export interface DayCoverage {
  date: ISODate; weekday: number; required: number; planned: number; absent: number;
  available: number; deficit: number; baseline: number; baselineDeficit: number;
}
export interface PersonWeek {
  employee: ScenarioPerson; week: number; workingDates: ISODate[]; restDates: ISODate[];
  minutes: number; overWeeklyLimit: boolean; consecutiveViolation: boolean;
}
export const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
/** Primeira segunda-feira com a 5×2 em vigor (a partir de 15/12/2026). */
export const FUTURE_START = "2026-12-21";
export const BASE_PEOPLE = DEMO_EMPLOYEES.filter(e => e.group === "S" && e.status === "ativo").length;
export const MAX_PEOPLE = BASE_PEOPLE + 40;
/** Jornada diária proposta para cada limite semanal (intervalo de 1h). */
export const PROPOSED_SHIFTS = {
  42: SERVICE_SHIFTS["5x2-42h"],
  40: SERVICE_SHIFTS["5x2-40h"],
} as const;
export function proposedShift(limit: WeeklyLimit) {
  const plan = PROPOSED_SHIFTS[limit];
  return { ...plan, minutes: shiftMinutes(plan) };
}
/** Necessidade padrão: igual à cobertura de hoje no 6×1 (segunda a sábado) e domingo conforme a escala. */
export function defaultParameters(schedule?: ScheduleStore): SimulatorParameters {
  const weekday = schedule?.rules.daily.S ?? DEFAULT_DAILY_TARGETS.S;
  const base = { start: FUTURE_START, weeklyLimit: 42 as WeeklyLimit, weekdayStaff: weekday,
    saturdayStaff: weekday, sundayStaff: schedule?.rules.sunday.S ?? 0, people: BASE_PEOPLE };
  return { ...base, people: Math.max(BASE_PEOPLE, theoreticalMinimum(base)) };
}
export const DEFAULT_PARAMETERS: SimulatorParameters = defaultParameters();
export const PROJECTED_PEOPLE = DEFAULT_PARAMETERS.people;

export function requiredOn(settings: Pick<SimulatorParameters, "weekdayStaff" | "saturdayStaff" | "sundayStaff">, date: ISODate) {
  const d = dayOfWeek(date);
  return d === 0 ? settings.sundayStaff : d === 6 ? settings.saturdayStaff : settings.weekdayStaff;
}
/** Piso aritmético: jornadas necessárias na semana ÷ 5 jornadas por pessoa (e ninguém pode cobrir 2 vagas no mesmo dia). */
export function theoreticalMinimum(settings: Pick<SimulatorParameters, "weekdayStaff" | "saturdayStaff" | "sundayStaff">) {
  const week = settings.weekdayStaff * 5 + settings.saturdayStaff + settings.sundayStaff;
  return Math.max(Math.ceil(week / 5), settings.weekdayStaff, settings.saturdayStaff, settings.sundayStaff);
}
export function makeScenarioPeople(count: number): ScenarioPerson[] {
  const current = DEMO_EMPLOYEES.filter(e => e.group === "S" && e.status === "ativo").map(e => ({ id: e.id, name: e.name, hired: false }));
  for (let i = current.length; i < count; i++) {
    const n = i - BASE_PEOPLE + 1;
    current.push({ id: "SIM-S-" + String(n).padStart(3, "0"), name: "Reforço simulado " + String(n).padStart(2, "0"), hired: true });
  }
  return current;
}
/** Portaria 12×36: média semanal de horas líquidas (3,5 plantões por semana). */
export function portariaWeeklyAverage() {
  const minutes = shiftMinutes(PORTARIA_SHIFTS.diurno) * 3.5;
  return { minutes, hours: Math.round(minutes / 6) / 10 };
}
export type ScenarioResult = ReturnType<typeof simulate5x2>;

/**
 * Heurística transparente: cada pessoa faz 5 jornadas e 2 folgas por semana. As folgas vão para os
 * dias com mais sobra de gente (quadro − necessidade), preferindo o fim de semana, sem passar de 5 jornadas seguidas.
 */
export function simulate5x2(schedule: ScheduleStore, absences: AbsenceStore, settings: SimulatorParameters) {
  if (settings.start !== startOfWeek(settings.start)) throw new Error("O início da simulação deve ser uma segunda-feira.");
  if (!Number.isInteger(settings.people) || settings.people < BASE_PEOPLE || settings.people > MAX_PEOPLE)
    throw new Error(`Escolha entre ${BASE_PEOPLE} e ${MAX_PEOPLE} pessoas de serviços gerais.`);
  for (const v of [settings.weekdayStaff, settings.saturdayStaff, settings.sundayStaff])
    if (!Number.isInteger(v) || v < 0 || v > settings.people) throw new Error("Necessidade por dia inválida (entre 0 e o quadro simulado).");
  const people = makeScenarioPeople(settings.people);
  const dates = Array.from({ length: 28 }, (_, i) => dateOffset(settings.start, i));
  const shift = proposedShift(settings.weeklyLimit);
  const working = new Map<string, Set<ISODate>>(people.map(p => [p.id, new Set<ISODate>()]));
  const byWeek: PersonWeek[] = [];
  for (let week = 0; week < 4; week++) {
    const days = dates.slice(week * 7, week * 7 + 7);
    // Folgas disponíveis por dia = quadro − necessidade. Cada pessoa tira 2 folgas onde sobra mais gente.
    const spare = days.map(d => people.length - requiredOn(settings, d));
    people.forEach((person, index) => {
      const prior = working.get(person.id)!;
      let best: number[] = [5, 6], bestScore = -Infinity;
      for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
        const off = [a, b];
        const work = days.filter((_, i) => !off.includes(i));
        if (!withinStreak(prior, work)) continue;
        const score = off.reduce((n, i) => n + (spare[i]! > 0 ? 100 + spare[i]! : -100), 0)
          + (a === 5 && b === 6 ? 6 : b === a + 1 ? 2 : 0) + ((index * 7 + a * 3 + b) % 5) / 10;
        if (score > bestScore) { bestScore = score; best = off; }
      }
      best.forEach(i => { spare[i] = (spare[i] ?? 0) - 1; });
      const workDates = days.filter((_, i) => !best.includes(i));
      workDates.forEach(d => prior.add(d));
      const minutes = workDates.length * shift.minutes;
      byWeek.push({ employee: person, week, workingDates: workDates, restDates: days.filter((_, i) => best.includes(i)),
        minutes, overWeeklyLimit: minutes > settings.weeklyLimit * 60, consecutiveViolation: !withinStreak(new Set(), [...prior]) });
    });
  }
  const isAway = (id: string, d: ISODate) => absences.entries.some(a => a.employeeId === id && a.status === "aprovado" && a.start <= d && a.end >= d);
  const coverage: DayCoverage[] = dates.map(date => {
    const planned = people.filter(p => working.get(p.id)!.has(date));
    const absent = planned.filter(p => !p.hired && isAway(p.id, date)).length;
    const required = requiredOn(settings, date);
    const available = planned.length - absent;
    // Referência 6×1: todos de segunda a sábado, domingo de folga.
    const base = dayOfWeek(date) === 0 ? [] : DEMO_EMPLOYEES.filter(e => e.group === "S" && e.status === "ativo");
    const baseline = base.length - base.filter(e => isAway(e.id, date)).length;
    return { date, weekday: (dayOfWeek(date) + 6) % 7, required, planned: planned.length, absent, available,
      deficit: Math.max(0, required - available), baseline, baselineDeficit: Math.max(0, required - baseline) };
  });
  const totalRequired = coverage.reduce((n, c) => n + c.required, 0);
  const deficitCount = coverage.reduce((n, c) => n + c.deficit, 0);
  const personSummary = people.map(person => {
    const weeks = byWeek.filter(w => w.employee.id === person.id);
    return { employee: person, weeks, totalMinutes: weeks.reduce((n, w) => n + w.minutes, 0),
      shiftCount: weeks.reduce((n, w) => n + w.workingDates.length, 0),
      weekendsOff: weeks.filter(w => w.restDates.some(d => dayOfWeek(d) === 0) && w.restDates.some(d => dayOfWeek(d) === 6)).length };
  });
  return {
    settings, dates, people, byWeek, personSummary, coverage, shift,
    minimum: theoreticalMinimum(settings),
    portaria: portariaWeeklyAverage(),
    metrics: {
      headcount: people.length, newHires: people.length - BASE_PEOPLE, weeklyCapacity: people.length * 5,
      weeklyNeed: settings.weekdayStaff * 5 + settings.saturdayStaff + settings.sundayStaff,
      deficitCount, totalRequired, uncoveredDays: coverage.filter(c => c.deficit).length,
      coverageRate: totalRequired ? Math.max(0, Math.min(100, (totalRequired - deficitCount) / totalRequired * 100)) : 100,
      saturdayDeficit: coverage.filter(c => c.weekday === 5).reduce((n, c) => n + c.deficit, 0),
      sundayDeficit: coverage.filter(c => c.weekday === 6).reduce((n, c) => n + c.deficit, 0),
      badHours: byWeek.filter(w => w.overWeeklyLimit).length,
      restViolations: byWeek.filter(w => w.consecutiveViolation).length,
      baselineDeficit: coverage.reduce((n, c) => n + c.baselineDeficit, 0),
    },
  };
}
/** No máximo 5 jornadas seguidas (inclusive emendando com a semana anterior). */
function withinStreak(prior: Set<ISODate>, work: ISODate[]) {
  const all = new Set([...prior, ...work]);
  for (const d of work) {
    let run = 1;
    for (let k = 1; k <= 5 && all.has(dateOffset(d, -k)); k++) run++;
    if (run > 5) return false;
  }
  return true;
}
