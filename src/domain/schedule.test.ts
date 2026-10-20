import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import {
  DEFAULT_SCHEDULE, assignmentFor, coverageFor, dateOffset, dayOfWeek,
  holidayTargetsFor, reviseStore, scheduleForDate, startOfWeek, swapProposal,
  validateChanges, withChanges, type ScheduleStore,
} from "./schedule";

const a = DEMO_EMPLOYEES.find(e=>e.group==="A")!;
const b = DEMO_EMPLOYEES.find(e=>e.group==="B")!;
const c = DEMO_EMPLOYEES.find(e=>e.group==="C")!;
describe("Escala Formosa - regras demonstrativas", () => {
  it("distribui 63 pessoas nos dias úteis com metas A=4 B=29 C=30", () => {
    expect(scheduleForDate(DEFAULT_SCHEDULE,"2026-10-20").filter(r=>r.group!==null)).toHaveLength(63);
    expect(coverageFor(DEFAULT_SCHEDULE,"2026-10-20")).toEqual([
      {group:"A", assigned:4, required:4},
      {group:"B", assigned:29, required:29},
      {group:"C", assigned:30, required:30},
    ]);
  });
  it("preserva 63 pessoas no sábado sem inventar folgas úteis", () => {
    expect(dayOfWeek("2026-10-25")).toBe(0);
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
    expect(dateOffset("2026-10-25",-1)).toBe("2026-10-24");
    const sun = coverageFor(DEFAULT_SCHEDULE,"2026-10-25");
    expect(sun.map(g=>g.assigned)).toEqual([1,6,6]);
    const saturday = scheduleForDate(DEFAULT_SCHEDULE,"2026-10-24");
    const sundayWorkers = scheduleForDate(DEFAULT_SCHEDULE,"2026-10-25").filter(r=>r.group!==null);
    expect(sundayWorkers).toHaveLength(13);
    for(const row of sundayWorkers) {
      const previousSaturday = saturday.find(e=>e.employee.id===row.employee.id)!;
      expect(previousSaturday.group).toBe(row.employee.group);
    }
    expect(saturday.filter(r=>r.group!==null)).toHaveLength(63);
    expect(scheduleForDate(DEFAULT_SCHEDULE,"2026-10-19").filter(r=>r.group!==null)).toHaveLength(63);
  });
  it("bloqueia queda de cobertura, mesmo com motivos cadastrados", () => {
    const next = validateChanges(DEFAULT_SCHEDULE,[{employeeId:a.id,date:"2026-10-20",group:null}]);
    expect(next.ok).toBe(false);
    expect(next.errors.some(e=>e.includes("cobertura"))).toBe(true);
    expect(assignmentFor(DEFAULT_SCHEDULE,a,"2026-10-20")).toBe("A");
  });
  it("bloqueia descanso abaixo de 11h quando fecha e abre no dia seguinte", () => {
    const changes = swapProposal(DEFAULT_SCHEDULE,"2026-10-20",a.id,c.id);
    const result = validateChanges(DEFAULT_SCHEDULE,changes);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e=>e.includes("Descanso") || e.includes("descanso"))).toBe(true);
  });
  it("aceita troca compatível de A e B sem alterar original antes da aprovação", () => {
    const changes = swapProposal(DEFAULT_SCHEDULE,"2026-10-20",a.id,b.id);
    const check = validateChanges(DEFAULT_SCHEDULE,changes);
    expect(check.ok).toBe(true);
    expect(assignmentFor(DEFAULT_SCHEDULE,a,"2026-10-20")).toBe("A");
    const approved=withChanges(DEFAULT_SCHEDULE,changes);
    expect(assignmentFor(approved,a,"2026-10-20")).toBe("B");
    expect(assignmentFor(approved,b,"2026-10-20")).toBe("A");
    expect(coverageFor(approved,"2026-10-20").map(g=>g.assigned)).toEqual([4,29,30]);
  });
  it("troca dominical não retira pessoas do sábado e exige folgas confirmadas", () => {
    const sunday = "2026-10-25";
    const saturday = "2026-10-24";
    const aAssigned = scheduleForDate(DEFAULT_SCHEDULE,sunday)
      .find(row=>row.employee.group==="A" && row.group==="A")!;
    const aOff = scheduleForDate(DEFAULT_SCHEDULE,sunday)
      .find(row=>row.employee.group==="A" && row.group===null)!;
    const changes = swapProposal(DEFAULT_SCHEDULE,sunday,aAssigned.employee.id,aOff.employee.id);
    const check = validateChanges(DEFAULT_SCHEDULE,changes);
    expect(check.ok).toBe(false);
    expect(check.errors.some(error => error.includes("sete dias"))).toBe(true);
    const newSchedule = withChanges(DEFAULT_SCHEDULE,changes);
    expect(assignmentFor(newSchedule,aAssigned.employee,saturday)).toBe("A");
    expect(assignmentFor(newSchedule,aOff.employee,saturday)).toBe("A");
    expect(coverageFor(newSchedule,saturday).map(row=>row.assigned)).toEqual([4,29,30]);
  });
  it("reconhece feriados personalizados por data sem contaminar os outros dias", () => {
    const rules = {
      ...DEFAULT_SCHEDULE.rules,
      holidays:["2026-10-21"],
      holidayByDate:{"2026-10-21":{A:2,B:4,C:5}},
    };
    const store:ScheduleStore={...DEFAULT_SCHEDULE,rules};
    expect(holidayTargetsFor(rules,"2026-10-21")).toEqual({A:2,B:4,C:5});
    expect(coverageFor(store,"2026-10-21").map(r=>r.assigned)).toEqual([2,4,5]);
    expect(coverageFor(store,"2026-10-22").map(r=>r.assigned)).toEqual([4,29,30]);
  });
  it("recupera o armazenamento de maneira segura e limites dos alvos",()=>{
    const restored=reviseStore({
      ...DEFAULT_SCHEDULE,
      rules:{...DEFAULT_SCHEDULE.rules,sunday:{A:999,B:-2,C:6}},
    });
    expect(restored.rules.sunday).toEqual({A:4,B:0,C:6});
    expect(reviseStore(null).version).toBe(1);
    expect(reviseStore({version:2}).version).toBe(1);
  });
  it("aceita replanejamento de múltiplas datas com folgas e metas explícitas", () => {
    const employee = DEMO_EMPLOYEES.find(e => assignmentFor(DEFAULT_SCHEDULE,e,"2026-10-25") === "A");
    if (!employee) throw new Error("Fixture dominical ausente");
    const changes = [
      {employeeId:employee.id,date:"2026-10-21",group:null},
      {employeeId:employee.id,date:"2026-10-26",group:null},
    ];
    const result = validateChanges(DEFAULT_SCHEDULE, changes, {
      "2026-10-21":{A:3,B:29,C:30}, "2026-10-26":{A:3,B:29,C:30},
    });
    expect(result.ok).toBe(true);
    expect(assignmentFor(DEFAULT_SCHEDULE,employee,"2026-10-21")).toBe("A");
    expect(coverageFor(withChanges(DEFAULT_SCHEDULE,changes),"2026-10-24").map(r=>r.assigned)).toEqual([4,29,30]);
  });
  it("bloqueia falta de cobertura em qualquer data do lote", () => {
    const result = validateChanges(DEFAULT_SCHEDULE,[
      {employeeId:a.id,date:"2026-10-20",group:"A"},
      {employeeId:b.id,date:"2026-10-21",group:null},
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(error=>error.includes("2026-10-21") && error.includes("cobertura"))).toBe(true);
  });
  it("rejeita destino duplicado por data e datas inválidas sem lançar exceção", () => {
    expect(validateChanges(DEFAULT_SCHEDULE,[]).ok).toBe(false);
    expect(validateChanges(DEFAULT_SCHEDULE,[{employeeId:a.id,date:"2026-02-30",group:"A"}]).ok).toBe(false);
    expect(validateChanges(DEFAULT_SCHEDULE,[
      {employeeId:a.id,date:"2026-10-20",group:"A"},
      {employeeId:a.id,date:"2026-10-20",group:"B"},
    ]).errors).toContain("Um colaborador não pode receber dois destinos na mesma data.");
  });
  it("preserva overrides explícitos, solicitações e histórico existentes", () => {
    const store = withChanges(DEFAULT_SCHEDULE,[{employeeId:a.id,date:"2026-10-17",group:null}]);
    const history = [{id:"h1",date:"2026-10-17",actor:"Gestão",detail:"Folga confirmada",createdAt:"2026-10-20T22:12:00Z"}];
    const restored = reviseStore({...store,history});
    expect(restored.overrides).toEqual(store.overrides);
    expect(restored.history).toEqual(history);
    expect(assignmentFor(restored,a,"2026-10-17")).toBeNull();
  });
});

describe("Preservação histórica",()=>{ it("mantém interpretação anterior à correção sem reescrever dados",()=>{expect(coverageFor(DEFAULT_SCHEDULE,"2026-10-17").map(r=>r.assigned)).toEqual([3,23,24]);expect(coverageFor(DEFAULT_SCHEDULE,"2026-10-24").map(r=>r.assigned)).toEqual([4,29,30]);});});
