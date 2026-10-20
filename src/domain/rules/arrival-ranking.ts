import { toMinutes } from "../time";
import type { Employee, GroupId, Time } from "../types";

/** Dados mínimos de cada chegada, preservando todas as informações originais. */
export type ArrivalRankingRow = {
  employee: Pick<Employee, "id" | "name" | "group">;
  planned: Time;
  entry?: Time | undefined;
};

/**
 * Diferença em minutos entre a entrada registrada e a entrada prevista:
 * negativo = chegou antecipado; positivo = chegou atrasado; null = sem registro.
 * É apenas indicador operacional, não tolerância legal de ponto.
 */
export function arrivalOffsetMinutes(row: ArrivalRankingRow): number | null {
  return row.entry ? toMinutes(row.entry) - toMinutes(row.planned) : null;
}

/**
 * Classificação justa dentro de um único turno:
 * maior antecipação primeiro; entradas tardias depois; sem registro por último.
 * Desempate por nome e identificador para preservar ranking estável.
 */
export function rankArrivalsByGroup<T extends ArrivalRankingRow>(
  arrivals: readonly T[],
  group: GroupId,
): T[] {
  return arrivals
    .filter((row) => row.employee.group === group)
    .sort((a, b) => {
      const aOffset = arrivalOffsetMinutes(a);
      const bOffset = arrivalOffsetMinutes(b);
      if (aOffset === null && bOffset !== null) return 1;
      if (bOffset === null && aOffset !== null) return -1;
      if (aOffset !== null && bOffset !== null && aOffset !== bOffset) return aOffset - bOffset;
      return a.employee.name.localeCompare(b.employee.name, "pt-BR") ||
        a.employee.id.localeCompare(b.employee.id);
    });
}

