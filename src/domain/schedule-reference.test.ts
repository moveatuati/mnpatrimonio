import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import { DEFAULT_SCHEDULE, dateOffset, scheduleForDate, type AssignmentChange } from "./schedule";
import { prepareOperationalReference, reviewOperationalProposal } from "./schedule-reference";

describe("Referência operacional sujeita à homologação", () => {
  it("congela exatamente 28 dias, mantém sábado integral e expõe pendências", () => {
    const reference = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19");
    expect(reference.dates).toHaveLength(28);
    expect(reference.end).toBe("2026-11-15");
    expect(reference.roster[5]?.filter(row=>row.group!==null)).toHaveLength(63);
    expect(reference.status).toBe("aguardando-homologacao");
    expect(reference.pending).toHaveLength(4);
    expect(reference.conflicts.some(error=>error.includes("sete dias"))).toBe(true);
    expect(reference.source).not.toBe(DEFAULT_SCHEDULE);
  });
  it("versiona sem substituir a referência ou os registros de origem", () => {
    const first = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19");
    const second = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19", first);
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(second.previousRevision).toBe(1);
    expect(second.source.overrides).toEqual(DEFAULT_SCHEDULE.overrides);
    expect(second.source.history).toEqual(DEFAULT_SCHEDULE.history);
  });
  it("não considera proposta vazia ou incompleta validada", () => {
    const reference = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19");
    const result = reviewOperationalProposal(reference,[],{});
    expect(result.technicallyValid).toBe(false);
    expect(result.errors).toContain("Meta não confirmada: 2026-10-19");
    expect(result.errors).toContain("Escala nominal não confirmada: 2026-10-13 / FM-001");
    expect(result.status).toBe("aguardando-homologacao");
  });
  it("rejeita rascunho completo sem folgas, mesmo com metas fornecidas", () => {
    const reference = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19");
    const changes:AssignmentChange[] = Array.from({length:40},(_,i)=>dateOffset(reference.start,i-6))
      .flatMap(date=>scheduleForDate(DEFAULT_SCHEDULE,date).map(row=>({date,employeeId:row.employee.id,group:row.group})));
    const targets = Object.fromEntries(reference.dates.map(date=>[date,{A:0,B:0,C:0}]));
    const result = reviewOperationalProposal(reference,changes,targets);
    expect(result.technicallyValid).toBe(false);
    expect(result.errors.some(error=>error.includes("sete dias"))).toBe(true);
    expect(result.weeklyMinutes).toHaveLength(DEMO_EMPLOYEES.length);
    expect(result.weeklyMinutes.some(row=>row.weeks.some(minutes=>minutes>2640))).toBe(true);
    expect(DEFAULT_SCHEDULE.overrides).toEqual({});
  });
  it("bloqueia jornada semanal acima do limite informado sem presumir regra legal", () => {
    const reference = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-19");
    const changes:AssignmentChange[] = Array.from({length:40},(_,i)=>dateOffset(reference.start,i-6))
      .flatMap(date=>scheduleForDate(DEFAULT_SCHEDULE,date).map(row=>({date,employeeId:row.employee.id,group:row.group})));
    const result = reviewOperationalProposal(reference,changes,
      Object.fromEntries(reference.dates.map(date=>[date,{A:0,B:0,C:0}])),2640);
    expect(result.errors.some(error=>error.includes("jornada semanal excedida"))).toBe(true);
    expect(reviewOperationalProposal(reference,[],{}).errors).toContain("Limite semanal não confirmado pelo RH/jurídico.");
  });
  it("aceita tecnicamente fixture integral válida sem homologar nem aplicar", () => {
    const reference = prepareOperationalReference(DEFAULT_SCHEDULE,"2026-10-26");
    // Fixture artificial de teste, nunca usada como distribuição gerencial ou semente.
    const dates = Array.from({length:40},(_,i)=>dateOffset(reference.start,i-6));
    const changes:AssignmentChange[] = dates.flatMap(date=>DEMO_EMPLOYEES.map(employee=>({
      date,employeeId:employee.id,group:new Date(date+"T12:00:00Z").getUTCDay()===0 ? null : employee.group,
    })));
    const targets = Object.fromEntries(reference.dates.map(date=>[date,
      new Date(date+"T12:00:00Z").getUTCDay()===0 ? {A:0,B:0,C:0} : {A:4,B:29,C:30}]));
    const result = reviewOperationalProposal(reference,changes,targets,2640);
    expect(result.errors).toEqual([]);
    expect(result.technicallyValid).toBe(true);
    expect(result.weeklyMinutes[0]?.weeks).toEqual([2640,2640,2640,2640]);
    expect(result.status).toBe("aguardando-homologacao");
    expect(reference.source.overrides).toEqual({});
  });
});