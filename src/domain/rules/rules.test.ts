import { describe, expect, it } from "vitest";
import { checkRestBetween } from "./rest";
import { classifyArrival } from "./punctuality";
import { DEMO_EMPLOYEES } from "../demo-data";

describe("Descanso de 11h entre jornadas", () => {
  it("grupo C sai 22h e entra 08h do dia seguinte: conflito", () => {
    const r = checkRestBetween("2026-10-19", "22:00", "2026-10-20", "08:00");
    expect(r.ok).toBe(false);
    expect(r.earliestStart).toEqual({ date: "2026-10-20", time: "09:00" });
  });
  it("mesmo colaborador entra às 09h: permitido", () => {
    expect(checkRestBetween("2026-10-19", "22:00", "2026-10-20", "09:00").ok).toBe(true);
  });
  it("atravessa a virada de mês corretamente", () => {
    expect(checkRestBetween("2026-10-31", "22:00", "2026-11-01", "08:59").ok).toBe(false);
  });
});

describe("Alerta de atraso (10 min)", () => {
  it("atraso de 11 min fica acima do alerta", () => {
    expect(classifyArrival("08:00", "08:11").status).toBe("atraso_acima");
  });
  it("atraso de 10 min fica dentro do alerta", () => {
    expect(classifyArrival("08:00", "08:10").status).toBe("atraso_alerta");
  });
});

describe("Quadro demonstrativo", () => {
  it("possui 63 colaboradores: A=4, B=29, C=30", () => {
    expect(DEMO_EMPLOYEES).toHaveLength(63);
    expect(DEMO_EMPLOYEES.filter((e) => e.group === "A")).toHaveLength(4);
    expect(DEMO_EMPLOYEES.filter((e) => e.group === "B")).toHaveLength(29);
    expect(DEMO_EMPLOYEES.filter((e) => e.group === "C")).toHaveLength(30);
  });
});
