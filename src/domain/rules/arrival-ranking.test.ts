import { describe, expect, it } from "vitest";
import { rankArrivalsByGroup, arrivalOffsetMinutes } from "./arrival-ranking";
import type { GroupId } from "../types";

type Row = {
  employee: { id: string; name: string; group: GroupId };
  planned: string;
  entry?: string | undefined;
};
const row = (id: string, name: string, group: GroupId, planned: string, entry?: string): Row =>
  ({ employee: { id, name, group }, planned, entry });

describe("Ranking de chegadas separado pelos grupos", () => {
  const records: Row[] = [
    row("A1", "Afonso", "P", "07:00", "07:02"),
    row("B1", "Beatriz", "S", "07:00", "06:52"),
    row("C1", "Clara", "P", "19:00", "18:59"),
    row("A2", "Ana", "P", "07:00", "06:54"),
    row("B2", "Breno", "S", "07:00", "07:17"),
    row("C2", "Carlos", "P", "19:00"),
    row("B3", "Bia", "S", "07:00", "07:02"),
  ];
  it("exibe somente membros do grupo e coloca a maior antecipação primeiro", () => {
    // Portaria diurna (07h) e noturna (19h) comparadas pela diferença ao próprio horário.
    expect(rankArrivalsByGroup(records, "P").map((r) => r.employee.id)).toEqual(["A2", "C1", "A1", "C2"]);
    expect(rankArrivalsByGroup(records, "S").map((r) => r.employee.id)).toEqual(["B1", "B3", "B2"]);
  });
  it("não compara diretamente a entrada das 07:00 com a das 19:00", () => {
    expect(arrivalOffsetMinutes(records[0]!)).toBe(2);
    expect(arrivalOffsetMinutes(records[1]!)).toBe(-8);
    expect(arrivalOffsetMinutes(records[2]!)).toBe(-1);
    expect(arrivalOffsetMinutes(records[5]!)).toBeNull();
  });
  it("preserva a lista de origem e usa desempate estável", () => {
    const sample = [
      row("B2", "Zara", "S", "07:00", "06:59"),
      row("B1", "Ana", "S", "07:00", "06:59"),
    ];
    expect(rankArrivalsByGroup(sample, "S").map((r) => r.employee.id)).toEqual(["B1", "B2"]);
    expect(sample.map((r) => r.employee.id)).toEqual(["B2", "B1"]);
  });
});

