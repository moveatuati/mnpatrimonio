import { GROUP_IDS, GROUPS, SUNDAY_SHIFTS } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { assignmentFor, dateOffset, dayOfWeek, requiredFor, startOfWeek, type ScheduleStore } from "./schedule";
import { toMinutes } from "./time";
import type { GroupId, ISODate } from "./types";

/** Estudo isolado; jamais grava escala nem declara conformidade trabalhista. */
export const LEGAL_SOURCES = {
  law: "Emenda Constitucional 141/2026",
  promulgation: "2026-10-16",
  firstPhase: "2026-12-16",
  finalPhase: "2027-12-16",
  url: "https://www.presidencia.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm",
  senate: "https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude",
} as const;
export type RestMode = "consecutivas" | "intercaladas";
export type WeeklyLimit = 42 | 40;
export interface SimulatorParameters {
  start: ISODate; // first Monday of a 4-week simulation
  people: number;
  weeklyLimit: WeeklyLimit;
  restMode: RestMode;
  sundayPriority: boolean;
}
export interface ScenarioPerson {
  id: string;
  name: string;
  group: GroupId;
  hired: boolean;
}
export interface DayCoverage {
  date: ISODate;
  weekday: number;
  group: GroupId;
  required: number;
  planned: number;
  absent: number;
  available: number;
  deficit: number;
  baseline: number;
  baselineDeficit: number;
  sunday: boolean;
  holiday: boolean;
}
export interface PersonWeek {
  employee: ScenarioPerson;
  week: number;
  workingDates: ISODate[];
  restDates: ISODate[];
  sundayFree: boolean;
  hours: number; // exact minutes
  overWeeklyLimit: boolean;
  consecutiveViolation: boolean;
  rest11hViolation: boolean;
}
export const DAYS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"] as const;
export const FUTURE_START = "2026-12-21";
export const BASE_PEOPLE = 63;
export const DEFAULT_PARAMETERS:SimulatorParameters = {
  start:FUTURE_START,people:76,weeklyLimit:40,restMode:"consecutivas",sundayPriority:true,
};
export type ScenarioResult = ReturnType<typeof simulate5x2>;
const localWeekday=(iso:ISODate)=>(dayOfWeek(iso)+6)%7; // Monday=0
const dateUTC=(d:ISODate)=>Date.parse(d+"T12:00:00Z");
function actualWorkMinutes(start:string,breakStart:string,breakEnd:string,end:string) {
  return Math.max(0,toMinutes(breakStart)-toMinutes(start))+
    Math.max(0,toMinutes(end)-toMinutes(breakEnd));
}
export const PROPOSED_SHIFTS = {
  40:{
    A:{start:"07:00",breakStart:"12:00",breakEnd:"13:00",end:"16:00"},
    B:{start:"08:00",breakStart:"13:00",breakEnd:"14:00",end:"17:00"},
    C:{start:"13:00",breakStart:"17:00",breakEnd:"18:00",end:"22:00"},
  },
  42:{
    A:{start:"07:00",breakStart:"12:00",breakEnd:"13:00",end:"16:24"},
    B:{start:"08:00",breakStart:"13:00",breakEnd:"14:00",end:"17:24"},
    C:{start:"12:36",breakStart:"17:00",breakEnd:"18:00",end:"22:00"},
  },
} as const;
export function proposedShift(group:GroupId,limit:WeeklyLimit,date:ISODate) {
  if(dayOfWeek(date)===0) {
    const special=SUNDAY_SHIFTS[GROUP_IDS.indexOf(group)]!;
    return {start:special.start,end:special.end,minutes:toMinutes(special.end)-toMinutes(special.start),
      breakStart:null,breakEnd:null,special:true};
  }
  const plan=PROPOSED_SHIFTS[limit][group];
  return {...plan,minutes:actualWorkMinutes(plan.start,plan.breakStart,plan.breakEnd,plan.end),special:false};
}
export function groupAllocation(headcount:number):Record<GroupId,number> {
  const normalized=Math.max(BASE_PEOPLE,Math.min(140,Math.floor(headcount)||BASE_PEOPLE));
  const counts:Record<GroupId,number>={A:4,B:29,C:30};
  const extra=normalized-BASE_PEOPLE;
  const ratios=GROUP_IDS.map(g=>({g,exact:extra*GROUPS[g].requiredStaff/63}));
  for(const r of ratios)counts[r.g]+=Math.floor(r.exact);
  let missing=normalized-GROUP_IDS.reduce((n,g)=>n+counts[g],0);
  for(const r of [...ratios].sort((a,b)=>(b.exact-Math.floor(b.exact))-(a.exact-Math.floor(a.exact)) ||
    a.g.localeCompare(b.g))) {
    if(missing--<=0)break;
    counts[r.g]++;
  }
  return counts;
}
export function makeScenarioPeople(count:number):ScenarioPerson[]{
  const totals=groupAllocation(count);
  const original=DEMO_EMPLOYEES.map(e=>({id:e.id,name:e.name,group:e.group,hired:false}));
  for(const group of GROUP_IDS){
    const existing=original.filter(e=>e.group===group).length;
    for(let i=0;i<totals[group]-existing;i++){
      original.push({id:"SIM-"+group+"-"+String(i+1).padStart(3,"0"),
        name:"Reforço simulado "+group+"-"+String(i+1).padStart(2,"0"),group,hired:true});
    }
  }
  return original;
}
export function theoreticalMinimum(schedule:ScheduleStore,start:ISODate){
  const week=Array.from({length:7},(_,i)=>dateOffset(start,i));
  const groups=Object.fromEntries(GROUP_IDS.map(g=>[
    g,Math.ceil(week.reduce((n,d)=>n+requiredFor(schedule,d,g),0)/5),
  ])) as Record<GroupId,number>;
  return {groups,total:GROUP_IDS.reduce((n,g)=>n+groups[g],0)};
}
const candidates=(mode:RestMode):number[][]=>{
  const pairs:number[][]=[];
  for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){
    const adjacent=(j===i+1)||(i===0&&j===6);
    if((mode==="consecutivas"&&adjacent)||(mode==="intercaladas"&&!adjacent))
      pairs.push([i,j]);
  }
  return pairs;
};
function validRollingRest(prior:Set<ISODate>,week:ISODate[],daysOff:number[]) {
  const current=week.filter((_,i)=>!daysOff.includes(i));
  const days=[...prior,...current].sort();
  const currentSet=new Set(days);
  for(const date of current){
    for(let k=0;k<=6;k++){
      const start=dateOffset(date,-k);
      const end=dateOffset(start,6);
      const seq=Array.from({length:7},(_,j)=>dateOffset(start,j));
      if(end>=week[0]&&seq.every(d=>currentSet.has(d)))return false;
    }
  }
  return true;
}
function restTimeOK(people:ScenarioPerson[],workingById:Map<string,Set<ISODate>>,
  limit:WeeklyLimit) {
  const conflicts:string[]=[];
  for(const person of people) {
    const set=workingById.get(person.id)??new Set<ISODate>();
    const sorted=[...set].sort();
    for(let i=1;i<sorted.length;i++){
      const prev=sorted[i-1]!,current=sorted[i]!;
      if(dateUTC(current)-dateUTC(prev)!==86400000)continue;
      const prevShift=proposedShift(person.group,limit,prev);
      const thisShift=proposedShift(person.group,limit,current);
      const rest=24*60-toMinutes(prevShift.end)+toMinutes(thisShift.start);
      if(rest<11*60)conflicts.push(person.id+" · "+prev+" → "+current);
    }
  }
  return conflicts;
}
/** Heurística transparente por demanda diária; não prova existência de escala ótima.
 * Todos os funcionários recebem 5 jornadas e 2 folgas em cada semana simulada.
 * Preferência dominical é um desempate operacional, não regra automática de acordo coletivo.
 */
export function simulate5x2(schedule:ScheduleStore,absences:AbsenceStore,settings:SimulatorParameters){
  if(settings.start!==startOfWeek(settings.start))throw new Error("O início da simulação deve ser uma segunda-feira.");
  if(settings.people<63||settings.people>140||!Number.isInteger(settings.people))throw new Error("Escolha entre 63 e 140 colaboradores.");
  const weeks=4,people=makeScenarioPeople(settings.people);
  const dates=Array.from({length:weeks*7},(_,i)=>dateOffset(settings.start,i));
  const byWeek:PersonWeek[]=[];
  const workingById=new Map<string,Set<ISODate>>(people.map(e=>[e.id,new Set<ISODate>()]));
  const restHistory=new Map<string,number>(people.map(e=>[e.id,0]));
  const coverage:DayCoverage[]=[];
  let constraintViolations=0;
  const options=candidates(settings.restMode);
  for(let weekNumber=0;weekNumber<weeks;weekNumber++){
    const days=dates.slice(weekNumber*7,weekNumber*7+7);
    const assignments=new Map<string,number[]>();
    const availableByGroup=new Map<GroupId,number[]>(GROUP_IDS.map(g=>[g,Array(7).fill(0) as number[]]));
    // Distribute off-day patterns against actual need of each weekday,
    // including reduced Sunday staffing. No one is assigned across groups.
    for(const group of GROUP_IDS){
      const groupPeople=people.filter(p=>p.group===group);
      const req=days.map(d=>requiredFor(schedule,d,group));
      const order=[...groupPeople].sort((a,b)=>{
        const diff=(restHistory.get(b.id)??0)-(restHistory.get(a.id)??0);
        return diff || a.id.localeCompare(b.id);
      });
      for(let i=0;i<order.length;i++){
        const person=order[i]!;
        const prior=workingById.get(person.id)!;
        const counts=availableByGroup.get(group)!;
        let best=options[0]!,bestScore=-Infinity;
        for(const off of options){
          const valid=validRollingRest(prior,days,off);
          if(!valid)continue;
          const gain=days.reduce((sum,d,idx)=>sum+(off.includes(idx)?0:
            (counts[idx]!<req[idx]! ? 100 : -10)),0);
          const sundayFree=off.includes(6)?1:0;
          const priorSunday=restHistory.get(person.id)??0;
          const sundayPreference=settings.sundayPriority?(sundayFree ? 12-Math.min(4,priorSunday)*5:-1):0;
          const rotate=(((i+weekNumber*3)*11+off[0]!*7+off[1]!*3)%13)/100;
          const score=gain+sundayPreference+rotate;
          if(score>bestScore){best=off;bestScore=score;}
        }
        if(bestScore===-Infinity){constraintViolations++;best=options[0]!;}
        assignments.set(person.id,best);
        days.forEach((day,idx)=>{
          if(!best.includes(idx)){counts[idx]++;workingById.get(person.id)!.add(day);}
        });
        if(best.includes(6))restHistory.set(person.id,(restHistory.get(person.id)??0)+1);
      }
    }
    for(const person of people) {
      const off=assignments.get(person.id)!;
      const workDays=days.filter((_,idx)=>!off.includes(idx));
      const restDays=days.filter((_,idx)=>off.includes(idx));
      const mins=workDays.reduce((n,d)=>n+proposedShift(person.group,settings.weeklyLimit,d).minutes,0);
      byWeek.push({employee:person,week:weekNumber,workingDates:workDays,restDates:restDays,
        sundayFree:off.includes(6),hours:mins,overWeeklyLimit:mins>settings.weeklyLimit*60,
        consecutiveViolation:!validRollingRest(workingById.get(person.id)!,days,off),rest11hViolation:false});
    }
  }
  const elevenHourViolations=restTimeOK(people,workingById,settings.weeklyLimit);
  for(const week of byWeek)week.rest11hViolation=elevenHourViolations.some(x=>x.startsWith(week.employee.id+" · "));
  const weekends=byWeek.filter(x=>x.sundayFree).length;
  let deficitCount=0, totalRequired=0,totalAvailable=0,totalAbsent=0,totalBaselineDeficit=0;
  let uncoveredDays=0;
  for(const date of dates){
    let dayDeficit=0;
    for(const group of GROUP_IDS){
      const members=people.filter(p=>p.group===group);
      const planned=members.filter(p=>workingById.get(p.id)!.has(date));
      const absent=planned.filter(p=>!p.hired&&absences.entries.some(a=>a.employeeId===p.id&&
        a.status==="aprovado"&&a.start<=date&&a.end>=date)).length;
      const available=planned.length-absent;
      const required=requiredFor(schedule,date,group);
      const deficit=Math.max(0,required-available);
      const base=DEMO_EMPLOYEES.filter(p=>p.group===group&&assignmentFor(schedule,p,date)!==null);
      const baseAbsent=base.filter(p=>absences.entries.some(a=>a.employeeId===p.id&&a.status==="aprovado"&&
        a.start<=date&&a.end>=date)).length;
      const baseline=base.length-baseAbsent;
      const baselineDeficit=Math.max(0,required-baseline);
      const row:DayCoverage={date,weekday:localWeekday(date),group,required,planned:planned.length,
        absent,available,deficit,baseline,baselineDeficit,sunday:dayOfWeek(date)===0,
        holiday:schedule.rules.holidays.includes(date)};
      coverage.push(row);
      deficitCount+=deficit;dayDeficit+=deficit;
      totalRequired+=required;totalAvailable+=available;totalAbsent+=absent;totalBaselineDeficit+=baselineDeficit;
    }
    if(dayDeficit)uncoveredDays++;
  }
  const min=theoreticalMinimum(schedule,settings.start);
  const badHours=byWeek.filter(w=>w.overWeeklyLimit).length;
  const restViolations=byWeek.filter(w=>w.consecutiveViolation).length;
  const personSummary=people.map(person=>{
    const weeksFor=byWeek.filter(w=>w.employee.id===person.id);
    return {employee:person,weeks:weeksFor,sundaysOff:weeksFor.filter(w=>w.sundayFree).length,
      totalMinutes:weeksFor.reduce((n,w)=>n+w.hours,0),
      shiftCount:weeksFor.reduce((n,w)=>n+w.workingDates.length,0)};
  });
  const groups=GROUP_IDS.map(group=>{
    const r=coverage.filter(c=>c.group===group);
    return {group,headcount:people.filter(p=>p.group===group).length,neededWeek:r.slice(0,7).reduce((n,c)=>n+c.required,0),
      capacityWeek:people.filter(p=>p.group===group).length*5,
      unmet:r.reduce((n,c)=>n+c.deficit,0),
      uncoveredDays:r.filter(c=>c.deficit).length};
  });
  return {settings,dates,people,byWeek,personSummary,coverage,groups,minimum:min,
    metrics:{headcount:people.length,newHires:people.length-63,weeklyCapacity:people.length*5,
      requiredFirstWeek:GROUP_IDS.reduce((n,g)=>n+
        coverage.filter(c=>c.group===g).slice(0,7).reduce((k,c)=>k+c.required,0),0),
      deficitCount,totalRequired,totalAvailable,totalAbsent,totalBaselineDeficit,uncoveredDays,
      coverageRate:totalRequired?Math.max(0,Math.min(100,(totalRequired-deficitCount)/totalRequired*100)):0,
      daysWith11hConflicts:elevenHourViolations.length,restViolations:restViolations+constraintViolations,
      badHours,sundaysFree:weekends,monthlyAverageSundaysOff:people.length?weekends/people.length:0,
    }};
}
