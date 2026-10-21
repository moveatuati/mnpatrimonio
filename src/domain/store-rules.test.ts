import { describe, expect, it } from "vitest";
import { demoAbsences } from "./absences";
import { demoHourStore } from "./hour-bank";
import { laborRisks } from "./labor-risks";
import { sundaySheet, weekSheet } from "./paper-sheets";
import { DEFAULT_SCHEDULE, dateOffset, restWeekdayName, type ScheduleStore } from "./schedule";

describe("Folhas para impressão", () => {
  it("escala de domingo: portaria diurna, noturna e serviços gerais com folgas compensatórias", () => {
    const store: ScheduleStore = { ...DEFAULT_SCHEDULE, rules: { ...DEFAULT_SCHEDULE.rules, sunday: { P: 6, S: 2 } } };
    const sheet = sundaySheet(store, "2026-10-25");
    expect(sheet.blocks.map(b => b.key)).toEqual(["P-diurno", "P-noturno", "S"]);
    expect(sheet.blocks[0]!.rows.length + sheet.blocks[1]!.rows.length).toBe(6);
    expect(sheet.blocks[2]!.rows).toHaveLength(2);
    for (const row of sheet.blocks[2]!.rows) {
      expect(row.folgaAntecipada! >= "2026-10-19" && row.folgaAntecipada! <= "2026-10-23").toBe(true);
      expect(row.folga7Dia).toBe(dateOffset(row.folgaAntecipada!, 7));
    }
    expect(sundaySheet(DEFAULT_SCHEDULE, "2026-10-25").blocks[2]!.rows).toHaveLength(0);
  });
  it("folha da semana: 7 dias, serviços gerais folgam só no domingo e há férias marcadas", () => {
    const week = weekSheet(DEFAULT_SCHEDULE, demoAbsences(), "2026-10-20");
    expect(week.days).toHaveLength(7);
    const s = week.groups.find(g => g.group === "S")!;
    for (const row of s.rows) expect(row.cells.slice(0, 6).filter(c => c.status === "folga")).toHaveLength(0);
    const p = week.groups.find(g => g.group === "P")!;
    for (const row of p.rows.filter(r => r.cells.every(c => c.status === "trabalha" || c.status === "folga")))
      expect(row.cells.filter(c => c.status === "trabalha").length).toBeGreaterThanOrEqual(3);
    expect(week.groups.flatMap(g => g.rows).some(r => r.cells.some(c => c.status === "ferias"))).toBe(true);
    expect(restWeekdayName(0)).toBe("segunda");
  });
});

describe("Riscos trabalhistas para o RH", () => {
  it("aponta banco acima do limite e confirma que a escala não tem dias seguidos nem descanso curto", () => {
    const risks = laborRisks(DEFAULT_SCHEDULE, demoHourStore(), demoAbsences(), "2026-10-19", 28);
    const byId = Object.fromEntries(risks.map(r => [r.id, r]));
    expect(byId["banco-alto"]!.level).toBe("alto");
    expect(byId["banco-alto"]!.people.length).toBeGreaterThan(0);
    expect(byId["sete-dias"]!.people).toHaveLength(0);
    expect(byId["descanso"]!.people).toHaveLength(0);
    expect(byId["domingos"]!.people).toHaveLength(0);
    expect(byId["12x36"]!.people.length).toBe(6);
    expect(risks[0]!.level).toBe("alto");
  });
  it("avisa da transição para a 5×2 perto da data", () => {
    const risks = laborRisks(DEFAULT_SCHEDULE, demoHourStore(), demoAbsences(), "2026-11-30", 28);
    const ec = risks.find(r => r.id === "ec141")!;
    expect(ec.level).toBe("medio");
    expect(ec.people).toHaveLength(9);
  });
});
