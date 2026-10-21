/** Folhas para impressão (escala de domingo e semana), no formato de papel usado nos condomínios. */
import { GROUPS, GROUP_IDS, PORTARIA_SHIFTS, REGIME_LABEL, employeeShift, serviceRegime } from "./config";
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
  blocks: { slot: GroupId; key: string; title: string; target: number; rows: SundaySheetRow[] }[];
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

/** Escala de domingo: portaria diurna, portaria noturna e serviços gerais (com as folgas compensatórias). */
export function sundaySheet(store: ScheduleStore, date: ISODate): SundaySheet {
  const sunday = dayOfWeek(date) === 0 ? date : sundayOf(date);
  const monday = startOfWeek(sunday);
  const rowsOf = (list: Employee[], withRests: boolean) => list.map(employee => ({
    employee,
    folgaAntecipada: withRests ? firstRest(store, employee, monday) : null,
    folga7Dia: withRests ? firstRest(store, employee, dateOffset(monday, 7)) : null,
  }));
  const working = DEMO_EMPLOYEES.filter(e => assignmentFor(store, e, sunday) !== null);
  const portaria = working.filter(e => e.group === "P");
  const blocks = [
    { slot: "P" as GroupId, key: "P-diurno", title: "PORTARIA 12×36 · " + PORTARIA_SHIFTS.diurno.label.toUpperCase(),
      target: Math.ceil(store.rules.sunday.P / 2), rows: rowsOf(portaria.filter(e => e.turn !== "noturno"), false) },
    { slot: "P" as GroupId, key: "P-noturno", title: "PORTARIA 12×36 · " + PORTARIA_SHIFTS.noturno.label.toUpperCase(),
      target: Math.floor(store.rules.sunday.P / 2), rows: rowsOf(portaria.filter(e => e.turn === "noturno"), false) },
    { slot: "S" as GroupId, key: "S", title: "SERVIÇOS GERAIS · " + employeeShift({ group: "S" }, sunday).label.toUpperCase(),
      target: store.rules.sunday.S, rows: rowsOf(working.filter(e => e.group === "S"), true) },
  ];
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

/** Folha da semana (segunda a domingo): X = trabalha, FOLGA, FÉRIAS. */
export function weekSheet(store: ScheduleStore, absences: AbsenceStore | null, date: ISODate): WeekSheet {
  const monday = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => dateOffset(monday, i));
  const active = (employeeId: string, day: ISODate) => absences?.entries.find(a =>
    a.employeeId === employeeId && a.status === "aprovado" && a.start <= day && a.end >= day);
  const groups = GROUP_IDS.map(group => {
    const shift = employeeShift({ group }, monday);
    return {
      group,
      title: group === "P"
        ? "AGENTE DE PORTARIA · 12×36 · DIURNO " + PORTARIA_SHIFTS.diurno.start + "–" + PORTARIA_SHIFTS.diurno.end + " / NOTURNO " + PORTARIA_SHIFTS.noturno.start + "–" + PORTARIA_SHIFTS.noturno.end
        : GROUPS[group].name.toUpperCase() + " · " + REGIME_LABEL[serviceRegime(monday)].toUpperCase() + " · " + shift.start + " ÀS " + shift.breakStart + " / " + shift.breakEnd + " ÀS " + shift.end,
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
