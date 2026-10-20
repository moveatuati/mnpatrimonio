import {describe,expect,it} from "vitest";
import {GROUP_IDS} from "./config";
import {demoAbsences} from "./absences";
import {DEFAULT_SCHEDULE,dateOffset} from "./schedule";
import {DEFAULT_PARAMETERS,LEGAL_SOURCES,FUTURE_START,PROPOSED_SHIFTS,
  groupAllocation,makeScenarioPeople,proposedShift,simulate5x2,theoreticalMinimum} from "./five-two-simulator";
describe("EC 141/2026 · simulador 5×2",()=>{
 it("preserva as datas oficiais de transição",()=>{
   expect(LEGAL_SOURCES.promulgation).toBe("2026-10-16");
   expect(LEGAL_SOURCES.firstPhase).toBe("2026-12-16");
   expect(LEGAL_SOURCES.finalPhase).toBe("2027-12-16");
 });
 it("permite realocar reforços por grupo sem transferir empregados existentes",()=>{
   const allocation={A:6,B:34,C:36};
   const r=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
     ...DEFAULT_PARAMETERS,people:76,allocation,
   });
   expect(r.groups.map(g=>g.headcount)).toEqual([6,34,36]);
   expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
     ...DEFAULT_PARAMETERS,people:76,allocation:{A:4,B:40,C:30},
   })).toThrow(/Distribuição inválida/);
 });
 it("mantém base A/B/C e adiciona reforços fictícios únicos",()=>{
   expect(groupAllocation(63)).toEqual({A:4,B:29,C:30});
   for(const n of [63,76,79,90,140]){
     const list=makeScenarioPeople(n);
     expect(list).toHaveLength(n);
     expect(new Set(list.map(x=>x.id)).size).toBe(n);
     expect(list.filter(x=>x.hired)).toHaveLength(n-63);
   }
 });
 it("distingue jornadas propostas de 40 e 42 horas",()=>{
   for(const g of GROUP_IDS){
     expect(proposedShift(g,40,FUTURE_START).minutes).toBe(480);
     expect(proposedShift(g,42,FUTURE_START).minutes).toBe(504);
     expect(proposedShift(g,40,dateOffset(FUTURE_START,6)).minutes).toBe(375);
   }
   expect(PROPOSED_SHIFTS[40].C.end).toBe("22:00");
   expect(PROPOSED_SHIFTS[42].C.end).toBe("22:00");
 });
 it("encontra limite teórico por grupo, sem prometer cobertura",()=>{
   expect(theoreticalMinimum(DEFAULT_SCHEDULE,FUTURE_START)).toEqual({
     groups:{A:5,B:36,C:38},total:79,
   });
 });
 it("gera quatro semanas sem repetir dia ou perder descanso",()=>{
   const r=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),DEFAULT_PARAMETERS);
   expect(r.dates).toHaveLength(28);
   expect(r.coverage).toHaveLength(84);
   expect(r.people).toHaveLength(76);
   expect(r.byWeek).toHaveLength(304);
   for(const w of r.byWeek){
     expect(w.workingDates).toHaveLength(5);
     expect(w.restDates).toHaveLength(2);
     expect(new Set([...w.workingDates,...w.restDates]).size).toBe(7);
     expect(w.overWeeklyLimit).toBe(false);
   }
   expect(r.coverage.every(c=>c.available===c.planned-c.absent)).toBe(true);
   expect(r.coverage.every(c=>c.deficit===Math.max(0,c.required-c.available))).toBe(true);
 });
 it("mantém deficiência por grupo e compara cenários sem misturar pessoas",()=>{
   for(const n of [63,76,79]){
     const r=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,people:n});
     expect(r.metrics.headcount).toBe(n);
     expect(r.metrics.deficitCount).toBe(r.coverage.reduce((v,c)=>v+c.deficit,0));
     expect(r.metrics.totalRequired).toBe(r.coverage.reduce((v,c)=>v+c.required,0));
     expect(r.metrics.coverageRate).toBeGreaterThanOrEqual(0);
     expect(r.metrics.coverageRate).toBeLessThanOrEqual(100);
   }
 });
 it("permite folgas intercaladas e preserva dados de origem",()=>{
   const a=JSON.stringify(DEFAULT_SCHEDULE);
   const ab=demoAbsences(),b=JSON.stringify(ab);
   const r=simulate5x2(DEFAULT_SCHEDULE,ab,{...DEFAULT_PARAMETERS,restMode:"intercaladas"});
   expect(r.byWeek.every(w=>w.restDates.length===2)).toBe(true);
   expect(JSON.stringify(DEFAULT_SCHEDULE)).toBe(a);
   expect(JSON.stringify(ab)).toBe(b);
 });
 it("recusa semana iniciada em terça ou quadro fora do limite",()=>{
   expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
     ...DEFAULT_PARAMETERS,start:"2026-12-22",
   })).toThrow(/segunda-feira/);
   expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
     ...DEFAULT_PARAMETERS,people:150,
   })).toThrow(/140/);
 });
});
