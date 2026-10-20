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
  firstPhase: "2026-12-15",
  finalPhase: "2027-12-15",
  url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm",
  implementation: "https://www12.senado.leg.br/noticias/audios/2026/10/carga-maxima-de-trabalho-passara-a-42-horas-semanais-em-15-de-dezembro",
  senate: "https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude",
} as const;
export type WeeklyLimit = 42 | 40;
export interface SimulatorParameters {
  start: ISODate; // first Monday of a 4-week simulation
  people: number;
  weeklyLimit: WeeklyLimit;
  allocation?: Record<GroupId,number>; // distribuição manual opcional; nunca altera grupos cadastrados
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
  start:FUTURE_START,people:76,weeklyLimit:40,
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
export function makeScenarioPeople(count:number,allocation?:Record<GroupId,number>):ScenarioPerson[]{
  const totals=allocation??groupAllocation(count);
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
/** Limite necessário considerando sábados com 100% do quadro e domingo alternado.
 * Em quatro semanas cada pessoa trabalha 20 dias: quatro sábados, dois domingos
 * e 14 dias úteis. É apenas piso aritmético, não escala viável comprovada.
 */
export function theoreticalMinimum(schedule:ScheduleStore,start:ISODate){
  const days=Array.from({length:28},(_,i)=>dateOffset(start,i));
  const groups=Object.fromEntries(GROUP_IDS.map(group=>{
    const weekdayNeed=days.filter(d=>dayOfWeek(d)!==0&&dayOfWeek(d)!==6)
      .reduce((total,date)=>total+requiredFor(schedule,date,group),0);
    const saturdayMin=Math.max(...days.filter(d=>dayOfWeek(d)===6).map(d=>requiredFor(schedule,d,group)));
    const sundayMin=Math.max(...days.filter(d=>dayOfWeek(d)===0).map(d=>requiredFor(schedule,d,group)));
    const current=DEMO_EMPLOYEES.filter(e=>e.group===group).length;
    // O menor dos dois grupos alternados precisa cobrir a demanda dominical.
    return [group,Math.max(current,Math.ceil(weekdayNeed/14),saturdayMin,sundayMin*2)];
  })) as Record<GroupId,number>;
  return {groups,total:GROUP_IDS.reduce((n,g)=>n+groups[g],0)};
}
/** Domingo alterna rigidamente (sem dois domingos trabalhados seguidos).
 * No domingo de folga: uma folga útil. No domingo trabalhado: duas folgas úteis
 * não consecutivas. O sábado nunca é opção de descanso.
 */
function weekdayOptions(workingSunday:boolean){
  if(!workingSunday)return Array.from({length:5},(_,weekday)=>[weekday,6]);
  const choices:number[][]=[];
  for(let first=0;first<5;first++)for(let second=first+2;second<5;second++)
    choices.push([first,second]);
  return choices;
}
function validNonAdjacentRest(prior:Set<ISODate>,week:ISODate[],off:number[]){
  const rests=new Set([...prior,...off.map(idx=>week[idx]!)]);
  for(const date of rests)if(rests.has(dateOffset(date,1)))return false;
  return true;
}
/** Recusa seis dias seguidos, inclusive cruzando o domingo para a semana seguinte.
 * Exceções não são automaticamente autorizadas pela existência de banco de horas.
 */
function validRollingRest(prior:Set<ISODate>,week:ISODate[],daysOff:number[]) {
  const current=week.filter((_,i)=>!daysOff.includes(i));
  const days=[...prior,...current].sort();
  const currentSet=new Set(days);
  for(const date of current){
    for(let k=0;k<=5;k++){
      const start=dateOffset(date,-k);
      const end=dateOffset(start,5);
      const seq=Array.from({length:6},(_,j)=>dateOffset(start,j));
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
  if(settings.allocation){
    if(GROUP_IDS.some(g=>!Number.isInteger(settings.allocation![g])||
      settings.allocation![g] < DEMO_EMPLOYEES.filter(e=>e.group===g).length) ||
      GROUP_IDS.reduce((n,g)=>n+settings.allocation![g],0)!==settings.people)
      throw new Error("Distribuição inválida: os grupos devem somar o quadro, sem remover funcionários atuais.");
  }
  const weeks=4,people=makeScenarioPeople(settings.people,settings.allocation);
  const dates=Array.from({length:weeks*7},(_,i)=>dateOffset(settings.start,i));
  const byWeek:PersonWeek[]=[];
  const workingById=new Map<string,Set<ISODate>>(people.map(e=>[e.id,new Set<ISODate>()]));
  const restHistory=new Map<string,Set<ISODate>>(people.map(e=>[e.id,new Set<ISODate>()]));
  const coverage:DayCoverage[]=[];
  let constraintViolations=0;
  let holidayRestAlerts=0;
  for(let weekNumber=0;weekNumber<weeks;weekNumber++){
    const days=dates.slice(weekNumber*7,weekNumber*7+7);
    const assignments=new Map<string,number[]>();
    const availableByGroup=new Map<GroupId,number[]>(GROUP_IDS.map(g=>[g,Array(7).fill(0) as number[]]));
    for(const group of GROUP_IDS){
      // Stable phase within each group: alternate half of people on every Sunday.
      // Saturday is always a working day, including on holiday dates.
      const groupPeople=people.filter(p=>p.group===group).sort((a,b)=>a.id.localeCompare(b.id));
      const requirement=days.map(day=>requiredFor(schedule,day,group));
      for(let index=0;index<groupPeople.length;index++){
        const person=groupPeople[index]!;
        const sundayWorks=(index+weekNumber)%2===0;
        const priorWork=workingById.get(person.id)!;
        const priorRest=restHistory.get(person.id)!;
        const covered=availableByGroup.get(group)!;
        const patterns=weekdayOptions(sundayWorks);
        let selected:number[]|null=null,highest=-Infinity;
        for(const off of patterns){
          if(!validNonAdjacentRest(priorRest,days,off) || !validRollingRest(priorWork,days,off))continue;
          const value=days.reduce((score,date,dayIndex)=>{
            if(off.includes(dayIndex))return score;
            // Sunday and Saturday are mandatory placements; encourage fair weekday coverage.
            const urgent=covered[dayIndex]!<requirement[dayIndex]!;
            return score+(urgent?100:-9);
          },0);
          // Prefer rest on holidays rather than on their following days, but never
          // create contiguous days off. A holiday is not a free extra weekly day off.
          const holidayBonus=off.filter(idx=>schedule.rules.holidays.includes(days[idx]!)).length*8;
          const rotate=((index*11+weekNumber*5+off[0]!*3+off[1]!*7)%17)/100;
          const score=value+holidayBonus+rotate;
          if(score>highest){highest=score;selected=off;}
        }
        if(!selected){
          // Visible conflict, rather than silently asserting an impossible roster.
          constraintViolations++;
          selected=patterns[0]!;
        }
        assignments.set(person.id,selected);
        days.forEach((day,dayIndex)=>{
          if(selected!.includes(dayIndex))restHistory.get(person.id)!.add(day);
          else {covered[dayIndex]++;priorWork.add(day);}
        });
      }
    }
    for(const person of people){
      const off=assignments.get(person.id)!;
      const workDays=days.filter((_,idx)=>!off.includes(idx));
      const restDays=days.filter((_,idx)=>off.includes(idx));
      const mins=workDays.reduce((n,date)=>n+proposedShift(person.group,settings.weeklyLimit,date).minutes,0);
      const adjacent=!validNonAdjacentRest(restHistory.get(person.id)!,days,off);
      const streak=!validRollingRest(workingById.get(person.id)!,days,off);
      if(adjacent && restDays.some(date=>schedule.rules.holidays.includes(date)))holidayRestAlerts++;
      byWeek.push({employee:person,week:weekNumber,workingDates:workDays,restDates:restDays,
        sundayFree:off.includes(6),hours:mins,overWeeklyLimit:mins>settings.weeklyLimit*60,
        consecutiveViolation:adjacent||streak,rest11hViolation:false});
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
  const saturdayUnscheduled=byWeek.filter(w=>!w.workingDates.includes(dateOffset(settings.start,w.week*7+5))).length;
  const sundayAlternationErrors=people.reduce((total,p)=>{
    const weeksFor=byWeek.filter(w=>w.employee.id===p.id);
    return total+weeksFor.slice(1).filter((week,index)=>week.sundayFree===weeksFor[index]!.sundayFree).length;
  },0);
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
      saturdayUnscheduled,sundayAlternationErrors,holidayRestAlerts,
    }};
}
