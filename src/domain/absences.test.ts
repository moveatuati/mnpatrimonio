import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE, assignmentFor } from "./schedule";
import { DEMO_EMPLOYEES } from "./demo-data";
import {
  ABSENCE_DEMO_DATE, absenceSummary, coverageWithAbsences, decideAbsence,
  demoAbsences, isActive, nextWorkDate, restoreAbsences, saveAbsence,
  vacationNotes, validateAbsence, type AbsenceDraft,
} from "./absences";
const date=ABSENCE_DEMO_DATE;
const works=(id:string)=>assignmentFor(DEFAULT_SCHEDULE,DEMO_EMPLOYEES.find(e=>e.id===id)!,date)!==null;
const draft:AbsenceDraft={employeeId:"MN-002",type:"ferias",start:"2026-10-20",end:"2026-10-24",note:"Ajuste de cobertura"};
describe("Férias e afastamentos — demonstração de gestão",()=>{
  it("inicia com casos fictícios, incluindo férias, atestado e afastamento",()=>{
    const store=demoAbsences();
    expect(store.entries).toHaveLength(7);
    expect(store.entries.filter(e=>isActive(e,date))).toHaveLength(3);
    const summary=absenceSummary(store,DEFAULT_SCHEDULE,date);
    expect(summary).toMatchObject({vacation:1,medical:2,pending:2,absent:3});
    expect(summary.extraDeficit).toBeGreaterThan(0);
  });
  it("cobertura disponível corresponde aos escalados menos ausências aprovadas",()=>{
    const groups=coverageWithAbsences(demoAbsences(),DEFAULT_SCHEDULE,date);
    expect(groups).toHaveLength(2);
    expect(groups.every(g=>g.available===g.scheduled-g.absent)).toBe(true);
    // Só conta quem estava escalado: na 12×36 a ausência no dia de folga da turma não reduz a cobertura.
    expect(groups.reduce((n,g)=>n+g.absent,0)).toBeLessThanOrEqual(3);
    expect(groups.every(g=>g.deficit===Math.max(0,g.required-g.available))).toBe(true);
  });
  it("não reduz cobertura com pedido pendente até aprovação",()=>{
    const beforeStore=demoAbsences();
    const before=coverageWithAbsences(beforeStore,DEFAULT_SCHEDULE,date);
    const approved=decideAbsence(beforeStore,"AUS-005","aprovar","", "2026-10-20T13:00:00Z");
    expect(approved.ok).toBe(true);
    const after=coverageWithAbsences(approved.store,DEFAULT_SCHEDULE,date);
    expect(after.find(g=>g.group==="P")!.absent).toBe(before.find(g=>g.group==="P")!.absent+(works("MN-003")?1:0));
    expect(beforeStore.entries.find(e=>e.id==="AUS-005")!.status).toBe("pendente");
    expect(approved.store.history.at(-1)!.description).toContain("aprovado");
  });
  it("bloqueia datas inválidas, inversões e períodos sobrepostos",()=>{
    const store=demoAbsences();
    expect(validateAbsence(store,{...draft,start:"2026-02-30"}).length).toBeGreaterThan(0);
    expect(validateAbsence(store,{...draft,start:"2026-10-26",end:"2026-10-20"}).length).toBeGreaterThan(0);
    expect(validateAbsence(store,{...draft,employeeId:"MN-006"}).some(x=>x.includes("sobreposto"))).toBe(true);
    expect(validateAbsence(store,draft)).toHaveLength(0);
  });
  it("novo pedido fica pendente; editar aprovado exige nova análise",()=>{
    const store=demoAbsences();
    const created=saveAbsence(store,draft,undefined,"2026-10-20T12:00:00Z");
    expect(created.ok).toBe(true);
    expect(created.store.entries.at(-1)!.status).toBe("pendente");
    const edited=saveAbsence(store,{employeeId:"MN-013",type:"ferias",
      start:"2026-10-23",end:"2026-10-30",note:"Reprogramação"},"AUS-004");
    expect(edited.ok).toBe(true);
    expect(edited.store.entries.find(e=>e.id==="AUS-004")?.status).toBe("aprovado");
    const proposal=edited.store.entries.find(e=>e.supersedesId==="AUS-004");
    expect(proposal?.status).toBe("pendente");
    const accepted=decideAbsence(edited.store,proposal!.id,"aprovar","Confirmado");
    expect(accepted.ok).toBe(true);
    expect(accepted.store.entries.find(e=>e.id==="AUS-004")?.status).toBe("cancelado");
    expect(accepted.store.entries.find(e=>e.id===proposal!.id)?.status).toBe("aprovado");
  });
  it("preserva o original em caso de recusa da proposta de alteração",()=>{
    const base=demoAbsences();
    const changed=saveAbsence(base,{employeeId:"MN-013",type:"ferias",
      start:"2026-10-24",end:"2026-10-31",note:"Mudança de datas"},"AUS-004");
    expect(changed.ok).toBe(true);
    const amendment=changed.store.entries.find(e=>e.supersedesId==="AUS-004")!;
    const refused=decideAbsence(changed.store,amendment.id,"recusar","Manter a programação");
    expect(refused.ok).toBe(true);
    expect(refused.store.entries.find(e=>e.id==="AUS-004")?.status).toBe("aprovado");
    expect(refused.store.entries.find(e=>e.id===amendment.id)?.status).toBe("recusado");
    expect(saveAbsence(base,{employeeId:"MN-003",type:"ferias",
      start:"2026-10-23",end:"2026-10-30",note:"Substituição"},"AUS-004").ok).toBe(false);
  });
  it("recusa e cancelamento exigem motivo e preservam histórico",()=>{
    const base=demoAbsences();
    expect(decideAbsence(base,"AUS-005","recusar","").ok).toBe(false);
    const refused=decideAbsence(base,"AUS-005","recusar","Pedido não confirmado");
    expect(refused.ok).toBe(true);
    expect(refused.store.entries.find(e=>e.id==="AUS-005")?.status).toBe("recusado");
    expect(decideAbsence(base,"AUS-001","cancelar","não").ok).toBe(false);
    const cancelled=decideAbsence(base,"AUS-001","cancelar","Cancelamento administrativo");
    expect(cancelled.ok).toBe(true);
    expect(coverageWithAbsences(cancelled.store,DEFAULT_SCHEDULE,date)
      .reduce((sum,g)=>sum+g.absent,0)).toBe(1);
    expect(cancelled.store.history).toHaveLength(1);
  });
  it("retorno aponta próximo turno da escala, sem confirmação de presença",()=>{
    expect(nextWorkDate(DEFAULT_SCHEDULE,"MN-011","2026-10-21")).toBe("2026-10-22");
    // Portaria 12×36: volta no próximo plantão da turma (dia sim, dia não).
    const back=nextWorkDate(DEFAULT_SCHEDULE,"MN-001","2026-10-21")!;
    expect(["2026-10-22","2026-10-23"]).toContain(back);
    expect(works("MN-001")).toBe(true);
    expect(nextWorkDate(DEFAULT_SCHEDULE,"MN-999","2026-10-21")).toBeNull();
  });
  it("férias: mínimo de 5 e máximo de 30 dias por período, com orientação do art. 134",()=>{
    const store=demoAbsences();
    expect(validateAbsence(store,{...draft,end:"2026-10-22"}).some(x=>x.includes("mínimo 5 dias"))).toBe(true);
    expect(validateAbsence(store,{...draft,end:"2026-11-25"}).some(x=>x.includes("máximo 30"))).toBe(true);
    // Serviços gerais 6×1 (DSR no domingo): começar na sexta cai nos 2 dias antes do descanso.
    expect(vacationNotes({...draft,employeeId:"MN-009",start:"2026-11-06",end:"2026-11-20"}).some(x=>x.includes("art. 134"))).toBe(true);
    expect(vacationNotes({...draft,employeeId:"MN-009",start:"2026-11-03",end:"2026-11-17"}).some(x=>x.includes("2 dias antes"))).toBe(false);
  });
  it("restauração filtra entradas inválidas",()=>{
    const base=demoAbsences();
    const restored=restoreAbsences({...base,entries:[...base.entries,{
      ...base.entries[0],id:"INVALID",employeeId:"MN-999",
    }]});
    expect(restored.entries).toHaveLength(7);
    expect(restoreAbsences(null).entries).toHaveLength(7);
  });
});
