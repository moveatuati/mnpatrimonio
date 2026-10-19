import { DEMO_EMPLOYEES, demoPunches } from "../demo-data";
import { GROUPS, RULES } from "../config";
import { classifyArrival } from "./punctuality";
import type { Employee, ISODate, PunchRecord } from "../types";

/**
 * Total mensal de entradas acima do alerta operacional até a data selecionada.
 * Somente registros que efetivamente contêm entrada acima de 10 min contam.
 * Faltas de marcação não são atrasos; dias posteriores não entram no cálculo.
 * Nesta fase, toda a origem é a demonstração determinística (sem ponto real).
 */
export function countMonthlyLateArrivals(
  throughDate: ISODate,
  employees: Employee[] = DEMO_EMPLOYEES,
  getPunches: (day: ISODate, employees: Employee[]) => PunchRecord[] = demoPunches,
): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(employees.map(e => [e.id, 0]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(throughDate)) return result;
  const [year = 0, month = 0, day = 0] = throughDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > lastDay) return result;

  for (let dateDay = 1; dateDay <= day; dateDay++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`;
    for (const punch of getPunches(date, employees)) {
      const employee = employees.find(e => e.id === punch.employeeId);
      if (!employee || !punch.entry) continue;
      const planned = GROUPS[employee.group].shift.start;
      if (classifyArrival(planned, punch.entry, RULES.lateAlertMinutes).status === "atraso_acima") {
        result[punch.employeeId] = (result[punch.employeeId] ?? 0) + 1;
      }
    }
  }
  return result;
}
