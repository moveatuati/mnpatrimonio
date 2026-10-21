import { describe, expect, it } from "vitest";
import { summarizeGroupEntries } from "./group-readiness";
import { buildDashboard } from "../dashboard";
import type { ArrivalStatus, GroupId } from "../types";

const row = (id: string, name: string, group: GroupId, entry: string | undefined, status: ArrivalStatus) => ({
  employee: { id, name, group },
  ...(entry ? { entry } : {}),
  status,
});

describe("Cobertura documental por grupo", () => {
  it("separa escalados e entrada registrada sem converter marcação ausente em falta", () => {
    const summary = summarizeGroupEntries([
      row("P1", "Ana", "P", "06:59", "no_horario"),
      row("S1", "Bruno", "S", "07:04", "atraso_alerta"),
      row("S2", "Carla", "S", undefined, "sem_registro"),
      row("P2", "Daniel", "P", "19:13", "atraso_acima"),
    ]);
    expect(summary).toEqual([
      { group: "P", scheduled: 2, registered: 2, pending: 0, aboveAlert: 1, pendingNames: [] },
      { group: "S", scheduled: 2, registered: 1, pending: 1, aboveAlert: 0, pendingNames: ["Carla"] },
    ]);
  });
  it("os totais por grupo são coerentes com os KPIs reais do dashboard demo", () => {
    const d = buildDashboard("2026-10-19");
    const sum = summarizeGroupEntries(d.arrivals);
    expect(sum.reduce((s, g) => s + g.scheduled, 0)).toBe(d.kpis.scheduled);
    expect(sum.reduce((s, g) => s + g.registered, 0)).toBe(d.kpis.entries);
    expect(sum.reduce((s, g) => s + g.pending, 0)).toBe(d.kpis.missing);
    expect(sum.reduce((s, g) => s + g.aboveAlert, 0)).toBe(d.kpis.aboveAlert);
    expect(sum.map((g) => g.scheduled)).toEqual(d.coverage.map((c) => c.scheduled));
    expect(d.kpis.scheduled + d.day.rest + d.day.absent).toBe(21);
  });
});
