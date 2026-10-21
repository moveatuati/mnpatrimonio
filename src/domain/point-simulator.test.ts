import { describe, expect, it } from "vitest";
import { DEMO_EMPLOYEES } from "./demo-data";
import { DEFAULT_SCHEDULE, withChanges } from "./schedule";
import {
  EMPTY_POINT_STORE, analysePoint, clearPointDay, markPoint, nextMark,
  pointKey, pointSummary, readPointStore, requiredMarks, seedPointDay,
} from "./point-simulator";

const employee = DEMO_EMPLOYEES[0]!;
const day = "2026-10-24"; // sábado: portaria 12×36 (turma do agente) + serviços gerais 6×1
function registerFour() {
  let store = EMPTY_POINT_STORE;
  for (const [mark,time] of [
    ["entry","07:00"],["breakOut","12:00"],["breakIn","13:00"],["exit","19:00"],
  ] as const) {
    const result = markPoint(store,DEFAULT_SCHEDULE,employee,day,mark,time,
      {recordedAt:"2026-10-20T13:00:00.000Z"});
    expect(result.ok).toBe(true);
    store=result.store;
  }
  return store;
}
describe("Ponto demonstrativo separado da escala e do relógio real",()=>{
  it("inicia sem marcações e usa o planejamento da escala",()=>{
    expect(pointSummary(DEFAULT_SCHEDULE,EMPTY_POINT_STORE,day)).toEqual({
      planned:15,started:0,completed:0,attention:0,unregistered:15,
    });
    expect(requiredMarks(DEFAULT_SCHEDULE,employee,day)).toEqual(["entry","breakOut","breakIn","exit"]);
    expect(nextMark(DEFAULT_SCHEDULE,employee,day)).toBe("entry");
  });
  it("exige quatro marcações crescentes na ordem e fecha somente ao final",()=>{
    const wrong=markPoint(EMPTY_POINT_STORE,DEFAULT_SCHEDULE,employee,day,"exit","19:00");
    expect(wrong.ok).toBe(false);
    const complete=registerFour();
    const analysis=analysePoint(DEFAULT_SCHEDULE,complete,employee,day);
    expect(analysis.status).toBe("completo");
    expect(analysis.registered).toBe(4);
    expect(nextMark(DEFAULT_SCHEDULE,employee,day,complete.records[pointKey(day,employee.id)])).toBeNull();
    expect(complete.history).toHaveLength(4);
    const invalid=markPoint(complete,DEFAULT_SCHEDULE,employee,day,"breakIn","11:00",
      {correctionReason:"Correção de marcação errada"});
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toMatch(/crescentes/);
  });
  it("permite correções justificadas e registra histórico imutável da simulação",()=>{
    const complete=registerFour();
    expect(markPoint(complete,DEFAULT_SCHEDULE,employee,day,"entry","07:14").ok).toBe(false);
    const result=markPoint(complete,DEFAULT_SCHEDULE,employee,day,"entry","07:14",
      {correctionReason:"Ajuste feito para demonstrar atraso",recordedAt:"2026-10-20T13:50:00Z"});
    expect(result.ok).toBe(true);
    expect(result.store.history.at(-1)?.description).toContain("Justificativa:");
    expect(complete.records[pointKey(day,employee.id)]?.marks.entry).toBe("07:00");
    const info=analysePoint(DEFAULT_SCHEDULE,result.store,employee,day);
    expect(info.status).toBe("atenção");
    expect(info.late).toBe(14);
    expect(info.complete).toBe(true);
  });
  it("não confunde intervalo incompleto com jornada concluída",()=>{
    const first=markPoint(EMPTY_POINT_STORE,DEFAULT_SCHEDULE,employee,day,"entry","07:00");
    expect(first.ok).toBe(true);
    expect(analysePoint(DEFAULT_SCHEDULE,first.store,employee,day).status).toBe("em andamento");
    expect(markPoint(first.store,DEFAULT_SCHEDULE,employee,day,"breakIn","13:00").ok).toBe(false);
  });
  it("plantão noturno da portaria atravessa a meia-noite no mesmo registro",()=>{
    const night=DEMO_EMPLOYEES.find(e=>e.group==="P"&&e.turn==="noturno"&&requiredMarks(DEFAULT_SCHEDULE,e,day).length>0)!;
    expect(requiredMarks(DEFAULT_SCHEDULE,night,day)).toEqual(["entry","breakOut","breakIn","exit"]);
    let store=EMPTY_POINT_STORE;
    for(const [mark,time] of [["entry","19:05"],["breakOut","00:00"],["breakIn","01:00"],["exit","07:20"]] as const){
      const r=markPoint(store,DEFAULT_SCHEDULE,night,day,mark,time);
      expect(r.ok).toBe(true);store=r.store;
    }
    const info=analysePoint(DEFAULT_SCHEDULE,store,night,day);
    expect(info.complete).toBe(true);
    expect(info.late).toBe(5);
    expect(info.overtime).toBe(20);
    expect(info.status).toBe("completo");
  });
  it("gera amostra com os escalados, sem sobrescrever uma marcação manual",()=>{
    const manual=markPoint(EMPTY_POINT_STORE,DEFAULT_SCHEDULE,employee,day,"entry","07:09");
    expect(manual.ok).toBe(true);
    const filled=seedPointDay(manual.store,DEFAULT_SCHEDULE,day,"2026-10-20T14:00:00Z");
    expect(filled.records[pointKey(day,employee.id)]?.marks.entry).toBe("07:09");
    expect(pointSummary(DEFAULT_SCHEDULE,filled,day).started).toBe(15);
    expect(Object.keys(filled.records)).toHaveLength(15);
    expect(pointSummary(DEFAULT_SCHEDULE,filled,day).attention).toBeLessThanOrEqual(2);
    expect(seedPointDay(filled,DEFAULT_SCHEDULE,day)).toBe(filled);
    const empty=clearPointDay(filled,day);
    expect(Object.keys(empty.records)).toHaveLength(0);
    expect(empty.history.at(-1)?.action).toBe("limpar");
  });
  it("marca situação de atenção se surgir registro em folga após mudar a escala",()=>{
    const store=registerFour();
    const schedule=withChanges(DEFAULT_SCHEDULE,[{employeeId:employee.id,date:day,group:null}]);
    expect(analysePoint(schedule,store,employee,day).status).toBe("atenção");
  });
  it("recupera só horas válidas, sem misturar dados de outros aplicativos",()=>{
    const valid=registerFour();
    const saved=readPointStore({...valid,alertMinutes:999});
    expect(saved.alertMinutes).toBe(60);
    expect(saved.records[pointKey(day,employee.id)]?.marks.entry).toBe("07:00");
    expect(readPointStore({version:3}).version).toBe(1);
  });
});
