import { GROUPS, PORTARIA_SHIFTS, RULES, SERVICE_SHIFTS, shiftMinutes } from "./config";
import { toMinutes } from "./time";
import type { ShiftPattern } from "./types";

/** Horários configuráveis: dois turnos da portaria 12×36 e a jornada 6×1 dos serviços gerais. */
export type ShiftKey = "portariaDiurno" | "portariaNoturno" | "servicos";
export const SHIFT_KEYS: ShiftKey[] = ["portariaDiurno", "portariaNoturno", "servicos"];
export const SHIFT_KEY_LABEL: Record<ShiftKey, string> = {
  portariaDiurno: "Portaria 12×36 · diurno",
  portariaNoturno: "Portaria 12×36 · noturno",
  servicos: "Serviços gerais · 6×1",
};

/** Preferências operacionais do protótipo. Não substituem lei ou acordo coletivo. */
export const RH_SETTINGS_KEY = "mn:condominios:regras-rh-demo:v1";
export const RH_SETTINGS_EVENT = "mn:rh-settings-changed";
export const RH_POINT_KEY = "mn:condominios:ponto-demo:v1";

export interface RhSettings {
  shifts: Record<ShiftKey, ShiftPattern>;
  lateAlertMinutes: number;
  minRestHours: number;
}
export interface RhChange {
  id: string;
  at: string;
  actor: string;
  changes: string[];
}
export interface RhSettingsStore {
  version: 1;
  settings: RhSettings;
  history: RhChange[];
}
const clone = <T,>(item: T): T => JSON.parse(JSON.stringify(item)) as T;
const pick = (s: ShiftPattern): ShiftPattern => ({ start: s.start, breakStart: s.breakStart, breakEnd: s.breakEnd, end: s.end });
/** Duração em minutos de a até b, atravessando a meia-noite. */
const span = (a: string, b: string) => ((toMinutes(b) - toMinutes(a)) + 1440) % 1440;
const defaults: RhSettings = {
  shifts: {
    portariaDiurno: pick(PORTARIA_SHIFTS.diurno),
    portariaNoturno: pick(PORTARIA_SHIFTS.noturno),
    servicos: pick(SERVICE_SHIFTS["6x1"]),
  },
  lateAlertMinutes: RULES.lateAlertMinutes,
  minRestHours: RULES.minRestHours,
};
export function defaultRhSettings(): RhSettings { return clone(defaults); }
export function isClock(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function validateRhSettings(value: RhSettings): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(value.lateAlertMinutes) || value.lateAlertMinutes < 0 || value.lateAlertMinutes > 60)
    errors.push("O alerta operacional deve estar entre 0 e 60 minutos.");
  if (!Number.isInteger(value.minRestHours) || value.minRestHours < 11 || value.minRestHours > 16)
    errors.push("O descanso mínimo deve ser de pelo menos 11 horas (máximo configurável: 16).");
  for (const id of SHIFT_KEYS) {
    const shift = value.shifts?.[id];
    const name = SHIFT_KEY_LABEL[id];
    if (!shift || ![shift.start,shift.breakStart,shift.breakEnd,shift.end].every(isClock)) {
      errors.push(name + ": informe os quatro horários válidos.");
      continue;
    }
    const total = span(shift.start, shift.end), toBreak = span(shift.start, shift.breakStart), pause = span(shift.breakStart, shift.breakEnd);
    if (total === 0 || toBreak === 0 || toBreak + pause >= total)
      errors.push(name + ": o intervalo deve ficar dentro da jornada (entrada → intervalo → retorno → saída).");
    if (pause < 60 || pause > 120)
      errors.push(name + ": intervalo entre 1h e 2h (art. 71 da CLT para jornadas acima de 6h).");
    const net = total - pause;
    if (id === "servicos" && net > 8 * 60) errors.push(name + ": máximo de 8h por dia (art. 7º, XIII, da Constituição).");
    if (id !== "servicos" && total > 12 * 60) errors.push(name + ": a 12×36 tem no máximo 12 horas seguidas (art. 59-A da CLT).");
  }
  return errors;
}
function validStored(input: unknown): RhSettingsStore | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Partial<RhSettingsStore>;
  if (data.version !== 1 || !data.settings || typeof data.settings !== "object") return null;
  const settings = data.settings as RhSettings;
  // Nunca aplicar parcialmente uma configuração inválida.
  if (validateRhSettings(settings).length) return null;
  const history = Array.isArray(data.history) ? data.history.filter(h =>
    h && typeof h.id === "string" && typeof h.at === "string" &&
    typeof h.actor === "string" && Array.isArray(h.changes) &&
    h.changes.every(v => typeof v === "string")).slice(-150) : [];
  return {version:1,settings:clone(settings),history};
}
export function readRhSettingsStore(): RhSettingsStore {
  const fallback:RhSettingsStore={version:1,settings:defaultRhSettings(),history:[]};
  if (typeof window !== "undefined") {
    try {
      const data = window.localStorage.getItem(RH_SETTINGS_KEY);
      if (data) return validStored(JSON.parse(data)) ?? fallback;
      // Compatibilidade com o limite ajustado anteriormente na tela do Ponto.
      const pointRaw=window.localStorage.getItem(RH_POINT_KEY);
      if(pointRaw){
        const point=JSON.parse(pointRaw) as Record<string,unknown>;
        const alert=point["alertMinutes"];
        if(point["version"]===1 && typeof alert==="number" && Number.isInteger(alert) && alert>=0 && alert<=60)
          fallback.settings.lateAlertMinutes=alert;
      }
    } catch { /* fallback demonstrativo sem armazenamento */ }
  }
  return fallback;
}
export function applyRhSettings(settings: RhSettings): void {
  if (validateRhSettings(settings).length) return;
  Object.assign(PORTARIA_SHIFTS.diurno, settings.shifts.portariaDiurno);
  Object.assign(PORTARIA_SHIFTS.noturno, settings.shifts.portariaNoturno);
  Object.assign(SERVICE_SHIFTS["6x1"], settings.shifts.servicos);
  SERVICE_SHIFTS["6x1"].dailyMinutes = shiftMinutes(settings.shifts.servicos);
  Object.assign(GROUPS.P.shift, settings.shifts.portariaDiurno);
  Object.assign(GROUPS.S.shift, settings.shifts.servicos);
  RULES.lateAlertMinutes = settings.lateAlertMinutes;
  RULES.minRestHours = settings.minRestHours;
}
export function hydrateRhSettings(): void {
  applyRhSettings(readRhSettingsStore().settings);
}
export function describeChanges(before: RhSettings, after: RhSettings): string[] {
  const labels: string[] = [];
  if (before.lateAlertMinutes !== after.lateAlertMinutes)
    labels.push("Alerta de atraso: " + before.lateAlertMinutes + " → " + after.lateAlertMinutes + " min");
  if (before.minRestHours !== after.minRestHours)
    labels.push("Descanso entre jornadas: " + before.minRestHours + " → " + after.minRestHours + " h");
  const KEY_LABEL = { start: "entrada", breakStart: "início do intervalo", breakEnd: "fim do intervalo", end: "saída" } as const;
  for (const id of SHIFT_KEYS) {
    for (const key of ["start","breakStart","breakEnd","end"] as const)
      if (before.shifts[id]?.[key] !== after.shifts[id][key])
        labels.push(SHIFT_KEY_LABEL[id]+" / "+KEY_LABEL[key]+": "+(before.shifts[id]?.[key] ?? "—")+" → "+after.shifts[id][key]);
  }
  return labels;
}
export function saveRhSettings(next: RhSettings, actor: string, note: string): {ok:boolean; error:string;store:RhSettingsStore} {
  const current=readRhSettingsStore(), errors=validateRhSettings(next);
  if(errors.length)return {ok:false,error:errors.join(" "),store:current};
  const changes=describeChanges(current.settings,next);
  if(!changes.length)return {ok:false,error:"Nenhuma alteração de parâmetros foi identificada.",store:current};
  const now=new Date().toISOString();
  const record:RhChange = {
    id:now+"-"+Math.random().toString(36).slice(2,8),at:now,
    actor:actor.trim().slice(0,80)||"Gestão demonstrativa",
    changes:note.trim()? [...changes,"Justificativa: "+note.trim().slice(0,250)]:changes,
  };
  const store:RhSettingsStore={version:1,settings:clone(next),history:[...current.history,record].slice(-150)};
  try {
    window.localStorage.setItem(RH_SETTINGS_KEY,JSON.stringify(store));
  } catch {return {ok:false,error:"O navegador não permitiu gravar as regras. Nenhuma configuração foi aplicada.",store:current};}
  applyRhSettings(next);
  // Sincroniza apenas o parâmetro, preservando registros de ponto e histórico.
  try {
    const raw=window.localStorage.getItem(RH_POINT_KEY);
    if(raw){
      const point=JSON.parse(raw) as Record<string,unknown>;
      if(point && point["version"]===1 && point["records"] && Array.isArray(point["history"])){
        point["alertMinutes"]=next.lateAlertMinutes;
        window.localStorage.setItem(RH_POINT_KEY,JSON.stringify(point));
      }
    }
  } catch { /* sem modificar marcações existentes em caso de falha */ }
  window.dispatchEvent(new Event(RH_SETTINGS_EVENT));
  return {ok:true,error:"",store};
}
