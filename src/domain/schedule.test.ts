import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import {
  DEFAULT_SCHEDULE, adjacentRestProblems, assignmentFor, coverageFor, dateOffset, dayOfWeek,
  holidayTargetsFor, plannedRestFor, requiredFor, restReason, reviseStore, scheduleForDate,
  startOfWeek, swapProposal, validateChanges, withChanges, type ScheduleStore,
} from "./schedule";

const WEEKDAY = "2026-10-20";
const SATURDAY = "2026-10-24";
const SUNDAY = "2026-10-25";
const working = (group: "A" | "B" | "C", date = WEEKDAY) =>
  DEMO_EMPLOYEES.find(e => e.group === group && assignmentFor(DEFAULT_SCHEDULE, e, date) === group)!;
const a = working("A");
const b = working("B");
const c = working("C");
const total = (date: string) => coverageFor(DEFAULT_SCHEDULE, date).reduce((n, row) => n + row.assigned, 0);

describe("Escala Formosa — revezamento real (6×1, domingo sim / domingo não)", () => {
  it("dia útil: cada pessoa folga um dia e a meta mínima do período é cumprida", () => {
    const coverage = coverageFor(DEFAULT_SCHEDULE, WEEKDAY);
    expect(coverage.every(row => row.assigned >= row.required)).toBe(true);
    expect(total(WEEKDAY)).toBeGreaterThanOrEqual(48);
    expect(total(WEEKDAY)).toBeLessThan(63);
    for (const e of DEMO_EMPLOYEES) {
      const week = Array.from({ length: 5 }, (_, i) => dateOffset(startOfWeek(WEEKDAY), i));
      expect(week.filter(d => plannedRestFor(e, d) !== null)).toHaveLength(1);
    }
  });
  it("sábado tem equipe completa (63)", () => {
    expect(total(SATURDAY)).toBe(63);
    expect(coverageFor(DEFAULT_SCHEDULE, SATURDAY).map(r => r.assigned)).toEqual([4, 29, 30]);
  });
  it("domingo: metade da equipe, turnos independentes do grupo e ninguém do fechamento de manhã", () => {
    const rows = scheduleForDate(DEFAULT_SCHEDULE, SUNDAY).filter(r => r.group !== null);
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expect(rows.length).toBeLessThanOrEqual(33);
    expect(rows.filter(r => r.group === "A")).toHaveLength(9);
    expect(rows.filter(r => r.group !== "C").every(r => r.employee.group !== "C")).toBe(true);
    expect(rows.find(r => r.group === "A")?.shift?.start).toBe("08:00");
    expect(rows.find(r => r.group === "C")?.shift?.start).toBe("15:15");
  });
  it("quem trabalha o domingo tem folga antecipada e folga do 7º dia sete dias depois", () => {
    const rows = scheduleForDate(DEFAULT_SCHEDULE, SUNDAY).filter(r => r.group !== null);
    for (const row of rows) {
      const week = Array.from({ length: 5 }, (_, i) => dateOffset(startOfWeek(SUNDAY), i));
      const early = week.find(d => plannedRestFor(row.employee, d) === "antecipada");
      expect(early).toBeDefined();
      expect(plannedRestFor(row.employee, dateOffset(early!, 7))).toBe("setimo");
      expect(restReason(DEFAULT_SCHEDULE, row.employee, early!)).toContain("antecipada");
    }
  });
  it("cada pessoa trabalha 2 de 4 domingos, nunca dois seguidos", () => {
    const sundays = [0, 7, 14, 21].map(n => dateOffset(SUNDAY, n));
    for (const e of DEMO_EMPLOYEES) {
      const pattern = sundays.map(d => assignmentFor(DEFAULT_SCHEDULE, e, d) !== null);
      expect(pattern.filter(Boolean)).toHaveLength(2);
      expect(pattern.some((v, i) => v && pattern[i + 1])).toBe(false);
    }
  });
  it("28 dias sem sete dias seguidos e sem descanso abaixo de 11h", () => {
    for (const e of DEMO_EMPLOYEES) {
      for (let i = 0; i < 28; i += 3) {
        expect(adjacentRestProblems(DEFAULT_SCHEDULE, e, dateOffset("2026-10-19", i))).toEqual([]);
      }
    }
  });
  it("meta dos dias úteis muda com o período de movimento", () => {
    expect(requiredFor(DEFAULT_SCHEDULE, "2026-10-20", "B")).toBe(DEFAULT_SCHEDULE.rules.weekday.baixa.B);
    expect(requiredFor(DEFAULT_SCHEDULE, "2026-10-29", "B")).toBe(DEFAULT_SCHEDULE.rules.weekday.alta.B);
    expect(requiredFor(DEFAULT_SCHEDULE, SATURDAY, "B")).toBe(29);
  });
  it("bloqueia queda de cobertura abaixo da meta", () => {
    const next = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: a.id, date: WEEKDAY, group: null }]);
    expect(next.ok).toBe(false);
    expect(next.errors.some(e => e.includes("cobertura"))).toBe(true);
  });
  it("bloqueia descanso abaixo de 11h quando fecha e abre no dia seguinte", () => {
    const result = validateChanges(DEFAULT_SCHEDULE, swapProposal(DEFAULT_SCHEDULE, WEEKDAY, a.id, c.id));
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("descanso"))).toBe(true);
  });
  it("bloqueia quem fecha o sábado às 22h no turno das 08h do domingo", () => {
    const closing = scheduleForDate(DEFAULT_SCHEDULE, SUNDAY).find(r => r.group === "C" && r.employee.group === "C")!;
    const result = validateChanges(DEFAULT_SCHEDULE, [{ employeeId: closing.employee.id, date: SUNDAY, group: "A" }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes("descanso"))).toBe(true);
  });
  it("aceita troca compatível de A e B sem alterar o original antes da aprovação", () => {
    const changes = swapProposal(DEFAULT_SCHEDULE, WEEKDAY, a.id, b.id);
    expect(validateChanges(DEFAULT_SCHEDULE, changes).ok).toBe(true);
    expect(assignmentFor(DEFAULT_SCHEDULE, a, WEEKDAY)).toBe("A");
    const approved = withChanges(DEFAULT_SCHEDULE, changes);
    expect(assignmentFor(approved, a, WEEKDAY)).toBe("B");
    expect(assignmentFor(approved, b, WEEKDAY)).toBe("A");
    expect(coverageFor(approved, WEEKDAY)).toEqual(coverageFor(DEFAULT_SCHEDULE, WEEKDAY));
  });
  it("reconhece feriados personalizados por data sem contaminar os outros dias", () => {
    const rules = { ...DEFAULT_SCHEDULE.rules, holidays: ["2026-10-21"], holidayByDate: { "2026-10-21": { A: 2, B: 4, C: 5 } } };
    const store: ScheduleStore = { ...DEFAULT_SCHEDULE, rules };
    expect(holidayTargetsFor(rules, "2026-10-21")).toEqual({ A: 2, B: 4, C: 5 });
    expect(coverageFor(store, "2026-10-21").map(r => r.assigned)).toEqual([2, 4, 5]);
    expect(coverageFor(store, "2026-10-22")).toEqual(coverageFor(DEFAULT_SCHEDULE, "2026-10-22"));
  });
  it("recupera o armazenamento com segurança e migra o domingo antigo (1/6/6)", () => {
    const clamped = reviseStore({ ...DEFAULT_SCHEDULE, rules: { ...DEFAULT_SCHEDULE.rules, sunday: { A: 999, B: -2, C: 6 } } });
    expect(clamped.rules.sunday).toEqual({ A: 63, B: 0, C: 6 });
    const legacy = reviseStore({ ...DEFAULT_SCHEDULE, rules: { sunday: { A: 1, B: 6, C: 6 }, holiday: { A: 1, B: 6, C: 6 }, holidayByDate: {}, holidays: [] } });
    expect(legacy.rules.sunday).toEqual({ A: 9, B: 10, C: 10 });
    expect(legacy.rules.weekday).toEqual(DEFAULT_SCHEDULE.rules.weekday);
    expect(reviseStore(null).version).toBe(1);
    expect(reviseStore({ version: 2 }).version).toBe(1);
  });
  it("aceita replanejamento de várias datas com metas explícitas", () => {
    const changes = [
      { employeeId: a.id, date: WEEKDAY, group: null },
      { employeeId: a.id, date: dateOffset(WEEKDAY, 1), group: null },
    ];
    const result = validateChanges(DEFAULT_SCHEDULE, changes, {
      [WEEKDAY]: { A: 0, B: 0, C: 0 }, [dateOffset(WEEKDAY, 1)]: { A: 0, B: 0, C: 0 },
    });
    expect(result.errors.filter(e => e.includes("cobertura"))).toEqual([]);
    expect(assignmentFor(DEFAULT_SCHEDULE, a, WEEKDAY)).toBe("A");
  });
  it("bloqueia falta de cobertura em qualquer data do lote", () => {
    const day2 = dateOffset(WEEKDAY, 1);
    const target = working("A", day2);
    const result = validateChanges(DEFAULT_SCHEDULE, [
      { employeeId: a.id, date: WEEKDAY, group: "A" },
      { employeeId: target.id, date: day2, group: null },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(error => error.includes(day2) && error.includes("cobertura"))).toBe(true);
  });
  it("rejeita destino duplicado por data e datas inválidas sem lançar exceção", () => {
    expect(validateChanges(DEFAULT_SCHEDULE, []).ok).toBe(false);
    expect(validateChanges(DEFAULT_SCHEDULE, [{ employeeId: a.id, date: "2026-02-30", group: "A" }]).ok).toBe(false);
    expect(validateChanges(DEFAULT_SCHEDULE, [
      { employeeId: a.id, date: WEEKDAY, group: "A" },
      { employeeId: a.id, date: WEEKDAY, group: "B" },
    ]).errors).toContain("Um colaborador não pode receber dois destinos na mesma data.");
  });
  it("preserva ajustes do gerente, solicitações e histórico existentes", () => {
    const store = withChanges(DEFAULT_SCHEDULE, [{ employeeId: a.id, date: "2026-10-17", group: null }]);
    const history = [{ id: "h1", date: "2026-10-17", actor: "Gestão", detail: "Folga confirmada", createdAt: "2026-10-20T22:12:00Z" }];
    const restored = reviseStore({ ...store, history });
    expect(restored.overrides).toEqual(store.overrides);
    expect(restored.history).toEqual(history);
    expect(assignmentFor(restored, a, "2026-10-17")).toBeNull();
    expect(restReason(restored, a, "2026-10-17")).toBe("Folga ajustada pelo gerente");
    expect(dayOfWeek(SUNDAY)).toBe(0);
  });
});
