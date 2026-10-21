import { describe, expect, it } from "vitest";
import {
  DEFAULT_DRAFT, REFERENCE_DAY, balanceOf, bankBoard, bankLevel, bankSummary, canUseBank, decideEntry,
  demoHourStore, duration, hourSnapshot, hourTotals, hoursText, monthWindow, parseMinutes, proposeEntry,
  requestBankUse, restoreHours, reverseEntry, scheduleCompensation, suggestCompensationDate, validateDraft,
  type HourStore,
} from "./hour-bank";
import { DEMO_EMPLOYEES } from "./demo-data";
import { DEFAULT_SCHEDULE, assignmentFor, withChanges } from "./schedule";
import { movementKind } from "./movement";
/** Apenas os 13 lançamentos manuais (sem o acúmulo simulado pelo ponto). */
const manual = (store: HourStore): HourStore => ({ ...store, entries: store.entries.filter(e => e.id.startsWith("BH-")) });
describe("Livro-razão de horas — valores inteiros",()=>{
  it("soma saldos individualmente e ignora pendentes e eventos futuros",()=>{
    const store=manual(demoHourStore());
    expect(store.entries).toHaveLength(13);
    expect(hourTotals(store,REFERENCE_DAY)).toMatchObject({
      positive:260,negative:95,net:165,peoplePositive:5,peopleNegative:1,pending:1,
    });
    expect(balanceOf(store,"FM-001",REFERENCE_DAY)).toBe(60);
    expect(balanceOf(store,"FM-020",REFERENCE_DAY)).toBe(-95);
    expect(balanceOf(store,"FM-055",REFERENCE_DAY)).toBe(0);
  });
  it("separa saldo anterior, entradas e saídas mensais",()=>{
    const store=demoHourStore();
    expect(monthWindow("2026-10-20")).toEqual({first:"2026-10-01",end:"2026-10-31"});
    const item=hourSnapshot(store,REFERENCE_DAY).find(e=>e.employee.id==="FM-049")!;
    expect(item).toMatchObject({opening:120,credits:0,debits:60,net:-60,closing:60});
    expect(item.opening+item.credits-item.debits).toBe(item.closing);
    expect(hourSnapshot(store,REFERENCE_DAY)).toHaveLength(63);
  });
  it("não perde minutos em valores positivos e negativos",()=>{
    expect(duration(90)).toBe("+01:30");
    expect(duration(0)).toBe("00:00");
    expect(duration(-95)).toBe("−01:35");
    expect(parseMinutes("1","59")).toBe(119);
    expect(parseMinutes("2","60")).toBeNull();
    expect(parseMinutes("0","0")).toBeNull();
    expect(parseMinutes("1.5","0")).toBeNull();
  });
  it("rejeita lançamentos sem motivo, responsável ou duração válida",()=>{
    expect(validateDraft(DEFAULT_DRAFT).length).toBeGreaterThan(0);
    const draft={...DEFAULT_DRAFT,description:"Trabalho autorizado previamente"};
    expect(validateDraft(draft)).toHaveLength(0);
    expect(validateDraft({...draft,date:"2026-02-30"}).length).toBeGreaterThan(0);
    expect(validateDraft({...draft,minutes:"60"}).length).toBeGreaterThan(0);
    expect(validateDraft({...draft,responsible:""}).length).toBeGreaterThan(0);
  });
  it("proposta não soma antes da aprovação e decisão registra responsável",()=>{
    const store=demoHourStore();
    const submitted=proposeEntry(store,{...DEFAULT_DRAFT,hours:"1",minutes:"25",
      description:"Extensão acordada para o atendimento"},"2026-10-20T10:00:00.000Z");
    expect(submitted.ok).toBe(true);
    const id=submitted.store.entries.at(-1)!.id;
    expect(balanceOf(submitted.store,"FM-001",REFERENCE_DAY)).toBe(60);
    const accepted=decideEntry(submitted.store,id,"aprovar","Gerente","Autorizado no piloto");
    expect(accepted.ok).toBe(true);
    expect(balanceOf(accepted.store,"FM-001",REFERENCE_DAY)).toBe(145);
    expect(accepted.store.history).toHaveLength(2);
    expect(decideEntry(accepted.store,id,"aprovar","Gerente","").ok).toBe(false);
  });
  it("recusa exige razão e não altera saldo",()=>{
    const store=demoHourStore();
    expect(decideEntry(store,"BH-012","recusar","Gestor","não").ok).toBe(false);
    const refused=decideEntry(store,"BH-012","recusar","Gestor","Registro não autorizado");
    expect(refused.ok).toBe(true);
    expect(balanceOf(refused.store,"FM-020",REFERENCE_DAY)).toBe(-95);
    expect(refused.store.entries.find(e=>e.id==="BH-012")?.status).toBe("recusado");
  });
  it("estorno inverte lançamento aprovado e impede estorno duplicado",()=>{
    const store=demoHourStore();
    const result=reverseEntry(store,"BH-001","Gerente","Valor contabilizado incorretamente");
    expect(result.ok).toBe(true);
    const reversal=result.store.entries.at(-1)!;
    expect(reversal).toMatchObject({
      kind:"estorno",minutes:-90,date:"2026-10-01",reversalOf:"BH-001",status:"aprovado",
    });
    expect(result.store.entries.find(e=>e.id==="BH-001")?.minutes).toBe(90);
    expect(balanceOf(result.store,"FM-001",REFERENCE_DAY)).toBe(-30);
    expect(reverseEntry(result.store,"BH-001","Gerente","Duplicidade encontrada").ok).toBe(false);
    expect(reverseEntry(result.store,reversal.id,"Gerente","Segundo estorno").ok).toBe(false);
  });
  it("restauração rejeita sinal incorreto e preserva itens válidos",()=>{
    const store=demoHourStore();
    const restored=restoreHours({...store,entries:[...store.entries,{
      ...store.entries[0],id:"BH-X",minutes:-80,
    }]});
    expect(restored.entries).toHaveLength(store.entries.length);
    expect(restoreHours(null).entries).toHaveLength(store.entries.length);
  });
});

describe("Banco de horas — regras da gerência (7h = folga)",()=>{
  const store=demoHourStore();
  it("o ponto simulado gera saldo para todos, com casos em cada cor do semáforo",()=>{
    const summary=bankSummary(store,REFERENCE_DAY);
    expect(summary.vermelho).toBeGreaterThan(0);
    expect(summary.amarelo).toBeGreaterThan(0);
    expect(summary.verde).toBeGreaterThan(0);
    expect(summary.negativo).toBeGreaterThan(0);
    expect(summary.vermelho+summary.amarelo+summary.verde+summary.negativo).toBe(63);
    const credits=store.entries.filter(e=>e.id.startsWith("PT-")&&e.minutes>0);
    expect(credits.every(e=>assignmentFor(DEFAULT_SCHEDULE,DEMO_EMPLOYEES.find(p=>p.id===e.employeeId)!,e.date)!==null)).toBe(true);
  });
  it("semáforo: até 4h verde, 4h a 7h amarelo, 7h ou mais vermelho",()=>{
    expect(bankLevel(-1)).toBe("negativo");
    expect(bankLevel(239)).toBe("verde");
    expect(bankLevel(240)).toBe("amarelo");
    expect(bankLevel(420)).toBe("vermelho");
    expect(hoursText(445)).toBe("7h25");
    expect(hoursText(-30)).toBe("-0h30");
  });
  it("responde se a pessoa pode sair mais cedo usando o banco",()=>{
    expect(canUseBank(130,120).ok).toBe(true);
    expect(canUseBank(60,120).ok).toBe(false);
    const top=bankBoard(store,REFERENCE_DAY)[0]!;
    const used=requestBankUse(store,top.employee,REFERENCE_DAY,"saida_antecipada",120,"Exame médico","Gerente");
    expect(used.ok&&used.approved).toBe(true);
    expect(balanceOf(used.store,top.employee.id,REFERENCE_DAY)).toBe(top.minutes-120);
    const low=bankBoard(store,REFERENCE_DAY).at(-1)!;
    const pending=requestBankUse(store,low.employee,REFERENCE_DAY,"entrada_tardia",60,"Consulta","Gerente");
    expect(pending.ok&&!pending.approved).toBe(true);
    expect(balanceOf(pending.store,low.employee.id,REFERENCE_DAY)).toBe(low.minutes);
  });
  it("folga de compensação cai no baixo movimento, desconta 7h e vira folga na escala",()=>{
    const top=bankBoard(store,REFERENCE_DAY)[0]!;
    const date=suggestCompensationDate(DEFAULT_SCHEDULE,top.employee,"2026-10-28");
    expect(movementKind(date)).toBe("baixa");
    expect(assignmentFor(DEFAULT_SCHEDULE,top.employee,date)).not.toBeNull();
    const result=scheduleCompensation(store,top.employee,date,"Gerente");
    expect(result.ok).toBe(true);
    expect(balanceOf(result.store,top.employee.id,date)).toBe(balanceOf(store,top.employee.id,date)-420);
    expect(assignmentFor(withChanges(DEFAULT_SCHEDULE,[result.change!]),top.employee,date)).toBeNull();
  });
});
