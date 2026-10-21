import { describe, expect, it } from "vitest";
import { demoAbsences } from "./absences";
import { demoHourStore } from "./hour-bank";
import { laborRisks } from "./labor-risks";
import { movementKind, movementPeriod, nextLowMovementWeekday } from "./movement";
import { sundaySheet, weekSheet } from "./paper-sheets";
import { DEFAULT_SCHEDULE, dateOffset, restWeekdayName } from "./schedule";

describe("Calendário de movimento informado pela gerência", () => {
  it("alto movimento do dia 28 ao 18; baixo do 19 ao 27", () => {
    expect(movementKind("2026-10-18")).toBe("alta");
    expect(movementKind("2026-10-19")).toBe("baixa");
    expect(movementKind("2026-10-27")).toBe("baixa");
    expect(movementKind("2026-10-28")).toBe("alta");
    expect(movementPeriod("2026-10-30")).toMatchObject({ kind: "alta", from: "2026-10-28", until: "2026-11-18" });
    expect(movementPeriod("2026-11-05")).toMatchObject({ kind: "alta", from: "2026-10-28", until: "2026-11-18" });
    expect(movementPeriod("2026-12-31")).toMatchObject({ kind: "alta", until: "2027-01-18" });
    expect(nextLowMovementWeekday("2026-10-28")).toBe("2026-11-19");
  });
});

describe("Folhas no formato do papel da Formosa", () => {
  it("escala de domingo com 3 turnos, folga antecipada e folga do 7º dia (+7)", () => {
    const sheet = sundaySheet(DEFAULT_SCHEDULE, "2026-10-25");
    expect(sheet.blocks).toHaveLength(3);
    expect(sheet.blocks[0]!.rows).toHaveLength(9);
    expect(sheet.total).toBe(sheet.blocks.reduce((n, b) => n + b.rows.length, 0));
    for (const row of sheet.blocks.flatMap(b => b.rows)) {
      expect(row.folgaAntecipada! >= "2026-10-19" && row.folgaAntecipada! <= "2026-10-23").toBe(true);
      expect(row.folga7Dia).toBe(dateOffset(row.folgaAntecipada!, 7));
    }
  });
  it("folha da semana: sábado sem folgas e cada pessoa com no máximo uma folga útil", () => {
    const week = weekSheet(DEFAULT_SCHEDULE, demoAbsences(), "2026-10-20");
    expect(week.days).toHaveLength(6);
    expect(week.restsPerDay[5]).toBe(0);
    for (const row of week.groups.flatMap(g => g.rows)) {
      expect(row.cells.filter(c => c.status === "folga").length).toBeLessThanOrEqual(1);
    }
    expect(week.groups.flatMap(g => g.rows).some(r => r.cells.some(c => c.status === "ferias"))).toBe(true);
    expect(restWeekdayName(0)).toBe("segunda");
  });
});

describe("Riscos trabalhistas para o RH", () => {
  it("aponta banco acima de 7h e confirma que a escala não tem 7 dias seguidos nem descanso curto", () => {
    const risks = laborRisks(DEFAULT_SCHEDULE, demoHourStore(), demoAbsences(), "2026-10-19", 28);
    const byId = Object.fromEntries(risks.map(r => [r.id, r]));
    expect(byId["banco-alto"]!.level).toBe("alto");
    expect(byId["banco-alto"]!.people.length).toBeGreaterThan(0);
    expect(byId["sete-dias"]!.people).toHaveLength(0);
    expect(byId["descanso"]!.people).toHaveLength(0);
    expect(byId["domingos"]!.people).toHaveLength(0);
    expect(risks[0]!.level).toBe("alto");
  });
});
