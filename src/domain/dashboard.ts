import { GROUPS, GROUP_IDS, LABOR_LAW, PORTARIA_SHIFTS, REGIME_LABEL, RULES, employeeShift, serviceRegime } from "./config";
import { demoPunches, DEMO_EMPLOYEES } from "./demo-data";
import { coverageOverDay, groupCoverage } from "./rules/coverage";
import { classifyArrival } from "./rules/punctuality";
import { checkRestBetween } from "./rules/rest";
import { DEFAULT_SCHEDULE, assignmentFor, dayOfWeek, requiredFor, shiftFor, type ScheduleStore } from "./schedule";
import { toMinutes } from "./time";
import type { AbsenceStore } from "./absences";
import type { AttentionAlert, Employee, GroupId, ISODate } from "./types";

/**
 * Visão do dia a partir da ESCALA: só entra quem está escalado, sem folga e sem férias/atestado aprovados.
 * Portaria 12×36 (turmas diurna/noturna em dias alternados) e serviços gerais no regime legal da data.
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
  const shiftPattern = (e: Employee) => employeeShift(e, date);
  const labels = Object.fromEntries(GROUP_IDS.map(g => {
    const s = shiftFor(date, g, schedule.rules);
    return [g, g === "P"
      ? { name: GROUPS.P.name + " · 12×36", start: "Diurno " + PORTARIA_SHIFTS.diurno.start + "–" + PORTARIA_SHIFTS.diurno.end, end: "Noturno " + PORTARIA_SHIFTS.noturno.start + "–" + PORTARIA_SHIFTS.noturno.end }
      : { name: GROUPS.S.name + " · " + REGIME_LABEL[serviceRegime(date)], start: s.start, end: s.end }];
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
  // Lembrete permanente das regras de descanso.
  const restS = checkRestBetween(date, employeeShift({ group: "S" }, date).end, date, "00:00", RULES.minRestHours);
  alerts.push({
    id: "rest-rule",
    severity: "info",
    category: "descanso",
    title: "Lembrete: descanso entre jornadas",
    detail: `Portaria 12×36: depois de 12h, 36h de descanso (art. 59-A da CLT). Serviços gerais: mínimo de ${RULES.minRestHours}h entre jornadas — quem sai às ${employeeShift({ group: "S" }, date).end} volta a partir das ${restS.earliestStart.time} do dia seguinte. A escala bloqueia trocas que desrespeitem essas regras.`,
  });
  const regime = serviceRegime(date);
  if (regime === "6x1" && date >= "2026-11-15")
    alerts.push({
      id: "law-transition", severity: "atencao", category: "escala",
      title: `Transição para a 5×2 em ${LABOR_LAW.fiveTwoStart.split("-").reverse().join("/")}`,
      detail: `${LABOR_LAW.amendment}: serviços gerais passam a 5×2 com 42h semanais. Revise contratos e a convenção coletiva.`,
    });

  return {
    day: { special, rest: restCount, absent: absentScheduled, regime, regimeLabel: REGIME_LABEL[regime] },
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
    timeline: coverageOverDay(scheduled, 30, "00:00", "23:30", shiftPattern),
  };
}

