import { GROUP_IDS, employeeShift } from "../config";
import { fromMinutes, toMinutes } from "../time";
import type { Employee, GroupId, ShiftPattern } from "../types";

/** Faixa [a, b) em minutos do dia, atravessando a meia-noite quando b <= a (turno noturno). */
function inRange(minute: number, a: number, b: number) {
  return b > a ? minute >= a && minute < b : minute >= a || minute < b;
}
export function isWorkingAt(shift: ShiftPattern, minute: number): boolean {
  const m = ((minute % 1440) + 1440) % 1440;
  return inRange(m, toMinutes(shift.start), toMinutes(shift.end)) &&
    !inRange(m, toMinutes(shift.breakStart), toMinutes(shift.breakEnd));
}

export interface CoverageSlot {
  time: string;
  total: number;
  byGroup: Record<GroupId, number>;
}

/** Quantidade de colaboradores em atividade ao longo do dia (passos de 20 min). */
export function coverageOverDay(scheduled: Employee[], step = 20, from = "00:00", to = "23:40",
  shiftOf: (e: Employee) => ShiftPattern = (e) => employeeShift(e)): CoverageSlot[] {
  const slots: CoverageSlot[] = [];
  for (let m = toMinutes(from); m <= toMinutes(to); m += step) {
    const byGroup: Record<GroupId, number> = { P: 0, S: 0 };
    for (const e of scheduled) if (isWorkingAt(shiftOf(e), m)) byGroup[e.group]++;
    slots.push({ time: fromMinutes(m), total: byGroup.P + byGroup.S, byGroup });
  }
  return slots;
}

export interface GroupCoverage {
  group: GroupId;
  scheduled: number;
  required: number;
  balance: number;
}

export function groupCoverage(scheduled: Employee[], required: Record<GroupId, number>): GroupCoverage[] {
  return GROUP_IDS.map((g) => {
    const n = scheduled.filter((e) => e.group === g).length;
    return { group: g, scheduled: n, required: required[g], balance: n - required[g] };
  });
}
