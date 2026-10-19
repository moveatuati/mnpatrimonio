import { GROUPS, GROUP_IDS, RULES } from "./config";
import { demoPunches, DEMO_EMPLOYEES } from "./demo-data";
import { coverageOverDay, groupCoverage } from "./rules/coverage";
import { classifyArrival } from "./rules/punctuality";
import { checkRestBetween } from "./rules/rest";
import { toMinutes } from "./time";
import type { AttentionAlert, Employee, GroupId, ISODate } from "./types";

export function buildDashboard(date: ISODate, employees: Employee[] = DEMO_EMPLOYEES) {
  const scheduled = employees.filter((e) => e.status === "ativo");
  const punches = demoPunches(date, scheduled);
  const arrivals = scheduled
    .map((e) => {
      const p = punches.find((x) => x.employeeId === e.id);
      const planned = GROUPS[e.group].shift.start;
      return { employee: e, planned, entry: p?.entry, ...classifyArrival(planned, p?.entry) };
    })
    .sort((a, b) => toMinutes(a.entry ?? "23:59") - toMinutes(b.entry ?? "23:59"));

  const required = Object.fromEntries(GROUP_IDS.map((g) => [g, GROUPS[g].requiredStaff])) as Record<GroupId, number>;
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
      detail: missing.map((m) => m.employee.name).join(", "),
    });
  coverage
    .filter((c) => c.balance < 0)
    .forEach((c) =>
      alerts.push({
        id: `cov-${c.group}`,
        severity: "critico",
        category: "cobertura",
        title: `Déficit no grupo ${c.group} — ${GROUPS[c.group].name}`,
        detail: `${c.scheduled} escalados para ${c.required} necessários.`,
      }),
    );
  // Lembrete permanente da regra de 11h: grupo C (saída 22h) x abertura no dia seguinte.
  const restC = checkRestBetween(date, GROUPS.C.shift.end, date, GROUPS.B.shift.start);
  alerts.push({
    id: "rest-rule",
    severity: "info",
    category: "descanso",
    title: "Regra de 11h entre jornadas ativa",
    detail: `Quem encerra às ${GROUPS.C.shift.end} só pode iniciar a partir das ${restC.earliestStart.time} do dia seguinte. Trocas do grupo C para A ou B no dia seguinte serão bloqueadas.`,
  });

  return {
    kpis: {
      scheduled: scheduled.length,
      entries: arrivals.filter((a) => a.entry).length,
      aboveAlert: above.length,
      missing: missing.length,
    },
    arrivals,
    coverage,
    alerts,
    timeline: coverageOverDay(scheduled),
  };
}
