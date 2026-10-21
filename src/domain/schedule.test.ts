import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import { LABOR_LAW, RULES, employeeShift, serviceRegime, shiftMinutes } from "./config";
import {
  DEFAULT_SCHEDULE, adjacentRestProblems, assignmentFor, coverageFor, dateOffset, dayOfWeek,
  holidayTargetsFor, plannedRestFor, requiredFor, restAudit, restReason, reviseStore, scheduleForDate, sundayRestCheck,
  swapProposal, validateChanges, withChanges, works12x36, type ScheduleStore,
} from "./schedule";

const WEEKDAY = "2026-10-20";
const SATURDAY = "2026-10-24";
const SUNDAY = "2026-10-25";
const portaria = DEMO_EMPLOYEES.filter(e => e.group === "P");
const servicos = DEMO_EMPLOYEES.filter(e => e.group === "S");
const workingOn = (group: "P" | "S", date: string, store: ScheduleStore = DEFAULT_SCHEDULE) =>
  DEMO_EMPLOYEES.filter(e => e.group === group && assignmentFor(store, e, date) === group);
const offOn = (group: "P" | "S", date: string, store: ScheduleStore = DEFAULT_SCHEDULE) =>
  DEMO_EMPLOYEES.filter(e => e.group === group && assignmentFor(store, e, date) === null);
const withSundayS = (n: number): ScheduleStore => ({ ...DEFAULT_SCHEDULE, rules: { ...DEFAULT_SCHEDULE.rules, sunday: { P: 6, S: n } } });

describe("Quadro dos condomínios — portaria 12×36 e serviços gerais", () => {
  it("dois grupos: portaria com turmas diurna/noturna e serviços gerais", () => {
    expect(portaria.length).toBe(12);
    expect(servicos.length).toBe(9);
    expect(portaria.filter(e => e.turn === "noturno")).toHaveLength(6);
    expect(DEMO_EMPLOYEES.every(e => e.condoId)).toBe(true);
  });
  it("portaria 12×36: cada agente trabalha um dia sim, outro não, inclusive domingo e feriado", () => {
    for (const e of portaria) {
      const days = Array.from({ length: 14 }, (_, i) => dateOffset(WEEKDAY, i));
      const worked = days.filter(d => assignmentFor(DEFAULT_SCHEDULE, e, d) === "P");
      expect(worked).toHaveLength(7);
      for (const d of worked) expect(assignmentFor(DEFAULT_SCHEDULE, e, dateOffset(d, 1))).toBeNull();
    }
    for (const d of [WEEKDAY, SATURDAY, SUNDAY]) expect(workingOn("P", d)).toHaveLength(6);
    expect(restReason(DEFAULT_SCHEDULE, offOn("P", WEEKDAY)[0]!, WEEKDAY)).toContain("12×36");
  });
  it("portaria tem 12h com 1h de intervalo; turno noturno atravessa a meia-noite", () => {
    const night = portaria.find(e => e.turn === "noturno")!;
    const day = portaria.find(e => e.turn === "diurno")!;
    expect(employeeShift(day)).toMatchObject({ start: "07:00", end: "19:00" });
    expect(employeeShift(night)).toMatchObject({ start: "19:00", end: "07:00" });
    expect(shiftMinutes(employeeShift(night))).toBe(11 * 60);
    const row = scheduleForDate(DEFAULT_SCHEDULE, WEEKDAY).find(r => r.employee.id === night.id && r.group)
      ?? scheduleForDate(DEFAULT_SCHEDULE, dateOffset(WEEKDAY, 1)).find(r => r.employee.id === night.id)!;
    expect(row.shift?.start).toBe("19:00");
  });
  it("serviços gerais 6×1: segunda a sábado, 7h20, descanso no domingo", () => {
    expect(serviceRegime(WEEKDAY)).toBe("6x1");
    expect(workingOn("S", WEEKDAY)).toHaveLength(9);
    expect(workingOn("S", SATURDAY)).toHaveLength(9);
    expect(workingOn("S", SUNDAY)).toHaveLength(0);
    expect(restReason(DEFAULT_SCHEDULE, servicos[0]!, SUNDAY)).toBe("Descanso semanal (domingo)");
    expect(shiftMinutes(employeeShift(servicos[0]!, WEEKDAY))).toBe(440);
    expect(coverageFor(DEFAULT_SCHEDULE, WEEKDAY).every(r => r.assigned >= r.required)).toBe(true);
  });
  it("EC 141/2026: serviços gerais passam sozinhos para 5×2 de 42h e depois 40h", () => {
    const monday = "2026-12-21";
    expect(LABOR_LAW.fiveTwoStart).toBe("2026-12-15");
    expect(serviceRegime(monday)).toBe("5x2-42h");
    expect(serviceRegime("2027-12-20")).toBe("5x2-40h");
    expect(workingOn("S", monday)).toHaveLength(9);
    expect(workingOn("S", "2026-12-26")).toHaveLength(0);
    expect(restReason(DEFAULT_SCHEDULE, servicos[0]!, "2026-12-26")).toBe("Folga do sábado (5×2)");
    expect(shiftMinutes(employeeShift(servicos[0]!, monday))).toBe(504);
    expect(shiftMinutes(employeeShift(servicos[0]!, "2027-12-20"))).toBe(480);
    expect(requiredFor(DEFAULT_SCHEDULE, "2026-12-26", "S")).toBe(0);
    // Portaria não muda.
    expect(workingOn("P", monday)).toHaveLength(6);
  });
  it("28 dias sem descanso curto e sem dias seguidos acima do limite, inclusive na transição", () => {
    for (const start of ["2026-10-19", "2026-12-07"]) for (let i = 0; i < 28; i++) {
      const d = dateOffset(start, i);
      for (const e of DEMO_EMPLOYEES) expect(adjacentRestProblems(DEFAULT_SCHEDULE, e, d)).toEqual([]);
    }
  });
  it("domingo com serviços gerais: quem trabalha tem folga antecipada e folga do 7º dia", () => {
    const store = withSundayS(3);
    const sundayCrew = workingOn("S", SUNDAY, store);
    expect(sundayCrew).toHaveLength(3);
    for (const e of sundayCrew) {
      const check = sundayRestCheck(store, e, SUNDAY);
      expect(check.ok).toBe(true);
      expect(plannedRestFor(e, check.before!, store)).toBe("antecipada");
      expect(check.after).toBe(dateOffset(check.before!, 7));
    }
    for (let i = 0; i < 42; i++) for (const e of servicos)
      expect(adjacentRestProblems(store, e, dateOffset("2026-10-19", i))).toEqual([]);
    const audit = restAudit(store, "2026-10-19", 4);
    expect(audit.rows).toHaveLength(9);
    expect(audit.pending).toBe(0);
    expect(audit.workersPerSunday).toEqual([3, 3, 3, 3]);
  });
  it("bloqueia folga que derruba a cobertura e descanso de 36h da 12×36", () => {
    const s = workingOn("S", WEEKDAY)[0]!;
    const off = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: WEEKDAY, group: null }]);
    expect(off.ok).toBe(false);
    expect(off.errors.join(" ")).toContain("Serviços gerais");
    const p = offOn("P", WEEKDAY)[0]!;
    const extra = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: p.id, date: WEEKDAY, group: "P" }]);
    expect(extra.ok).toBe(false);
    expect(extra.errors.join(" ")).toContain("36h");
  });
  it("bloqueia 7 dias seguidos de serviços gerais no 6×1", () => {
    const s = servicos[0]!;
    const result = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: SUNDAY, group: "S" }]);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("dias consecutivos");
  });
  it("não deixa uma função cobrir posto de outra", () => {
    const s = servicos[0]!;
    const result = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: WEEKDAY, group: "P" }]);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("não pode cobrir posto de Agente de portaria");
  });
  it("troca entre turmas da portaria inverte os plantões sem alterar a escala antes da aprovação", () => {
    const on = workingOn("P", WEEKDAY).find(e => e.turn === "diurno")!;
    const offMate = offOn("P", WEEKDAY).find(e => e.turn === "diurno" && e.condoId === on.condoId)!;
    const changes = swapProposal(DEFAULT_SCHEDULE, WEEKDAY, on.id, offMate.id);
    expect(changes.map(c => c.group)).toEqual([null, "P"]);
    expect(assignmentFor(DEFAULT_SCHEDULE, on, WEEKDAY)).toBe("P");
    // Trocar só um dia quebra as 36h de quem entra no lugar.
    expect(validateChanges(DEFAULT_SCHEDULE, changes).ok).toBe(false);
  });
  it("reconhece feriados personalizados por data", () => {
    const holiday = "2026-11-02";
    const store: ScheduleStore = { ...DEFAULT_SCHEDULE, rules: { ...DEFAULT_SCHEDULE.rules, holidays: [holiday],
      holidayByDate: { [holiday]: { P: 6, S: 2 } } } };
    expect(holidayTargetsFor(store.rules, holiday)).toEqual({ P: 6, S: 2 });
    expect(workingOn("S", holiday, store)).toHaveLength(2);
    expect(workingOn("P", holiday, store)).toHaveLength(6);
    expect(workingOn("S", dateOffset(holiday, 1), store)).toHaveLength(9);
  });
  it("recupera o armazenamento com segurança e descarta grupos antigos", () => {
    expect(reviseStore(null)).toBe(DEFAULT_SCHEDULE);
    const restored = reviseStore({ ...DEFAULT_SCHEDULE, rules: { ...DEFAULT_SCHEDULE.rules, sunday: { A: 9, B: 10, C: 10 } },
      overrides: { ["2026-10-20:MN-001"]: "A", ["2026-10-20:MN-002"]: null } });
    expect(restored.rules.sunday).toEqual({ P: 6, S: 0 });
    expect(restored.overrides).toEqual({ ["2026-10-20:MN-002"]: null });
    expect(RULES.rest12x36Hours).toBe(36);
  });
  it("aceita ajuste compatível e preserva histórico existente", () => {
    const s = servicos[1]!;
    const store = withChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: SATURDAY, group: null }]);
    expect(assignmentFor(store, s, SATURDAY)).toBeNull();
    expect(restReason(store, s, SATURDAY)).toBe("Folga ajustada pelo gestor");
    expect(dayOfWeek(SATURDAY)).toBe(6);
    expect(validateChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: "2026-02-30", group: null }]).ok).toBe(false);
    expect(validateChanges(DEFAULT_SCHEDULE, [{ employeeId: s.id, date: WEEKDAY, group: null }, { employeeId: s.id, date: WEEKDAY, group: "S" }]).errors
      .join(" ")).toContain("dois destinos");
  });
  it("12×36 alterna os dias da turma", () => {
    const e = portaria[0]!;
    expect(works12x36(e, WEEKDAY)).not.toBe(works12x36(e, dateOffset(WEEKDAY, 1)));
  });
});
