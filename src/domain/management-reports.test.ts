import { describe,expect,it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import { DEFAULT_SCHEDULE,assignmentFor,dateOffset } from "./schedule";
import { EMPTY_POINT_STORE,pointKey } from "./point-simulator";
import { demoAbsences } from "./absences";
import { demoHourStore } from "./hour-bank";
import { buildReport,capacityStudy,datesInRange,reportFilterErrors,type ReportFilters,type ReportSources } from "./management-reports";

const date="2026-10-20";
const sources:ReportSources={
  schedule:DEFAULT_SCHEDULE,point:EMPTY_POINT_STORE,
  absences:demoAbsences(),hours:demoHourStore(),
};
const filter:ReportFilters={start:date,end:date,group:"all",employeeId:"all"};

describe("Relatórios gerenciais — dados fictícios integrados",()=>{
  it("aceita semana/mês e limita customizados a 93 dias reais",()=>{
    expect(datesInRange("2026-10-19","2026-10-20")).toEqual(["2026-10-19","2026-10-20"]);
    expect(datesInRange("2026-02-30","2026-03-01")).toHaveLength(0);
    expect(datesInRange("2026-10-01",dateOffset("2026-10-01",92))).toHaveLength(93);
    expect(datesInRange("2026-10-01",dateOffset("2026-10-01",93))).toHaveLength(0);
    expect(reportFilterErrors({...filter,start:"2026-11-20"}).length).toBeGreaterThan(0);
  });
  it("cruza escala, ausência aprovada e cobertura sem confundir faltas",()=>{
    const report=buildReport(sources,filter);
    expect(report.persons).toBe(21);
    expect(report.days).toBe(1);
    // 6 agentes de portaria (12×36) + 9 de serviços gerais = 15 escalados; 1 deles com ausência aprovada.
    expect(report.summary.plannedShifts).toBe(15);
    expect(report.summary.absenceDays).toBe(3);
    expect(report.summary.recordedEntries).toBe(0);
    expect(report.summary.expectedEntries).toBe(14);
    expect(report.dailyPoint).toHaveLength(14);
    expect(report.dailyPoint.every(e=>e.status==="sem registro")).toBe(true);
    expect(report.summary.missingEntries).toBe(14);
    expect(report.summary.punctuality).toBeNull(); // sem registros, não 0% de pontualidade
    expect(report.coverage).toHaveLength(2);
    expect(report.coverage.reduce((n,r)=>n+r.absent,0)).toBe(1);
    expect(report.summary.totalDeficit).toBe(1);
    expect(report.hourMovements.length).toBeGreaterThan(0);
  });
  it("observa pontualidade apenas com marcações realmente existentes",()=>{
    const employee=DEMO_EMPLOYEES.find(e=>e.group==="P"&&e.turn==="diurno"&&assignmentFor(DEFAULT_SCHEDULE,e,date)==="P")!;
    const mark={
      employeeId:employee.id,date,marks:{entry:"07:15"},
      updatedAt:"2026-10-20T12:00:00Z",
    };
    const report=buildReport({...sources,point:{...EMPTY_POINT_STORE,records:{
      [pointKey(date,employee.id)]:mark,
    }}},filter);
    expect(report.summary.recordedEntries).toBe(1);
    expect(report.summary.lateCount).toBe(1);
    expect(report.summary.punctuality).toBe(0);
    expect(report.summary.incompletePunches).toBe(1);
    expect(report.summary.missingEntries).toBe(13);
    expect(report.dailyPoint[0]).toMatchObject({
      employeeId:employee.id,entry:"07:15",lateness:15,status:"acima do alerta",
    });
  });
  it("aplica filtro individual sem comparar uma pessoa à meta da equipe",()=>{
    const report=buildReport(sources,{...filter,employeeId:"MN-001"});
    expect(report.persons).toBe(1);
    expect(report.personnel).toHaveLength(1);
    expect(report.coverage).toHaveLength(0);
    expect(report.summary.totalDeficit).toBe(0);
    expect(reportFilterErrors({...filter,group:"S",employeeId:"MN-001"}).length).toBeGreaterThan(0);
  });
  it("considera apenas créditos e débitos aprovados na competência, com saldo anterior preservado",()=>{
    const manualHours={...sources.hours,entries:sources.hours.entries.filter(e=>e.id.startsWith("BH-"))};
    const report=buildReport({...sources,hours:manualHours},{...filter,start:"2026-10-01"});
    expect(report.summary.credited).toBeGreaterThan(0);
    expect(report.summary.debited).toBeGreaterThan(0);
    expect(report.summary.pendingHours).toBe(1);
    expect(report.summary.netBalance).toBe(165);
    expect(report.summary.openingBalance).toBe(120);
    const row=report.personnel.find(e=>e.id==="MN-016")!;
    expect(row.balanceMinutes).toBe(60); // inclui crédito de setembro
    expect(row.negativeMinutes).toBe(60); // compensação de outubro
    expect(report.hourMovements.some(e=>e.status==="pendente")).toBe(true);
  });
  it("revela déficit por posto-dia mesmo quando um dia tiver quadro superior ao requerido",()=>{
    const report=buildReport(sources,filter);
    const day=report.coverage.filter(r=>r.date===date);
    // Portaria completa; serviços gerais fica 1 abaixo por causa do atestado aprovado.
    expect(day.find(r=>r.group==="P")!.deficit).toBe(0);
    expect(day.find(r=>r.group==="S")!.deficit).toBe(1);
    expect(day.reduce((n,r)=>n+r.deficit,0)).toBe(1);
    expect(report.summary.groupCoverageRate).not.toBeNull();
    expect(report.summary.groupCoverageRate).toBeLessThanOrEqual(100);
  });
  it("mantém comparativo 6×1 e 5×2 explicitamente como cenários de capacidade",()=>{
    // Serviços gerais em 6×1: 9 pessoas × 6 dias = 54 jornadas; na 5×2 são 45 (sem sábado) ou 11 pessoas para manter o sábado.
    expect(capacityStudy().map(r=>r.theoreticalShifts)).toEqual([54,45,55]);
    expect(capacityStudy().map(r=>r.delta)).toEqual([0,-9,1]);
  });
});
