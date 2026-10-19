import { describe, expect, it } from "vitest";
import { rankArrivalsByGroup, arrivalOffsetMinutes } from "./arrival-ranking";
import type { GroupId } from "../types";

type Row = {
  employee: { id: string; name: string; group: GroupId };
  planned: string;
  entry?: string;
};
const row = (id: string, name: string, group: GroupId, planned: string, entry?: string): Row =>
  ({ employee: { id, name, group }, planned, entry });

describe("Ranking de chegadas separado pelos grupos", () => {
  const records: Row[] = [
    row("A1", "Afonso", "A", "07:00", "07:02"),
    row("B1", "Beatriz", "B", "08:00", "07:52"),
    row("C1", "Clara", "C", "12:40", "12:39"),
    row("A2", "Ana", "A", "07:00", "06:54"),
    row("B2", "Breno", "B", "08:00", "08:17"),
    row("C2", "Carlos", "C", "12:40"),
    row("B3", "Bia", "B", "08:00", "08:02"),
  ];
  it("exibe somente membros do grupo e coloca a maior antecipação primeiro", () => {
    expect(rankArrivalsByGroup(records, "A").map((r) => r.employee.id)).toEqual(["A2", "A1"]);
    expect(rankArrivalsByGroup(records, "B").map((r) => r.employee.id)).toEqual(["B1", "B3", "B2"]);
    expect(rankArrivalsByGroup(records, "C").map((r) => r.employee.id)).toEqual(["C1", "C2"]);
  });
  it("não compara diretamente a entrada das 07:00 com a das 12:40", () => {
    expect(arrivalOffsetMinutes(records[0]!)).toBe(2);
    expect(arrivalOffsetMinutes(records[1]!)).toBe(-8);
    expect(arrivalOffsetMinutes(records[2]!)).toBe(-1);
    expect(arrivalOffsetMinutes(records[5]!)).toBeNull();
  });
  it("preserva a lista de origem e usa desempate estável", () => {
    const sample = [
      row("B2", "Zara", "B", "08:00", "07:59"),
      row("B1", "Ana", "B", "08:00", "07:59"),
    ];
    expect(rankArrivalsByGroup(sample, "B").map((r) => r.employee.id)).toEqual(["B1", "B2"]);
    expect(sample.map((r) => r.employee.id)).toEqual(["B2", "B1"]);
  });
});
