/** Leitura e gravação local (navegador) dos dados de DEMONSTRAÇÃO, compartilhada entre as abas. */
import { ABSENCE_STORAGE_KEY, SCHEDULE_STORAGE_KEY, demoAbsences, restoreAbsences, type AbsenceStore } from "@/domain/absences";
import { HOUR_KEY, demoHourStore, restoreHours, type HourStore } from "@/domain/hour-bank";
import { EMPTY_POINT_STORE, readPointStore, type PointStore } from "@/domain/point-simulator";
import { RH_POINT_KEY } from "@/domain/rh-settings";
import { EMPTY_MANAGER_STORE, MANAGER_KEY, restoreManagerStore, type ManagerStore } from "@/domain/manager-app";
import { DEFAULT_SCHEDULE, reviseStore, type ScheduleStore } from "@/domain/schedule";

function read<T>(key: string, restore: (raw: unknown) => T, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? restore(JSON.parse(raw)) : fallback();
  } catch {
    return fallback();
  }
}
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadSchedule = (): ScheduleStore => read(SCHEDULE_STORAGE_KEY, reviseStore, () => DEFAULT_SCHEDULE);
export const saveSchedule = (store: ScheduleStore) => write(SCHEDULE_STORAGE_KEY, store);
export const loadHours = (): HourStore => read(HOUR_KEY, restoreHours, demoHourStore);
export const saveHours = (store: HourStore) => write(HOUR_KEY, store);
export const loadAbsences = (): AbsenceStore => read(ABSENCE_STORAGE_KEY, restoreAbsences, demoAbsences);
export const loadPoint = (): PointStore => read(RH_POINT_KEY, readPointStore, () => EMPTY_POINT_STORE);

/** Data de hoje (fuso de Belém) no formato AAAA-MM-DD. */
export function todayISO(): string {
  const now = new Date(Date.now() - 3 * 3600000);
  return now.toISOString().slice(0, 10);
}

export const loadManager = (): ManagerStore => read(MANAGER_KEY, restoreManagerStore, () => EMPTY_MANAGER_STORE);
export const saveManager = (store: ManagerStore) => write(MANAGER_KEY, store);
