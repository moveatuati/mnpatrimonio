import { afterEach,beforeEach,describe,expect,it } from "vitest";
import { GROUPS, RULES, SUNDAY_SHIFTS } from "./config";
import { classifyArrival } from "./rules/punctuality";
import { checkRestBetween } from "./rules/rest";
import { applyRhSettings, defaultRhSettings, readRhSettingsStore, RH_POINT_KEY,
  RH_SETTINGS_KEY, saveRhSettings, validateRhSettings } from "./rh-settings";

beforeEach(()=>{window.localStorage.clear();applyRhSettings(defaultRhSettings());});
afterEach(()=>{window.localStorage.clear();applyRhSettings(defaultRhSettings());});

describe("Central de regras — persistência e aplicação",()=>{
  it("impede descanso abaixo de 11h ou horário incompatível",()=>{
    const draft=defaultRhSettings();
    draft.minRestHours=10;
    expect(validateRhSettings(draft).join(" ")).toMatch(/11 horas/);
    draft.minRestHours=11;
    draft.shifts.C.breakEnd="15:00";
    expect(validateRhSettings(draft).join(" ")).toMatch(/Grupo C/);
  });
  it("propaga horários e alerta ao domínio sem mudar contagem de funcionários",()=>{
    const draft=defaultRhSettings();
    draft.lateAlertMinutes=15;
    draft.minRestHours=12;
    draft.shifts.B.start="08:15";
    draft.sundayShifts[0]!.start="08:15";
    expect(validateRhSettings(draft)).toEqual([]);
    const result=saveRhSettings(draft,"Gestor de RH","Adequação piloto");
    expect(result.ok).toBe(true);
    expect(GROUPS.B.shift.start).toBe("08:15");
    expect(SUNDAY_SHIFTS[0]?.start).toBe("08:15");
    expect(RULES.minRestHours).toBe(12);
    expect(classifyArrival("08:15","08:29").status).toBe("atraso_alerta");
    expect(classifyArrival("08:15","08:31").status).toBe("atraso_acima");
    expect(checkRestBetween("2026-10-19","22:00","2026-10-20","09:00").ok).toBe(false);
    expect(readRhSettingsStore().history[0]?.changes.join(" ")).toContain("08:00 → 08:15");
    expect(JSON.parse(window.localStorage.getItem(RH_SETTINGS_KEY)!).settings.lateAlertMinutes).toBe(15);
  });
  it("sincroniza o alerta preservando marcações e histórico do ponto",()=>{
    const point={version:1,alertMinutes:10,
      records:{"2026-10-20:FM-001":{employeeId:"FM-001",date:"2026-10-20",marks:{entry:"07:03"},updatedAt:"x"}},
      history:[{id:"x",action:"registrar",employeeId:"FM-001",date:"2026-10-20",description:"Amostra",recordedAt:"x"}]};
    window.localStorage.setItem(RH_POINT_KEY,JSON.stringify(point));
    const draft=defaultRhSettings();draft.lateAlertMinutes=20;
    expect(saveRhSettings(draft,"Gestão","Revisão de alerta").ok).toBe(true);
    const stored=JSON.parse(window.localStorage.getItem(RH_POINT_KEY)!);
    expect(stored.alertMinutes).toBe(20);
    expect(stored.records).toEqual(point.records);
    expect(stored.history).toEqual(point.history);
  });
  it("recupera o alerta anterior do Ponto se ainda não houver central salva",()=>{
    const legacy={version:1,alertMinutes:25,records:{},history:[]};
    window.localStorage.setItem(RH_POINT_KEY,JSON.stringify(legacy));
    expect(readRhSettingsStore().settings.lateAlertMinutes).toBe(25);
    expect(window.localStorage.getItem(RH_SETTINGS_KEY)).toBeNull();
  });
  it("não grava dados quando a configuração é inválida",()=>{
    const invalid=defaultRhSettings();invalid.shifts.A.breakEnd="10:00";
    const result=saveRhSettings(invalid,"Gestor","Revisão");
    expect(result.ok).toBe(false);
    expect(window.localStorage.getItem(RH_SETTINGS_KEY)).toBeNull();
    expect(GROUPS.A.shift.breakEnd).toBe("14:00");
  });
});
