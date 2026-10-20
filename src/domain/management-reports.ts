import { GROUPS, GROUP_IDS } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { ABSENCE_LABELS, coverageWithAbsences, isActive, nextWorkDate, type AbsenceStore } from "./absences";
import { balanceOf, type HourStore } from "./hour-bank";
import { isValidReferenceDate } from "./operation-query";
import { analysePoint, pointKey, type PointStore } from "./point-simulator";
import { assignmentFor, dateOffset, dayOfWeek, requiredFor, type ScheduleStore } from "./schedule";
import type { GroupId, ISODate } from "./types";

/** Reports read the independently saved demonstrators; they NEVER write to operational stores. */
export interface ReportSources {
  schedule: ScheduleStore;
  point: PointStore;
  absences: AbsenceStore;
  hours: HourStore;
}
export interface ReportFilters {
  start: ISODate;
  end: ISODate;
  group: "all" | GroupId;
  employeeId: "all" | string;
}
export interface CoverageReportRow {
  date: ISODate;
  group: GroupId;
  required: number;
  scheduled: number;
  absent: number;
  available: number;
  deficit: number;
  overtimeNeeded: number; // identical to deficit for display; no paid hours inferred
}
export interface PersonReportRow {
  id: string;
  name: string;
  group: GroupId;
  scheduledDays: number;
  approvedAbsenceDays: number;
  recordedEntries: number;
  withinAlert: number;
  overAlert: number;
  lateMinutes: number;
  earlyExits: number;
  incompletePunches: number;
  missingEntries: number;
  positiveMinutes: number;
  negativeMinutes: number;
  balanceMinutes: number;
}
export interface DailyPointRow {
  date: ISODate;
  employeeId: string;
  name: string;
  group: GroupId;
  planned: string;
  entry: string | null;
  breakOut: string | null;
  breakIn: string | null;
  exit: string | null;
  lateness: number | null;
  status: "sem registro" | "em andamento" | "no horário" | "acima do alerta" | "saída antecipada" | "inconsistência";
}
export interface AbsenceReportRow {
  id: string;
  employeeId: string;
  name: string;
  group: GroupId;
  kind: string;
  start: ISODate;
  end: ISODate;
  status: string;
  returnDate: ISODate | null;
}
export interface HourReportRow {
  id: string;
  employeeId: string;
  name: string;
  group: GroupId;
  date: ISODate;
  kind: string;
  minutes: number;
  status: string;
  responsible: string;
}
export interface ShiftReportRow {
  date: ISODate;
  group: GroupId;
  scheduled: number;
  restDays: number;
  required: number;
  holiday: boolean;
  sunday: boolean;
}
export interface SwapReportRow {
  id: string;
  date: ISODate;
  from: string;
  to: string;
  status: string;
  reason: string;
}
export type ReportModel = ReturnType<typeof buildReport>;
const personIndex = new Map(DEMO_EMPLOYEES.map(e => [e.id, e]));
const VALID_MAX_DAYS = 93;
export function datesInRange(start: ISODate, end: ISODate): ISODate[] {
  if (!isValidReferenceDate(start) || !isValidReferenceDate(end) || start > end) return [];
  const n = Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86400000) + 1;
  if (n > VALID_MAX_DAYS) return [];
  return Array.from({ length: n }, (_, i) => dateOffset(start, i));
}
export function reportFilterErrors(filters: ReportFilters) {
  const errors: string[] = [];
  if (!isValidReferenceDate(filters.start) || !isValidReferenceDate(filters.end)) errors.push("Informe datas reais no formato AAAA-MM-DD.");
  else if (filters.start > filters.end) errors.push("A data inicial deve ser anterior ou igual à final.");
  else if (!datesInRange(filters.start, filters.end).length) errors.push("O intervalo máximo para um relatório é de 93 dias.");
  if (filters.group !== "all" && !GROUP_IDS.includes(filters.group)) errors.push("Grupo inválido.");
  if (filters.employeeId !== "all" && !personIndex.has(filters.employeeId)) errors.push("Colaborador não encontrado.");
  if (filters.employeeId !== "all" && filters.group !== "all" &&
      personIndex.get(filters.employeeId)?.group !== filters.group) errors.push("O colaborador selecionado não pertence ao grupo informado.");
  return errors;
}
function filteredPeople(filters: ReportFilters) {
  return DEMO_EMPLOYEES.filter(e => (filters.group === "all" || filters.group === e.group) &&
    (filters.employeeId === "all" || filters.employeeId === e.id));
}
export function capacityStudy() {
  // ONLY theoretical person-shifts, not a legally validated or operational staffing plan.
  return [
    { scenario: "6×1 atual · 63 colaboradores", people: 63, daysPerWeek: 6, theoreticalShifts: 378, delta: 0 },
    { scenario: "5×2 · 63 colaboradores", people: 63, daysPerWeek: 5, theoreticalShifts: 315, delta: -63 },
    { scenario: "5×2 · 76 colaboradores (hipótese)", people: 76, daysPerWeek: 5, theoreticalShifts: 380, delta: 2 },
  ];
}
export function buildReport(sources: ReportSources, filters: ReportFilters) {
  const errors = reportFilterErrors(filters);
  if (errors.length) throw new Error(errors.join(" "));
  const dates = datesInRange(filters.start, filters.end);
  const people = filteredPeople(filters);
  const peopleIds = new Set(people.map(e => e.id));
  const groupIds = filters.group === "all" ? GROUP_IDS : [filters.group];
  const final = new Map<string, PersonReportRow>(people.map(e => [e.id,{
    id:e.id,name:e.name,group:e.group,scheduledDays:0,approvedAbsenceDays:0,
    recordedEntries:0,withinAlert:0,overAlert:0,lateMinutes:0,earlyExits:0,
    incompletePunches:0,missingEntries:0,positiveMinutes:0,negativeMinutes:0,
    balanceMinutes:balanceOf(sources.hours,e.id,filters.end),
  }]));
  const dailyPoint: DailyPointRow[] = [];
  const coverage: CoverageReportRow[] = [];
  const shifts: ShiftReportRow[] = [];
  let expectedEntries = 0, recordedEntries = 0, missingEntries = 0;
  let lateCount = 0, incompletePunches = 0, earlyExits = 0, daysWithPoint = 0;
  let absenceDays = 0, plannedShifts = 0, restDays = 0;
  let totalRequired = 0, totalAvailable = 0, totalDeficit = 0;
  let sundays = 0, holidays = 0, conflictingPointOnAbsence = 0;
  const approvedAbsenceByDay = new Map<ISODate, Set<string>>();
  for(const day of dates) {
    const active = new Set(sources.absences.entries.filter(e => e.status === "aprovado" &&
      e.start <= day && e.end >= day && peopleIds.has(e.employeeId)).map(e => e.employeeId));
    approvedAbsenceByDay.set(day,active);
    if(dayOfWeek(day) === 0) sundays++;
    if(sources.schedule.rules.holidays.includes(day)) holidays++;
    let dayHasPunch = false;
    for(const e of people) {
      const member = final.get(e.id)!;
      const group = assignmentFor(sources.schedule,e,day);
      if(group === null) { member.scheduledDays += 0; restDays++; }
      else { member.scheduledDays++; plannedShifts++; }
      if(active.has(e.id)) { member.approvedAbsenceDays++; absenceDays++; }
      const punch = sources.point.records[pointKey(day,e.id)];
      if(group===null || active.has(e.id)) {
        if(punch && Object.values(punch.marks).some(Boolean) && active.has(e.id)) conflictingPointOnAbsence++;
        continue;
      }
      expectedEntries++;
      const info = analysePoint(sources.schedule,sources.point,e,day);
      const entry = info.marks.entry || null;
      if(!entry) missingEntries++;
      else { dayHasPunch = true; recordedEntries++; member.recordedEntries++; }
      if(!entry) member.missingEntries++;
      if(info.late !== null && entry) {
        if(info.late > sources.point.alertMinutes) { member.overAlert++; lateCount++; member.lateMinutes += info.late; }
        else member.withinAlert++;
      }
      if(info.earlyExit!==null && info.earlyExit>0) {member.earlyExits++; earlyExits++;}
      if(info.registered>0 && !info.complete) {member.incompletePunches++; incompletePunches++;}
      if(entry || info.registered) dailyPoint.push({
        date:day,employeeId:e.id,name:e.name,group:e.group,
        planned:info.planned.entry??"—",entry,breakOut:info.marks.breakOut??null,
        breakIn:info.marks.breakIn??null,exit:info.marks.exit??null,
        lateness:info.late,
        status:info.late!==null && info.late>sources.point.alertMinutes?"acima do alerta":
          info.earlyExit!==null&&info.earlyExit>0?"saída antecipada":
          info.registered>0&&!info.complete?"em andamento":
          entry?"no horário":"inconsistência",
      });
    }
    if(dayHasPunch) daysWithPoint++;
    for(const g of groupIds) {
      // Required coverage remains a GROUP-level target. One-person filters apply to personnel
      // tables only: do not compare one employee with the requirement for an entire group.
      if(filters.employeeId!=="all") continue;
      const required=requiredFor(sources.schedule,day,g);
      const groupPeople=people.filter(e=>assignmentFor(sources.schedule,e,day)===g);
      const scheduled=groupPeople.length;
      const absent=groupPeople.filter(e=>active.has(e.id)).length;
      const available=scheduled-absent;
      const deficit=Math.max(0,required-available);
      coverage.push({date:day,group:g,required,scheduled,absent,available,deficit,overtimeNeeded:deficit});
      shifts.push({date:day,group:g,scheduled,restDays:people.filter(e=>e.group===g &&
        assignmentFor(sources.schedule,e,day)===null).length,
        required,holiday:sources.schedule.rules.holidays.includes(day),sunday:dayOfWeek(day)===0});
      totalRequired+=required;totalAvailable+=available;totalDeficit+=deficit;
    }
  }
  const hourMovements:HourReportRow[] = sources.hours.entries
    .filter(e=>peopleIds.has(e.employeeId)&&e.date>=filters.start&&e.date<=filters.end)
    .map(e=>({id:e.id,employeeId:e.employeeId,name:personIndex.get(e.employeeId)?.name??e.employeeId,
      group:personIndex.get(e.employeeId)!.group,date:e.date,kind:e.kind,
      minutes:e.minutes,status:e.status,responsible:e.responsible}))
    .sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  for(const e of sources.hours.entries.filter(row=>peopleIds.has(row.employeeId)&&
    row.status==="aprovado"&&row.date>=filters.start&&row.date<=filters.end)){
    const row=final.get(e.employeeId)!;
    if(e.minutes>0) row.positiveMinutes+=e.minutes;
    else row.negativeMinutes+=-e.minutes;
  }
  const absenceRows:AbsenceReportRow[] = sources.absences.entries.filter(e=>
    peopleIds.has(e.employeeId)&&e.start<=filters.end&&e.end>=filters.start)
    .map(e=>({id:e.id,employeeId:e.employeeId,name:personIndex.get(e.employeeId)?.name??e.employeeId,
      group:personIndex.get(e.employeeId)!.group,kind:ABSENCE_LABELS[e.type],start:e.start,end:e.end,
      status:e.status,returnDate:e.status==="aprovado"?nextWorkDate(sources.schedule,e.employeeId,e.end):null}))
    .sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
  const swapRows:SwapReportRow[]=sources.schedule.requests.filter(r=>
    r.date>=filters.start&&r.date<=filters.end&&
    (peopleIds.has(r.sourceId)||peopleIds.has(r.targetId)))
    .map(r=>({id:r.id,date:r.date,from:personIndex.get(r.sourceId)?.name??r.sourceId,
      to:personIndex.get(r.targetId)?.name??r.targetId,status:r.status,reason:r.reason}))
    .sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const personnel=[...final.values()].sort((a,b)=>b.overAlert-a.overAlert||b.missingEntries-a.missingEntries||
    a.name.localeCompare(b.name,"pt-BR")||a.id.localeCompare(b.id));
  const accepted = hourMovements.filter(e=>e.status==="aprovado");
  const credited=accepted.reduce((n,r)=>n+Math.max(0,r.minutes),0);
  const debited=accepted.reduce((n,r)=>n+Math.max(0,-r.minutes),0);
  return {
    filters,days:dates.length,persons:people.length,personnel,coverage,dailyPoint,
    hourMovements,absenceRows,swapRows,shifts,
    capacity:capacityStudy(),
    summary:{
      plannedShifts,restDays,absenceDays,expectedEntries,recordedEntries,missingEntries,
      punctuality:recordedEntries?(recordedEntries-lateCount)/recordedEntries*100:null,
      pointCapture:expectedEntries?recordedEntries/expectedEntries*100:null,
      lateCount,incompletePunches,earlyExits,daysWithPoint,
      totalRequired,totalAvailable,totalDeficit,
      groupCoverageRate:totalRequired?Math.min(totalAvailable,totalRequired)/totalRequired*100:null,
      sundays,holidays,conflictingPointOnAbsence,
      approvedAbsenceCases:absenceRows.filter(e=>e.status==="aprovado").length,
      pendingAbsenceCases:absenceRows.filter(e=>e.status==="pendente").length,
      credited,debited,
      positiveBalances:personnel.reduce((n,e)=>n+Math.max(0,e.balanceMinutes),0),
      negativeBalances:personnel.reduce((n,e)=>n+Math.max(0,-e.balanceMinutes),0),
      netBalance:personnel.reduce((n,e)=>n+e.balanceMinutes,0),
      pendingHours:hourMovements.filter(e=>e.status==="pendente").length,
      approvedSwaps:swapRows.filter(e=>e.status==="aprovada").length,
    },
    sources:{
      hasPoint: Object.keys(sources.point.records).some(k=>k.slice(0,10)>=filters.start&&k.slice(0,10)<=filters.end),
      activeAbsences:sources.absences.entries.length,
      hourEntries:sources.hours.entries.length,
      swapRequests:sources.schedule.requests.length,
    },
  };
}
