import { GROUPS, GROUP_IDS, RULES, SUNDAY_SHIFTS } from "./config";
import { toMinutes } from "./time";
import type { GroupId, ShiftPattern } from "./types";

/** Preferências operacionais do protótipo. Não substituem lei ou acordo coletivo. */
export const RH_SETTINGS_KEY = "formosa:augusto-montenegro:regras-rh-demo:v1";
export const RH_SETTINGS_EVENT = "formosa:rh-settings-changed";
export const RH_POINT_KEY = "formosa:augusto-montenegro:ponto-demo:v1";

export interface RhSettings {
  shifts: Record<GroupId, ShiftPattern>;
  sundayShifts: { start: string; end: string }[];
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
const defaults: RhSettings = {
  shifts: {
    A: clone(GROUPS.A.shift),
    B: clone(GROUPS.B.shift),
    C: clone(GROUPS.C.shift),
  },
  sundayShifts: SUNDAY_SHIFTS.map(s => ({ start: s.start, end: s.end })),
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
  for (const id of GROUP_IDS) {
    const shift = value.shifts?.[id];
    if (!shift || ![shift.start,shift.breakStart,shift.breakEnd,shift.end].every(isClock)) {
      errors.push("Grupo " + id + ": informe os quatro horários válidos.");
      continue;
    }
    const [a,b,c,d] = [shift.start,shift.breakStart,shift.breakEnd,shift.end].map(toMinutes);
    if (!(a! < b! && b! < c! && c! < d!)) errors.push("Grupo " + id + ": mantenha entrada, saída e retorno do intervalo e saída final em ordem.");
    if (c! - b! < 30 || c! - b! > 180)
      errors.push("Grupo " + id + ": intervalo entre 30 minutos e 3 horas, sujeito à norma coletiva.");
    if (b! - a! + d! - c! > 600) errors.push("Grupo " + id + ": máximo técnico de 10 horas líquidas na demonstração; conferir limite legal.");
  }
  if (!Array.isArray(value.sundayShifts) || value.sundayShifts.length !== 3)
    errors.push("Cadastre exatamente os três horários especiais.");
  else for (let i=0; i<3; i++) {
    const v = value.sundayShifts[i];
    if (!v || !isClock(v.start) || !isClock(v.end) || toMinutes(v.start) >= toMinutes(v.end))
      errors.push("Turno especial " + (i+1) + ": entrada deve ser anterior à saída.");
    else if (toMinutes(v.end) - toMinutes(v.start) > 600)
      errors.push("Turno especial " + (i+1) + ": duração acima do limite técnico de 10 horas.");
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
        const alert=point.alertMinutes;
        if(point.version===1 && typeof alert==="number" && Number.isInteger(alert) && alert>=0 && alert<=60)
          fallback.settings.lateAlertMinutes=alert;
      }
    } catch { /* fallback demonstrativo sem armazenamento */ }
  }
  return fallback;
}
export function applyRhSettings(settings: RhSettings): void {
  if (validateRhSettings(settings).length) return;
  for (const id of GROUP_IDS) Object.assign(GROUPS[id].shift, settings.shifts[id]);
  settings.sundayShifts.forEach((s,i) => {
    const target = SUNDAY_SHIFTS[i];
    if (target) { target.start=s.start; target.end=s.end; }
  });
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
  for (const id of GROUP_IDS) {
    for (const key of ["start","breakStart","breakEnd","end"] as const)
      if (before.shifts[id][key] !== after.shifts[id][key])
        labels.push("Grupo "+id+" / "+key+": "+before.shifts[id][key]+" → "+after.shifts[id][key]);
  }
  after.sundayShifts.forEach((v,i) => {
    for (const key of ["start","end"] as const)
      if (before.sundayShifts[i]?.[key] !== v[key])
        labels.push("Domingo turno "+(i+1)+" / "+key+": "+before.sundayShifts[i]?.[key]+" → "+v[key]);
  });
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
      if(point && point.version===1 && point.records && Array.isArray(point.history)){
        point.alertMinutes=next.lateAlertMinutes;
        window.localStorage.setItem(RH_POINT_KEY,JSON.stringify(point));
      }
    }
  } catch { /* sem modificar marcações existentes em caso de falha */ }
  window.dispatchEvent(new Event(RH_SETTINGS_EVENT));
  return {ok:true,error:"",store};
}
