import { describe, expect, it } from "vitest";
import { filterArrivals, isValidReferenceDate } from "./operation-query";
import type { ArrivalStatus, GroupId } from "./types";

type Arrival = {
  employee: { id: string; name: string; group: GroupId };
  status: ArrivalStatus;
  entry?: string;
};

const arrivals: readonly Arrival[] = [
  {
    employee: { id: "MN-001", name: "João Barros", group: "P" },
    status: "no_horario",
    entry: "06:58",
  },
  {
    employee: { id: "MN-002", name: "João Costa", group: "S" },
    status: "atraso_alerta",
    entry: "08:10",
  },
  {
    employee: { id: "MN-003", name: "João Lima", group: "S" },
    status: "atraso_acima",
    entry: "08:11",
  },
  { employee: { id: "MN-004", name: "Lúcia Lima", group: "S" }, status: "sem_registro" },
  {
    employee: { id: "MN-005", name: "Sérgio Lima", group: "P" },
    status: "atraso_acima",
    entry: "12:52",
  },
];

describe("Consulta operacional unificada", () => {
  it("intersecta grupo, situação e busca sem incluir resultados parciais", () => {
    const result = filterArrivals(arrivals, {
      group: "S",
      status: "atraso_acima",
      query: "  JOAO  ",
    });
    expect(result.map(({ employee }) => employee.id)).toEqual(["MN-003"]);
    expect(filterArrivals(arrivals, { group: "P", status: "atraso_acima", query: "joao" })).toEqual(
      [],
    );
  });

  it("busca nomes sem acentos e identificadores sem distinguir maiúsculas", () => {
    expect(
      filterArrivals(arrivals, { group: "all", status: "all", query: "lucia" }).map(
        ({ employee }) => employee.id,
      ),
    ).toEqual(["MN-004"]);
    expect(
      filterArrivals(arrivals, { group: "all", status: "all", query: " mn-005 " }).map(
        ({ employee }) => employee.name,
      ),
    ).toEqual(["Sérgio Lima"]);
  });

  it("entradas registradas inclui pontuais e ambos os níveis de atraso", () => {
    const result = filterArrivals(arrivals, { group: "all", status: "registered", query: "" });
    expect(result.map(({ employee }) => employee.id)).toEqual([
      "MN-001",
      "MN-002",
      "MN-003",
      "MN-005",
    ]);
    expect(
      filterArrivals(arrivals, { group: "S", status: "registered", query: "" }).map(
        ({ employee }) => employee.id,
      ),
    ).toEqual(["MN-002", "MN-003"]);
  });

  it("mantém pendências separadas dos atrasos e respeita o grupo selecionado", () => {
    expect(
      filterArrivals(arrivals, { group: "S", status: "sem_registro", query: "" }).map(
        ({ employee }) => employee.id,
      ),
    ).toEqual(["MN-004"]);
    expect(filterArrivals(arrivals, { group: "P", status: "sem_registro", query: "" })).toEqual([]);
  });

  it("preserva a ordem e os dados de origem, inclusive sem filtros", () => {
    const original = JSON.parse(JSON.stringify(arrivals));
    const result = filterArrivals(arrivals, { group: "all", status: "all", query: "   " });
    expect(result).toEqual(arrivals);
    expect(result).not.toBe(arrivals);
    result.reverse();
    expect(arrivals).toEqual(original);
    expect(filterArrivals([], { group: "all", status: "all", query: "" })).toEqual([]);
  });
});

describe("Data de referência", () => {
  it.each(["2000-01-01", "2000-02-29", "2024-02-29", "2026-10-19", "9999-12-31"])(
    "aceita a data real %s",
    (date) => expect(isValidReferenceDate(date)).toBe(true),
  );

  it.each([
    "",
    " ",
    "2026-1-01",
    "2026-10-1",
    "19/10/2026",
    "2026-10-19T00:00:00Z",
    "1999-12-31",
    "10000-01-01",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-01-32",
    "2026-04-31",
    "2026-02-29",
    "2100-02-29",
    "2024-02-30",
  ])("rejeita formato, limites ou calendário inválidos: %s", (date) => {
    expect(isValidReferenceDate(date)).toBe(false);
  });
});
