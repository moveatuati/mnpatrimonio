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
  it("aloca revezamento aos domingos e compensa a segunda-feira seguinte", () => {
    expect(dayOfWeek("2026-10-18")).toBe(0);
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12");
    expect(dateOffset("2026-10-18",1)).toBe("2026-10-19");
    const sun = coverageFor(DEFAULT_SCHEDULE,"2026-10-18");
    expect(sun.map(g=>g.assigned)).toEqual([1,6,6]);
    const monday = scheduleForDate(DEFAULT_SCHEDULE,"2026-10-19");
    const sundayWorkers = scheduleForDate(DEFAULT_SCHEDULE,"2026-10-18").filter(r=>r.group!==null);
    expect(sundayWorkers).toHaveLength(13);
    for(const row of sundayWorkers){
      const sameMonday = monday.find(m=>m.employee.id===row.employee.id)!;
      expect(sameMonday.group).toBeNull();
    }
    expect(monday.filter(r=>r.group!==null)).toHaveLength(50);
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
});
