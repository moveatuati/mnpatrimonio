import { GROUPS, RULES } from "./config";
import { demoPunches } from "./demo-data";
import { isValidReferenceDate } from "./operation-query";
import { classifyArrival } from "./rules/punctuality";
import { toMinutes } from "./time";
import type { ArrivalStatus, Employee, ISODate } from "./types";

export interface EmployeeDemoDay {
  date: ISODate;
  weekday: string;
  planned: string;
  entry: string | null;
  difference: number | null;
  status: ArrivalStatus;
}

export interface EmployeeDemoReport {
  employee: Employee;
  referenceDate: ISODate;
  periodStart: ISODate;
  days: EmployeeDemoDay[];
  totals: {
    recorded: number;
    onTime: number;
    withinAlert: number;
    aboveAlert: number;
    withoutEntry: number;
  };
}

/** Histórico de demonstração. Não há escala real por dia ou comprovante de presença. */
export function buildEmployeeDemoReport(employee: Employee, throughDate: ISODate): EmployeeDemoReport {
  if (!isValidReferenceDate(throughDate)) throw new Error("Data de referência inválida");
  const [year = 0, month = 0, day = 0] = throughDate.split("-").map(Number);
  const planned = GROUPS[employee.group].shift.start;
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const days: EmployeeDemoDay[] = [];
  for (let i = 1; i <= day; i++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const entry = demoPunches(date, [employee])[0]?.entry ?? null;
    const status = classifyArrival(planned, entry ?? undefined, RULES.lateAlertMinutes).status;
    days.push({
      date,
      weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
        .format(new Date(`${date}T12:00:00Z`)).replace(".", ""),
      planned,
      entry,
      difference: entry === null ? null : toMinutes(entry) - toMinutes(planned),
      status,
    });
  }
  const total = (status: ArrivalStatus) => days.filter(row => row.status === status).length;
  return {
    employee, referenceDate: throughDate, periodStart, days,
    totals: {
      recorded: days.filter(row => row.entry !== null).length,
      onTime: total("no_horario"),
      withinAlert: total("atraso_alerta"),
      aboveAlert: total("atraso_acima"),
      withoutEntry: total("sem_registro"),
    },
  };
}
