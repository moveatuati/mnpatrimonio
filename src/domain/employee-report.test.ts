import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import { buildEmployeeDemoReport } from "./employee-report";
import { countMonthlyLateArrivals } from "./rules/late-history";

describe("Relatório mensal fictício de colaborador", () => {
  const employee = DEMO_EMPLOYEES.find(item => item.id === "FM-047")!;
  it("usa somente os dias 1 até a data consultada e a unidade/grupo de origem", () => {
    const result = buildEmployeeDemoReport(employee, "2026-10-20");
    expect(result.employee.id).toBe("FM-047");
    expect(result.employee.group).toBe("C");
    expect(result.periodStart).toBe("2026-10-01");
    expect(result.days).toHaveLength(20);
    expect(result.days[0]?.date).toBe("2026-10-01");
    expect(result.days[19]?.date).toBe("2026-10-20");
    expect(result.days.every(row => row.planned === "12:40")).toBe(true);
  });
  it("reconcilia os totais do documento com o histórico mensal existente", () => {
    const result = buildEmployeeDemoReport(employee, "2026-10-20");
    const totals = result.totals;
    const late = countMonthlyLateArrivals("2026-10-20", [employee]);
    expect(totals.aboveAlert).toBe(late[employee.id]);
    expect(totals.onTime + totals.withinAlert + totals.aboveAlert + totals.withoutEntry)
      .toBe(result.days.length);
    expect(totals.recorded + totals.withoutEntry).toBe(result.days.length);
    expect(result.days.every(row => row.entry === null ? row.difference === null : row.difference !== null)).toBe(true);
  });
  it("reinicia na virada do mês, suporta meses curtos e impede data impossível", () => {
    expect(buildEmployeeDemoReport(employee, "2026-02-28").days).toHaveLength(28);
    expect(buildEmployeeDemoReport(employee, "2024-02-29").days).toHaveLength(29);
    expect(buildEmployeeDemoReport(employee, "2026-11-01").days).toHaveLength(1);
    expect(() => buildEmployeeDemoReport(employee, "2026-02-30")).toThrow("Data de referência inválida");
  });
});
