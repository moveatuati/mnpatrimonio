import { describe, expect, it } from "vitest";
import { countMonthlyLateArrivals } from "./late-history";
import { GROUPS } from "../config";
import type { Employee, PunchRecord, ISODate } from "../types";

const employee = (id: string, group: "A" | "B" | "C"): Employee => ({
  id, name: id, group, status: "ativo", demo: true,
});
const emps: Employee[] = [employee("A1","A"), employee("B1","B"), employee("C1","C")];
const marks: Record<string, string[]> = {
  "2026-10-01": ["07:11", "08:10", "12:52"],
  "2026-10-02": ["07:10", "08:12", "12:40"],
  "2026-10-03": ["07:25", "08:15", ""],
  "2026-10-04": ["07:15", "", "12:53"],
};
const getPunches = (date: ISODate, employees: Employee[]): PunchRecord[] =>
  employees.map((emp, index) => {
    const time = marks[date]?.[index];
    return time ? { employeeId: emp.id, date, entry: time } : { employeeId: emp.id, date };
  });

describe("Histórico demonstrativo mensal de atrasos", () => {
  it("conta somente acima de 10 min, até o dia consultado", () => {
    expect(countMonthlyLateArrivals("2026-10-01", emps, getPunches)).toEqual({A1:1,B1:0,C1:1});
    expect(countMonthlyLateArrivals("2026-10-02", emps, getPunches)).toEqual({A1:1,B1:1,C1:1});
    expect(countMonthlyLateArrivals("2026-10-03", emps, getPunches)).toEqual({A1:2,B1:2,C1:1});
    expect(countMonthlyLateArrivals("2026-10-04", emps, getPunches)).toEqual({A1:3,B1:2,C1:2});
  });
  it("ignora ausência de registro e zera ao virar mês", () => {
    expect(countMonthlyLateArrivals("2026-11-02", emps, getPunches)).toEqual({A1:0,B1:0,C1:0});
    expect(countMonthlyLateArrivals("2026-10-03", [emps[0]!], getPunches)).toEqual({A1:2});
  });
  it("não soma dias posteriores nem aceita datas inválidas", () => {
    expect(countMonthlyLateArrivals("2026-10-32", emps, getPunches)).toEqual({A1:0,B1:0,C1:0});
    expect(countMonthlyLateArrivals("2026-10-01", emps, getPunches).A1).toBe(1);
  });
  it("mantém a entrada base de cada grupo correta", () => {
    expect(GROUPS.A.shift.start).toBe("07:00");
    expect(GROUPS.B.shift.start).toBe("08:00");
    expect(GROUPS.C.shift.start).toBe("12:40");
  });
});
