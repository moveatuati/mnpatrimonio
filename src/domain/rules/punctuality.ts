import { RULES } from "../config";
import { toMinutes } from "../time";
import type { ArrivalStatus, Time } from "../types";

/** Classifica a entrada em relação ao previsto. Alerta operacional — não é regra legal de tolerância. */
export function classifyArrival(
  planned: Time,
  actual: Time | undefined,
  alertMinutes: number = RULES.lateAlertMinutes,
): { status: ArrivalStatus; delayMinutes: number } {
  if (!actual) return { status: "sem_registro", delayMinutes: 0 };
  const delay = toMinutes(actual) - toMinutes(planned);
  if (delay <= 0) return { status: "no_horario", delayMinutes: Math.max(delay, 0) };
  if (delay <= alertMinutes) return { status: "atraso_alerta", delayMinutes: delay };
  return { status: "atraso_acima", delayMinutes: delay };
}
