import { DEMO_EMPLOYEES, demoPunches } from "../demo-data";
import { RULES, employeeShift } from "../config";
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

  const employeesById = new Map(employees.map(employee => [employee.id, employee]));
  for (let dateDay = 1; dateDay <= day; dateDay++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`;
    for (const punch of getPunches(date, employees)) {
      const employee = employeesById.get(punch.employeeId);
      if (!employee || !punch.entry) continue;
      const planned = employeeShift(employee, date).start;
      if (classifyArrival(planned, punch.entry, RULES.lateAlertMinutes).status === "atraso_acima") {
        result[punch.employeeId] = (result[punch.employeeId] ?? 0) + 1;
      }
    }
  }
  return result;
}

/**
 * Top de reincidência de atrasos do mês considerando os três grupos.
 * Critério: quantidade de ocorrências acima de 10 minutos, com desempate
 * por nome e identificador para não variar a ordem ao atualizar a página.
 */
export function rankMonthlyLateArrivals<T extends Pick<Employee, "id" | "name" | "group">>(
  employees: readonly T[],
  totals: Readonly<Record<string, number>>,
  limit = 5,
): Array<{ employee: T; count: number }> {
  return employees
    .map((employee) => ({ employee, count: totals[employee.id] ?? 0 }))
    .filter(({ count }) => Number.isFinite(count) && count > 0)
    .sort((a, b) => b.count - a.count ||
      a.employee.name.localeCompare(b.employee.name, "pt-BR") ||
      a.employee.id.localeCompare(b.employee.id))
    .slice(0, Math.max(0, Math.trunc(limit)));
}
