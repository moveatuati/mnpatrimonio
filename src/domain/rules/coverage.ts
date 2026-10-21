import { GROUPS, GROUP_IDS } from "../config";
import { fromMinutes, toMinutes } from "../time";
import type { Employee, GroupId, ShiftPattern } from "../types";

export function isWorkingAt(shift: ShiftPattern, minute: number): boolean {
  const s = toMinutes(shift.start);
  const bs = toMinutes(shift.breakStart);
  const be = toMinutes(shift.breakEnd);
  const e = toMinutes(shift.end);
  return (minute >= s && minute < bs) || (minute >= be && minute < e);
}

export interface CoverageSlot {
  time: string;
  total: number;
  byGroup: Record<GroupId, number>;
}

/** Quantidade de colaboradores em atividade ao longo do dia (passos de 20 min). */
export function coverageOverDay(scheduled: Employee[], step = 20, from = "06:40", to = "22:20",
  shiftOf: (e: Employee) => ShiftPattern = (e) => GROUPS[e.group].shift): CoverageSlot[] {
  const slots: CoverageSlot[] = [];
  for (let m = toMinutes(from); m <= toMinutes(to); m += step) {
    const byGroup = { A: 0, B: 0, C: 0 } as Record<GroupId, number>;
    for (const e of scheduled) if (isWorkingAt(shiftOf(e), m)) byGroup[e.group]++;
    slots.push({ time: fromMinutes(m), total: byGroup.A + byGroup.B + byGroup.C, byGroup });
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
