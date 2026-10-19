import type { ISODate, Time } from "./types";

export function toMinutes(t: Time): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): Time {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Converte data + hora em minutos absolutos (UTC, sem fuso), atravessando a meia-noite corretamente. */
export function toAbsoluteMinutes(date: ISODate, time: Time): number {
  const [y, mo, d] = date.split("-").map(Number);
  return Date.UTC(y, mo - 1, d) / 60000 + toMinutes(time);
}

export function formatHours(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}`;
}

export function todayISO(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
