import { RULES } from "../config";
import { formatHours, fromMinutes, toAbsoluteMinutes } from "../time";
import type { ISODate, Time } from "../types";

export interface RestCheck {
  ok: boolean;
  restMinutes: number;
  /** Horário mais cedo permitido para a próxima jornada. */
  earliestStart: { date: ISODate; time: Time };
  message: string;
}

/**
 * Verifica o descanso mínimo entre o fim de uma jornada e o início da próxima.
 * Ex.: saída 22:00 → próxima entrada permitida a partir de 09:00 do dia seguinte.
 */
export function checkRestBetween(
  endDate: ISODate,
  endTime: Time,
  nextDate: ISODate,
  nextTime: Time,
  minHours: number = RULES.minRestHours,
): RestCheck {
  const end = toAbsoluteMinutes(endDate, endTime);
  const next = toAbsoluteMinutes(nextDate, nextTime);
  const restMinutes = next - end;
  const earliestAbs = end + minHours * 60;
  const earliestDate = new Date(earliestAbs * 60000).toISOString().slice(0, 10);
  const earliest = { date: earliestDate, time: fromMinutes(earliestAbs % 1440) };
  const ok = restMinutes >= minHours * 60;
  return {
    ok,
    restMinutes,
    earliestStart: earliest,
    message: ok
      ? `Descanso de ${formatHours(restMinutes)} — atende ao mínimo de ${minHours}h.`
      : `Descanso de apenas ${formatHours(restMinutes)} — mínimo de ${minHours}h. Entrada permitida a partir de ${earliest.time} de ${earliest.date}.`,
  };
}
