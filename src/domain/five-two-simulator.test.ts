import {describe,expect,it} from "vitest";
import {GROUP_IDS} from "./config";
import {demoAbsences} from "./absences";
import {DEFAULT_SCHEDULE,dateOffset} from "./schedule";
import {DEFAULT_PARAMETERS,LEGAL_SOURCES,FUTURE_START,PROPOSED_SHIFTS,
  groupAllocation,makeScenarioPeople,proposedShift,simulate5x2,theoreticalMinimum} from "./five-two-simulator";
describe("EC 141/2026 · simulador 5×2",()=>{
 it("preserva as datas oficiais de transição",()=>{
   expect(LEGAL_SOURCES.promulgation).toBe("2026-10-16");
   expect(LEGAL_SOURCES.firstPhase).toBe("2026-12-15");
   expect(LEGAL_SOURCES.finalPhase).toBe("2027-12-15");
   expect(LEGAL_SOURCES.url).toBe("https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm");
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
     groups:{A:6,B:42,C:43},total:91,
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
 it("sábado jamais é folga, domingo alterna, e cada semana tem duas folgas",()=>{
   for(const size of [63,76,91,140]){
     const result=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
       ...DEFAULT_PARAMETERS,people:size,
     });
     expect(result.metrics.saturdayUnscheduled).toBe(0);
     expect(result.metrics.sundayAlternationErrors).toBe(0);
     for(const person of result.personSummary){
       expect(person.weeks).toHaveLength(4);
       expect(person.sundaysOff).toBe(2);
       for(let week=0;week<4;week++){
         const row=person.weeks[week]!;
         const saturday=dateOffset(FUTURE_START,week*7+5);
         const sunday=dateOffset(FUTURE_START,week*7+6);
         expect(row.workingDates).toContain(saturday);
         expect(row.restDates).not.toContain(saturday);
         expect(row.restDates).toHaveLength(2);
         expect(row.workingDates).toHaveLength(5);
         expect(row.sundayFree).toBe(row.restDates.includes(sunday));
         if(week>0)expect(row.sundayFree).not.toBe(person.weeks[week-1]!.sundayFree);
       }
       const allRest=new Set(person.weeks.flatMap(w=>w.restDates));
       const allWorked=new Set(person.weeks.flatMap(w=>w.workingDates));
       for(const d of allRest)expect(allRest.has(dateOffset(d,1))).toBe(false);
       for(const d of allWorked)expect([0,1,2,3,4,5].every(k=>
         allWorked.has(dateOffset(d,k)))).toBe(false);
     }
   }
 });
 it("mantém a mesma fase dominical quando a janela de simulação muda",()=>{
   const initial=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),DEFAULT_PARAMETERS);
   const shifted=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{
     ...DEFAULT_PARAMETERS,start:dateOffset(FUTURE_START,7),
   });
   for(const first of initial.personSummary){
     const second=shifted.personSummary.find(p=>p.employee.id===first.employee.id)!;
     expect(second.weeks[0]!.sundayFree).toBe(first.weeks[1]!.sundayFree);
     expect(second.weeks[1]!.sundayFree).toBe(first.weeks[2]!.sundayFree);
   }
 });
 it("feriado na segunda não coloca uma folga consecutiva na terça",()=>{
   const schedule={...DEFAULT_SCHEDULE,rules:{...DEFAULT_SCHEDULE.rules,
     holidays:[FUTURE_START],
     holidayByDate:{[FUTURE_START]:{A:1,B:6,C:6}},
   }};
   const result=simulate5x2(schedule,demoAbsences(),DEFAULT_PARAMETERS);
   expect(result.coverage.filter(r=>r.date===FUTURE_START).every(r=>r.holiday)).toBe(true);
   for(const person of result.personSummary){
     const rests=new Set(person.weeks.flatMap(w=>w.restDates));
     if(rests.has(FUTURE_START))expect(rests.has(dateOffset(FUTURE_START,1))).toBe(false);
   }
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
 it("não modifica dados operacionais e aplica automaticamente as folgas intercaladas",()=>{
   const a=JSON.stringify(DEFAULT_SCHEDULE);
   const ab=demoAbsences(),b=JSON.stringify(ab);
   const r=simulate5x2(DEFAULT_SCHEDULE,ab,DEFAULT_PARAMETERS);
   expect(r.byWeek.every(w=>w.restDates.length===2)).toBe(true);
   expect(r.metrics.saturdayUnscheduled).toBe(0);
   expect(r.metrics.sundayAlternationErrors).toBe(0);
   expect(JSON.stringify(DEFAULT_SCHEDULE)).toBe(a);
   expect(JSON.stringify(ab)).toBe(b);
 });
 it("avisa caso o algoritmo encontre sequências de seis dias de trabalho entre semanas",()=>{
   const result=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),DEFAULT_PARAMETERS);
   const byId=new Map<string,string[]>();
   for(const person of result.personSummary){
     const dates=person.weeks.flatMap(w=>w.workingDates);
     byId.set(person.employee.id,dates);
   }
   const detected=[...byId.entries()].filter(([id,days])=>{
     const set=new Set(days);
     return days.some(day=>[0,1,2,3,4,5].every(offset=>
       set.has(dateOffset(day,offset))));
   });
   expect(detected.length).toBeLessThanOrEqual(result.metrics.restViolations);
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
