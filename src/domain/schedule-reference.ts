import { DEMO_EMPLOYEES } from "./demo-data";
import { GROUPS, GROUP_IDS, RULES, SUNDAY_SHIFTS } from "./config";
import {
  adjacentRestProblems, coverageFor, dateOffset, dayOfWeek, isScheduleDate,
  overrideKey, scheduleForDate, validateChanges,
  type AssignmentChange, type DailyCoverageTargets, type ScheduleStore,
} from "./schedule";
import { toMinutes } from "./time";

/** Artefato em memória: nenhuma gravação, migração ou aprovação oficial. */
export interface OperationalReference {
  schemaVersion: 1;
  revision: number;
  previousRevision: number | null;
  status: "aguardando-homologacao";
  start: string;
  end: string;
  dates: string[];
  source: ScheduleStore;
  shifts: typeof GROUPS;
  sundayShifts: typeof SUNDAY_SHIFTS;
  minRestHours: number;
  roster: ReturnType<typeof scheduleForDate>[];
  pending: string[];
  conflicts: string[];
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Sem folgas inventadas: congela o rascunho existente e explicita seus conflitos. */
export function prepareOperationalReference(
  store: ScheduleStore, start: string, previous?: OperationalReference,
): OperationalReference {
  if (!isScheduleDate(start) || dayOfWeek(start) !== 1)
    throw new Error("A referência deve começar em uma segunda-feira válida.");
  const source = clone(store);
  const dates = Array.from({ length: 28 }, (_, i) => dateOffset(start, i));
  return {
    schemaVersion: 1, revision: (previous?.revision ?? 0) + 1,
    previousRevision: previous?.revision ?? null, status: "aguardando-homologacao",
    start, end: dateOffset(start, 27), dates, source,
    shifts: clone(GROUPS), sundayShifts: clone(SUNDAY_SHIFTS), minRestHours: RULES.minRestHours,
    roster: dates.map(date => clone(scheduleForDate(source, date))),
    pending: ["Escala nominal e folgas úteis confirmadas pela gerência para os 28 dias.",
      "Metas operacionais por data, inclusive dias úteis com folgas.",
      "Escala confirmada dos seis dias anteriores e posteriores (limites do ciclo).",
      "Disponibilidade, jornadas especiais, intervalos dominicais e validação jurídica."],
    conflicts: [...new Set(dates.flatMap(date => DEMO_EMPLOYEES.flatMap(employee =>
      adjacentRestProblems(source, employee, date))))],
  };
}

/** Checagem técnica de uma proposta integral; nunca homologa nem aplica o lote. */
export function reviewOperationalProposal(
  reference: OperationalReference, changes: AssignmentChange[], targets: DailyCoverageTargets, weeklyLimitMinutes?: number,
) {
  const errors: string[] = [];
  if (weeklyLimitMinutes === undefined || !Number.isInteger(weeklyLimitMinutes) || weeklyLimitMinutes <= 0)
    errors.push("Limite semanal não confirmado pelo RH/jurídico.");
  const requiredDates = Array.from({ length: 40 }, (_, i) => dateOffset(reference.start, i - 6));
  const keys = new Set(changes.map(change => overrideKey(change.date, change.employeeId)));
  for (const date of requiredDates) {
    for (const employee of DEMO_EMPLOYEES.filter(e => e.status === "ativo")) {
      if (!keys.has(overrideKey(date, employee.id)))
        errors.push("Escala nominal não confirmada: " + date + " / " + employee.id);
    }
    if (reference.dates.includes(date) && !targets[date]) errors.push("Meta não confirmada: " + date);
  }
  if (changes.some(change => !requiredDates.includes(change.date))) errors.push("Alteração fora do período e contexto de 40 dias.");
  // Validação usa a configuração atual; uma revisão exige que os horários congelados permaneçam iguais.
  if (JSON.stringify(reference.shifts) !== JSON.stringify(GROUPS) ||
      JSON.stringify(reference.sundayShifts) !== JSON.stringify(SUNDAY_SHIFTS) || reference.minRestHours !== RULES.minRestHours)
    errors.push("Parâmetros de jornada alterados: preparar nova revisão da referência.");
  const validation = validateChanges(reference.source, changes, targets);
  errors.push(...validation.errors);
  const next = { ...reference.source, overrides: { ...reference.source.overrides } };
  for (const change of changes) next.overrides[overrideKey(change.date, change.employeeId)] = change.group;
  if (!validation.errors.some(error => error.includes("Data inválida"))) {
    for (const date of reference.dates) {
      const target = targets[date];
      for (const row of coverageFor(next, date)) {
        const required = target?.[row.group];
        if (required === undefined || !Number.isInteger(required) || required < 0 || row.assigned < required)
          errors.push("Cobertura não demonstrada: " + date + " / " + row.group);
      }
      for (const employee of DEMO_EMPLOYEES) errors.push(...adjacentRestProblems(next, employee, date));
    }
  }
  // Jornadas-base são 7h20; domingo é 6h15 sem intervalo informado. Limite semanal depende do jurídico.
  const weeklyMinutes = DEMO_EMPLOYEES.map(employee => ({
    employeeId: employee.id,
    weeks: Array.from({ length: 4 }, (_, week) => reference.dates.slice(week * 7, week * 7 + 7)
      .reduce((total, date) => {
        const group = next.overrides[overrideKey(date, employee.id)];
        if (!group) return total;
        if (dayOfWeek(date) === 0 || next.rules.holidays.includes(date)) {
          const shift = reference.sundayShifts[GROUP_IDS.indexOf(group)];
          return total + (shift ? toMinutes(shift.end) - toMinutes(shift.start) : 0);
        }
        const shift = reference.shifts[group]?.shift;
        if (!shift) return total;
        return total + toMinutes(shift.breakStart) - toMinutes(shift.start) + toMinutes(shift.end) - toMinutes(shift.breakEnd);
      }, 0)),
  }));
  if (weeklyLimitMinutes !== undefined) for (const employee of weeklyMinutes) {
    employee.weeks.forEach((minutes, week) => {
      if (minutes > weeklyLimitMinutes) errors.push(employee.employeeId + ": jornada semanal excedida na semana " + (week + 1));
    });
  }
  return { technicallyValid: errors.length === 0, errors: [...new Set(errors)], weeklyMinutes,
    status: "aguardando-homologacao" as const };
}