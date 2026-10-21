import { GROUPS, GROUP_IDS, RULES, SPECIAL_SLOT_LABEL } from "./config";
import { demoPunches, DEMO_EMPLOYEES } from "./demo-data";
import { movementPeriod } from "./movement";
import { coverageOverDay, groupCoverage } from "./rules/coverage";
import { classifyArrival } from "./rules/punctuality";
import { checkRestBetween } from "./rules/rest";
import { DEFAULT_SCHEDULE, assignmentFor, dayOfWeek, requiredFor, shiftFor, type ScheduleStore } from "./schedule";
import { toMinutes } from "./time";
import type { AbsenceStore } from "./absences";
import type { AttentionAlert, Employee, GroupId, ISODate } from "./types";

/**
 * Visão do dia a partir da ESCALA: só entra quem está escalado, sem folga e sem férias/atestado aprovados.
 * Em domingos/feriados o código A/B/C passa a ser o turno especial (08h, 09h, 15h15).
 */
export function buildDashboard(date: ISODate, employees: Employee[] = DEMO_EMPLOYEES,
  schedule: ScheduleStore = DEFAULT_SCHEDULE, absences: AbsenceStore | null = null) {
  const special = dayOfWeek(date) === 0 || schedule.rules.holidays.includes(date);
  const absentIds = new Set((absences?.entries ?? []).filter(a => a.status === "aprovado" && a.start <= date && a.end >= date).map(a => a.employeeId));
  const active = employees.filter((e) => e.status === "ativo");
  const withSlot = active.map(e => ({ e, slot: assignmentFor(schedule, e, date) }));
  const absentScheduled = withSlot.filter(x => x.slot !== null && absentIds.has(x.e.id)).length;
  const scheduled: Employee[] = withSlot.filter(x => x.slot !== null && !absentIds.has(x.e.id))
    .map(x => ({ ...x.e, group: x.slot as GroupId }));
  const restCount = withSlot.filter(x => x.slot === null).length;
  const shiftPattern = (e: Employee) => {
    const s = shiftFor(date, e.group, schedule.rules);
    return special ? { start: s.start, breakStart: s.end, breakEnd: s.end, end: s.end } : GROUPS[e.group].shift;
  };
  const labels = Object.fromEntries(GROUP_IDS.map(g => {
    const s = shiftFor(date, g, schedule.rules);
    return [g, { name: special ? SPECIAL_SLOT_LABEL[g] : GROUPS[g].name, start: s.start, end: s.end }];
  })) as Record<GroupId, { name: string; start: string; end: string }>;
  const punches = demoPunches(date, scheduled, (e) => shiftPattern(e).start);
  const arrivals = scheduled
    .map((e) => {
      const p = punches.find((x) => x.employeeId === e.id);
      const planned = shiftPattern(e).start;
      return { employee: e, planned, entry: p?.entry, ...classifyArrival(planned, p?.entry) };
    })
    .sort((a, b) => toMinutes(a.entry ?? "23:59") - toMinutes(b.entry ?? "23:59"));

  const required = Object.fromEntries(GROUP_IDS.map((g) => [g, requiredFor(schedule, date, g)])) as Record<GroupId, number>;
  const coverage = groupCoverage(scheduled, required);

  const alerts: AttentionAlert[] = [];
  const above = arrivals.filter((a) => a.status === "atraso_acima");
  const missing = arrivals.filter((a) => a.status === "sem_registro");
  if (above.length)
    alerts.push({
      id: "late",
      severity: "atencao",
      category: "ponto",
      title: `${above.length} entrada(s) acima do alerta de ${RULES.lateAlertMinutes} min`,
      detail: "Alerta operacional interno — não representa tolerância legal ou desconto.",
    });
  if (missing.length)
    alerts.push({
      id: "missing",
      severity: "critico",
      category: "ponto",
      title: `${missing.length} colaborador(es) sem entrada registrada`,
      detail: `Conferir marcação: ${missing.map((m) => `${m.employee.name} (${labels[m.employee.group].name})`).join(", ")}. Ausência não confirmada — falta de registro não comprova falta.`,
    });
  coverage
    .filter((c) => c.balance < 0)
    .forEach((c) =>
      alerts.push({
        id: `cov-${c.group}`,
        severity: "critico",
        category: "cobertura",
        title: `Faltam ${-c.balance} pessoa(s) — ${labels[c.group].name}`,
        detail: `${c.scheduled} escalados para ${c.required} necessários (já descontadas folgas e férias).`,
      }),
    );
  // Lembrete permanente da regra de 11h: grupo C (saída 22h) x abertura no dia seguinte.
  const restC = checkRestBetween(date, GROUPS.C.shift.end, date, GROUPS.B.shift.start);
  alerts.push({
    id: "rest-rule",
    severity: "info",
    category: "descanso",
    title: "Lembrete: 11h de descanso entre jornadas",
    detail: `Quem sai às ${GROUPS.C.shift.end} só pode entrar a partir das ${restC.earliestStart.time} do dia seguinte. A escala bloqueia trocas que desrespeitem essa regra.`,
  });

  return {
    day: { special, rest: restCount, absent: absentScheduled, period: movementPeriod(date) },
    labels,
    kpis: {
      scheduled: scheduled.length,
      entries: arrivals.filter((a) => a.entry).length,
      aboveAlert: above.length,
      missing: missing.length,
    },
    arrivals,
    coverage,
    alerts,
    timeline: coverageOverDay(scheduled, 20, "06:40", "22:20", shiftPattern),
  };
}

