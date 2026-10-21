import { MOVEMENT } from "./config";
import type { ISODate } from "./types";

/** Período de movimento do supermercado, conforme regra informada pela gerência. */
export type MovementKind = "alta" | "baixa";

export interface MovementPeriod {
  kind: MovementKind;
  /** Texto curto para faixas e cartões. */
  label: string;
  /** Primeiro e último dia do período que contém a data. */
  from: ISODate;
  until: ISODate;
  /** Orientação em linguagem simples. */
  advice: string;
}

function iso(y: number, m: number, d: number): ISODate {
  return new Date(Date.UTC(y, m, d, 12)).toISOString().slice(0, 10);
}

export function movementKind(date: ISODate): MovementKind {
  const day = Number(date.slice(8, 10));
  return day >= MOVEMENT.lowFromDay && day <= MOVEMENT.lowUntilDay ? "baixa" : "alta";
}

export function movementPeriod(date: ISODate): MovementPeriod {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  if (movementKind(date) === "baixa") {
    return {
      kind: "baixa", label: "Baixo movimento",
      from: iso(y, m, MOVEMENT.lowFromDay), until: iso(y, m, MOVEMENT.lowUntilDay),
      advice: "Melhor período para folgas do banco de horas e férias.",
    };
  }
  const from = day > MOVEMENT.lowUntilDay ? iso(y, m, MOVEMENT.lowUntilDay + 1) : iso(y, m - 1, MOVEMENT.lowUntilDay + 1);
  const until = day > MOVEMENT.lowUntilDay ? iso(y, m + 1, MOVEMENT.lowFromDay - 1) : iso(y, m, MOVEMENT.lowFromDay - 1);
  return {
    kind: "alta", label: "Alto movimento", from, until,
    advice: "Evite folgas extras: o supermercado precisa da equipe completa.",
  };
}

/** Próxima data de baixo movimento (segunda a sexta) a partir de `date`, inclusive. */
export function nextLowMovementWeekday(date: ISODate): ISODate {
  let t = Date.parse(date + "T12:00:00Z");
  for (let i = 0; i < 62; i++) {
    const d = new Date(t).toISOString().slice(0, 10);
    const weekday = new Date(t).getUTCDay();
    if (movementKind(d) === "baixa" && weekday >= 1 && weekday <= 5) return d;
    t += 86400000;
  }
  return date;
}
