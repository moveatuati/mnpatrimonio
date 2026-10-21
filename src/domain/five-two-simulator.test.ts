import {describe,expect,it} from "vitest";
import {demoAbsences} from "./absences";
import {DEFAULT_SCHEDULE,dateOffset,dayOfWeek} from "./schedule";
import {BASE_PEOPLE,DEFAULT_PARAMETERS,FUTURE_START,LEGAL_SOURCES,MAX_PEOPLE,PROPOSED_SHIFTS,
  defaultParameters,makeScenarioPeople,portariaWeeklyAverage,proposedShift,requiredOn,simulate5x2,theoreticalMinimum} from "./five-two-simulator";

describe("EC 141/2026 · simulador 5×2 dos serviços gerais",()=>{
  it("preserva as datas oficiais de transição",()=>{
    expect(LEGAL_SOURCES.promulgation).toBe("2026-10-16");
    expect(LEGAL_SOURCES.firstPhase).toBe("2026-12-15");
    expect(LEGAL_SOURCES.finalPhase).toBe("2027-12-15");
    expect(dayOfWeek(FUTURE_START)).toBe(1);
  });
  it("parte do quadro atual de serviços gerais e adiciona reforços fictícios únicos",()=>{
    expect(BASE_PEOPLE).toBe(9);
    for(const n of [9,11,20]){
      const list=makeScenarioPeople(n);
      expect(list).toHaveLength(n);
      expect(new Set(list.map(x=>x.id)).size).toBe(n);
      expect(list.filter(x=>x.hired)).toHaveLength(n-9);
    }
  });
  it("jornadas propostas de 42h (8h24) e 40h (8h)",()=>{
    expect(proposedShift(42).minutes).toBe(504);
    expect(proposedShift(40).minutes).toBe(480);
    expect(PROPOSED_SHIFTS[42].end).toBe("16:24");
    expect(PROPOSED_SHIFTS[40].end).toBe("16:00");
  });
  it("piso aritmético: manter o sábado exige 11 pessoas; sem sábado, 9 bastam",()=>{
    expect(theoreticalMinimum({weekdayStaff:9,saturdayStaff:9,sundayStaff:0})).toBe(11);
    expect(theoreticalMinimum({weekdayStaff:9,saturdayStaff:0,sundayStaff:0})).toBe(9);
    expect(DEFAULT_PARAMETERS.people).toBe(11);
    expect(defaultParameters(DEFAULT_SCHEDULE).saturdayStaff).toBe(9);
    expect(requiredOn(DEFAULT_PARAMETERS,FUTURE_START)).toBe(9);
    expect(requiredOn(DEFAULT_PARAMETERS,dateOffset(FUTURE_START,6))).toBe(0);
  });
  it("com o piso cobre 100% e cada pessoa tem 5 jornadas e 2 folgas por semana",()=>{
    const r=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),DEFAULT_PARAMETERS);
    expect(r.metrics.coverageRate).toBe(100);
    expect(r.metrics.restViolations).toBe(0);
    expect(r.metrics.badHours).toBe(0);
    for(const w of r.byWeek){
      expect(w.workingDates).toHaveLength(5);
      expect(w.restDates).toHaveLength(2);
      expect(w.minutes).toBeLessThanOrEqual(42*60);
    }
  });
  it("com o quadro atual o sábado fica descoberto",()=>{
    const r=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,people:9});
    expect(r.metrics.saturdayDeficit).toBeGreaterThan(0);
    const noSaturday=simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,people:9,saturdayStaff:0});
    expect(noSaturday.metrics.coverageRate).toBe(100);
    expect(noSaturday.personSummary.every(p=>p.weekendsOff===4)).toBe(true);
  });
  it("portaria 12×36 fica abaixo dos tetos de 42h e 40h",()=>{
    expect(portariaWeeklyAverage().hours).toBe(38.5);
  });
  it("recusa semana iniciada em terça ou quadro fora do limite",()=>{
    expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,start:"2026-12-22"})).toThrow(/segunda-feira/);
    expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,people:8})).toThrow(/Escolha/);
    expect(()=>simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),{...DEFAULT_PARAMETERS,people:MAX_PEOPLE+1})).toThrow(/Escolha/);
  });
  it("não modifica a escala oficial",()=>{
    const before=JSON.stringify(DEFAULT_SCHEDULE);
    simulate5x2(DEFAULT_SCHEDULE,demoAbsences(),DEFAULT_PARAMETERS);
    expect(JSON.stringify(DEFAULT_SCHEDULE)).toBe(before);
  });
});
