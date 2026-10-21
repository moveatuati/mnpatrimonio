/** Folhas no mesmo formato do papel usado hoje pela Formosa (escala de domingo e folgas da semana). */
import { GROUPS, GROUP_IDS, SPECIAL_SLOT_LABEL } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { assignmentFor, dateOffset, dayOfWeek, restReason, startOfWeek, sundayOf, type ScheduleStore } from "./schedule";
import type { Employee, GroupId, ISODate } from "./types";

export interface SundaySheetRow {
  employee: Employee;
  folgaAntecipada: ISODate | null;
  folga7Dia: ISODate | null;
}
export interface SundaySheet {
  date: ISODate;
  blocks: { slot: GroupId; title: string; target: number; rows: SundaySheetRow[] }[];
  total: number;
  target: number;
}

function firstRest(store: ScheduleStore, employee: Employee, monday: ISODate): ISODate | null {
  for (let i = 0; i < 5; i++) {
    const day = dateOffset(monday, i);
    if (assignmentFor(store, employee, day) === null) return day;
  }
  return null;
}

/** Escala de domingo: três blocos (08h, 09h, 15h15) com folga antecipada e folga do 7º dia. */
export function sundaySheet(store: ScheduleStore, date: ISODate): SundaySheet {
  const sunday = dayOfWeek(date) === 0 ? date : sundayOf(date);
  const monday = startOfWeek(sunday);
  const blocks = GROUP_IDS.map(slot => {
    const rows = DEMO_EMPLOYEES.filter(e => assignmentFor(store, e, sunday) === slot).map(employee => ({
      employee,
      folgaAntecipada: firstRest(store, employee, monday),
      folga7Dia: firstRest(store, employee, dateOffset(monday, 7)),
    }));
    return { slot, title: "ENTRADA " + SPECIAL_SLOT_LABEL[slot].replace("Turno das ", "DE ").toUpperCase(), target: store.rules.sunday[slot], rows };
  });
  return {
    date: sunday, blocks,
    total: blocks.reduce((n, b) => n + b.rows.length, 0),
    target: GROUP_IDS.reduce((n, g) => n + store.rules.sunday[g], 0),
  };
}

export type WeekCell = "trabalha" | "folga" | "ferias" | "atestado" | "afastamento";
export interface WeekSheetRow {
  employee: Employee;
  cells: { date: ISODate; status: WeekCell; detail: string }[];
}
export interface WeekSheet {
  monday: ISODate;
  days: ISODate[];
  groups: { group: GroupId; title: string; rows: WeekSheetRow[] }[];
  restsPerDay: number[];
}

/** Folha da semana (segunda a sábado), como a planilha de papel: X = trabalha, FOLGA, FÉRIAS. */
export function weekSheet(store: ScheduleStore, absences: AbsenceStore | null, date: ISODate): WeekSheet {
  const monday = startOfWeek(date);
  const days = Array.from({ length: 6 }, (_, i) => dateOffset(monday, i));
  const active = (employeeId: string, day: ISODate) => absences?.entries.find(a =>
    a.employeeId === employeeId && a.status === "aprovado" && a.start <= day && a.end >= day);
  const groups = GROUP_IDS.map(group => {
    const shift = GROUPS[group].shift;
    return {
      group,
      title: GROUPS[group].name.toUpperCase() + " · " + shift.start + " ÀS " + shift.breakStart + " / " + shift.breakEnd + " ÀS " + shift.end,
      rows: DEMO_EMPLOYEES.filter(e => e.group === group).map(employee => ({
        employee,
        cells: days.map(day => {
          const absence = active(employee.id, day);
          if (absence) return { date: day, status: absence.type as WeekCell, detail: absence.type === "ferias" ? "Férias" : absence.type === "atestado" ? "Atestado" : "Afastamento" };
          const reason = restReason(store, employee, day);
          return reason ? { date: day, status: "folga" as const, detail: reason } : { date: day, status: "trabalha" as const, detail: "Trabalha" };
        }),
      })),
    };
  });
  const restsPerDay = days.map((_, i) => groups.reduce((n, g) => n + g.rows.filter(r => r.cells[i]!.status === "folga").length, 0));
  return { monday, days, groups, restsPerDay };
}
