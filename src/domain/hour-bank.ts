import { BANK_RULES, employeeShift, shiftMinutes } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import { isValidReferenceDate } from "./operation-query";
import { DEFAULT_SCHEDULE, assignmentFor, dateOffset, dayOfWeek, shiftFor, type AssignmentChange, type ScheduleStore } from "./schedule";
import type { Employee, ISODate } from "./types";

/** Livro-razão de demonstração: quantidades inteiras de minutos; sem cálculos automáticos de folha/ponto. */
export type HourKind = "credito_extra" | "credito_ajuste" | "debito_ausencia" |
  "debito_ajuste" | "compensacao" | "baixa_informada" | "estorno" |
  "saida_antecipada" | "entrada_tardia";
export type EntryStatus = "pendente" | "aprovado" | "recusado";
export type HourEntry = {
  id: string;
  employeeId: string;
  date: ISODate;
  kind: HourKind;
  minutes: number; // sinal positivo = crédito; negativo = débito. Valores sempre inteiros.
  description: string;
  responsible: string;
  status: EntryStatus;
  createdAt: string;
  decidedAt?: string;
  decisionNote?: string;
  reversalOf?: string;
};
export type HourEvent = {
  id: string; entryId: string; at: string; actor: string; detail: string;
};
export type HourStore = { version:1; entries:HourEntry[]; history:HourEvent[] };
export type EntryDraft = {
  employeeId:string; date:ISODate; kind:Exclude<HourKind,"estorno">;
  hours:string; minutes:string; description:string; responsible:string;
};
/** Demonstração com saldo simulado (acúmulo pelo ponto eletrônico). */
export const HOUR_KEY = "mn:condominios:banco-horas-demo:v1";
export const REFERENCE_DAY = "2026-10-20";
export const KINDS: Record<HourKind, string> = {
  credito_extra:"Crédito autorizado",
  credito_ajuste:"Ajuste de crédito",
  debito_ausencia:"Débito autorizado",
  debito_ajuste:"Ajuste de débito",
  compensacao:"Compensação autorizada",
  baixa_informada:"Baixa informada (sem integração com folha)",
  estorno:"Estorno de lançamento",
  saida_antecipada:"Saída antecipada (usa o banco)",
  entrada_tardia:"Entrada mais tarde (usa o banco)",
};
export const ENTRY_STATUSES: Record<EntryStatus,string> = {
  pendente:"Aguardando aprovação", aprovado:"Aprovado", recusado:"Recusado",
};
export const DEBIT_KINDS:HourKind[] = ["debito_ausencia","debito_ajuste","compensacao","baixa_informada","saida_antecipada","entrada_tardia"];
export const CREDIT_KINDS:HourKind[] = ["credito_extra","credito_ajuste"];
export const DEFAULT_DRAFT:EntryDraft = {
  employeeId:"MN-001",date:REFERENCE_DAY,kind:"credito_extra",
  hours:"1",minutes:"00",description:"",responsible:"Gestão demonstrativa",
};
const demoRows = [
  ["BH-001","MN-001","2026-10-01","credito_extra",90,"Cobertura de troca de turno na portaria"],
  ["BH-002","MN-001","2026-10-08","compensacao",-30,"Compensação autorizada em escala"],
  ["BH-003","MN-002","2026-10-05","credito_extra",110,"Apoio em horário extraordinário"],
  ["BH-004","MN-002","2026-10-16","debito_ausencia",-45,"Ajuste demonstrativo autorizado"],
  ["BH-005","MN-006","2026-10-03","credito_ajuste",35,"Acerto de conferência da jornada"],
  ["BH-006","MN-006","2026-10-19","compensacao",-20,"Compensação aprovada"],
  ["BH-007","MN-012","2026-10-11","credito_extra",75,"Extensão de expediente demonstrativa"],
  ["BH-008","MN-012","2026-10-20","debito_ajuste",-15,"Ajuste de saldo em revisão"],
  ["BH-009","MN-016","2026-09-25","credito_extra",120,"Saldo inicial ilustrativo anterior ao mês"],
  ["BH-010","MN-016","2026-10-14","compensacao",-60,"Compensação de período anterior"],
  ["BH-011","MN-020","2026-10-21","credito_extra",80,"Solicitação futura ilustrativa"],
  ["BH-012","MN-010","2026-10-19","debito_ajuste",-75,"Apontamento pendente de justificativa"],
  ["BH-013","MN-010","2026-10-14","debito_ajuste",-95,"Débito ilustrativo já aprovado"],
] as const;
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/** Saldo-alvo fictício por pessoa, para a demonstração parecer uma operação real:
 * ~1 em 8 já passou de 7h, ~1 em 4 entre 4h e 7h, a maioria abaixo de 4h e alguns negativos. */
function simulatedTarget(employeeId:string){
  const r=hash("bh:"+employeeId)%100;
  if(r<13)return 420+(r*13)%110;          // 7h00 a 8h50 → dar folga
  if(r<38)return 240+(r*17)%175;          // 4h00 a 6h55 → planejar folga
  if(r<90)return 20+(r*23)%200;           // 0h20 a 3h40 → tranquilo
  return -(30+(r*7)%70);                  // saldo negativo (saída antecipada usada)
}
/** Créditos que o ponto simulado teria gerado (minutos após o horário de saída) de 01 a 20/10. */
export function simulatedPointEntries(until:ISODate=REFERENCE_DAY):HourEntry[]{
  const rows:HourEntry[]=[];
  const days=Array.from({length:Number(until.slice(8,10))},(_,i)=>until.slice(0,8)+String(i+1).padStart(2,"0"));
  for(const employee of DEMO_EMPLOYEES){
    if(demoRows.some(row=>row[1]===employee.id))continue;
    const target=simulatedTarget(employee.id);
    const working=days.filter(d=>assignmentFor(DEFAULT_SCHEDULE,employee,d)!==null);
    if(target<0){
      const date=working[(hash(employee.id)%Math.max(1,working.length))]??until;
      rows.push({id:"PT-"+employee.id+"-1",employeeId:employee.id,date,kind:"saida_antecipada",minutes:target,
        description:"Saída antecipada autorizada (consulta médica)",responsible:"Supervisor(a) do condomínio",status:"aprovado",
        createdAt:date+"T18:00:00.000Z",decidedAt:date+"T18:00:00.000Z",decisionNote:"Simulação"});
      continue;
    }
    let left=target,n=0;
    while(left>0&&working.length){
      const amount=Math.min(left,10+((hash(employee.id+n)%9)*5));
      const date=working[(n*3+hash(employee.id)%3)%working.length]!;
      const shift=shiftFor(date,employee.group,DEFAULT_SCHEDULE.rules,employee);
      rows.push({id:"PT-"+employee.id+"-"+(n+1),employeeId:employee.id,date,kind:"credito_extra",minutes:amount,
        description:"Saída após o horário ("+shift.end+") registrada no ponto eletrônico",responsible:"Ponto eletrônico (simulado)",
        status:"aprovado",createdAt:date+"T23:00:00.000Z",decidedAt:date+"T23:00:00.000Z",decisionNote:"Acúmulo automático"});
      left-=amount;n++;
    }
  }
  return rows;
}
export function demoHourStore():HourStore {
  const manual:HourEntry[]=demoRows.map(([id,employeeId,date,kind,minutes,description])=>({
    id,employeeId,date,kind,minutes,description,responsible:"Gestão demonstrativa",
    status:id==="BH-012"?"pendente": "aprovado",
    createdAt:"2026-10-20T09:00:00.000Z",
    ...(id==="BH-012"?{}:{decidedAt:"2026-10-20T09:00:00.000Z",decisionNote:"Aprovação fictícia inicial"}),
  }));
  return { version:1,entries:[...manual,...simulatedPointEntries()],history:[] };
}
const known=new Set(DEMO_EMPLOYEES.map(x=>x.id));
const kinds=Object.keys(KINDS) as HourKind[];
const statuses=Object.keys(ENTRY_STATUSES) as EntryStatus[];
function clean(x:string,max=240){return x.replace(/\s+/g," ").trim().slice(0,max);}
export function validHHMM(hours:string,minutes:string):boolean {
  return /^\d{1,3}$/.test(hours)&&/^\d{1,2}$/.test(minutes)&&
    Number(hours)<=999&&Number(minutes)<60&&Number(hours)*60+Number(minutes)>0;
}
export function parseMinutes(hours:string,minutes:string):number|null {
  if(!validHHMM(hours,minutes))return null;
  return Number(hours)*60+Number(minutes);
}
export function duration(total:number):string {
  if(!Number.isSafeInteger(total))return "—";
  const prefix=total<0?"−":total>0?"+":"";
  const n=Math.abs(total);
  return prefix+String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
export function signedMinutes(kind:Exclude<HourKind,"estorno">,amount:number):number {
  return DEBIT_KINDS.includes(kind)?-amount:amount;
}
export function restoreHours(raw:unknown):HourStore {
  if(!raw||typeof raw!=="object")return demoHourStore();
  const data=raw as Partial<HourStore>;
  if(data.version!==1||!Array.isArray(data.entries)||!Array.isArray(data.history))return demoHourStore();
  const entries:HourEntry[]=[];
  const usedIds=new Set<string>();
  for(const item of data.entries.slice(-4000)){
    if(!item||typeof item!=="object"||typeof item.id!=="string"||usedIds.has(item.id)||
      !known.has(item.employeeId)||!isValidReferenceDate(item.date)||!kinds.includes(item.kind)||
      !statuses.includes(item.status)||!Number.isSafeInteger(item.minutes)||item.minutes===0||
      Math.abs(item.minutes)>59999||typeof item.description!=="string"||
      typeof item.responsible!=="string")continue;
    if(item.kind!=="estorno"&&((CREDIT_KINDS.includes(item.kind)&&item.minutes<0)||
      (DEBIT_KINDS.includes(item.kind)&&item.minutes>0)))continue;
    usedIds.add(item.id);
    entries.push({
      id:item.id.slice(0,80),employeeId:item.employeeId,date:item.date,kind:item.kind,
      minutes:item.minutes,status:item.status,description:clean(item.description),
      responsible:clean(item.responsible,100),
      createdAt:typeof item.createdAt==="string"?item.createdAt:"",
      ...(typeof item.decidedAt==="string"?{decidedAt:item.decidedAt}:{}),
      ...(typeof item.decisionNote==="string"?{decisionNote:clean(item.decisionNote)}:{}),
      ...(typeof item.reversalOf==="string"?{reversalOf:item.reversalOf.slice(0,80)}:{}),
    });
  }
  const history=data.history.filter((x):x is HourEvent=>Boolean(x&&
    typeof x.id==="string"&&typeof x.entryId==="string"&&typeof x.at==="string"&&
    typeof x.actor==="string"&&typeof x.detail==="string"))
    .slice(-5000).map(x=>({...x,actor:clean(x.actor,100),detail:clean(x.detail)}));
  return {version:1,entries,history};
}
function event(entryId:string,detail:string,now:string,actor:string):HourEvent{
  return {id:now+":"+Math.random().toString(36).slice(2,9),entryId,at:now,detail:clean(detail),actor:clean(actor,100)};
}
export function validateDraft(draft:EntryDraft):string[]{
  const errors:string[]=[];
  if(!known.has(draft.employeeId))errors.push("Selecione um colaborador válido.");
  if(!isValidReferenceDate(draft.date))errors.push("Informe uma data válida.");
  if(!kinds.includes(draft.kind)||(draft.kind as string)==="estorno")errors.push("Tipo de lançamento inválido.");
  if(parseMinutes(draft.hours,draft.minutes)===null)
    errors.push("Use horas e minutos válidos (minutos de 00 a 59 e duração maior que zero).");
  if(draft.description.trim().length<8)errors.push("Informe justificativa de pelo menos 8 caracteres.");
  if(!draft.responsible.trim())errors.push("Identifique o responsável pelo lançamento.");
  if(draft.description.length>240||draft.responsible.length>100)errors.push("Texto maior que o permitido.");
  return errors;
}
export function proposeEntry(store:HourStore,draft:EntryDraft,now=new Date().toISOString()){
  const errors=validateDraft(draft);
  if(errors.length)return {ok:false as const,errors,store};
  const amount=parseMinutes(draft.hours,draft.minutes)!;
  const row:HourEntry={
    id:"BH-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
    employeeId:draft.employeeId,date:draft.date,kind:draft.kind,
    minutes:signedMinutes(draft.kind,amount),description:clean(draft.description),
    responsible:clean(draft.responsible,100),status:"pendente",createdAt:now,
  };
  return {ok:true as const,errors:[],store:{version:1 as const,
    entries:[...store.entries,row],
    history:[...store.history,event(row.id,"Lançamento proposto: "+KINDS[row.kind]+" "+duration(row.minutes),now,row.responsible)],
  }};
}
export function decideEntry(store:HourStore,id:string,decision:"aprovar"|"recusar",actor:string,reason:string,
  now=new Date().toISOString()){
  const row=store.entries.find(e=>e.id===id);
  if(!row||row.status!=="pendente")
    return {ok:false as const,message:"Somente lançamentos pendentes podem receber decisão.",store};
  if(actor.trim().length<2)return {ok:false as const,message:"Identifique o responsável pela decisão.",store};
  if(decision==="recusar"&&reason.trim().length<5)
    return {ok:false as const,message:"Para recusar, informe motivo com pelo menos 5 caracteres.",store};
  const status:EntryStatus=decision==="aprovar"?"aprovado":"recusado";
  const change={...row,status,decidedAt:now,decisionNote:clean(reason||"Aprovação demonstrativa")};
  return {ok:true as const,message:"Decisão demonstrativa registrada.",store:{
    version:1 as const,
    entries:store.entries.map(e=>e.id===id?change:e),
    history:[...store.history,event(id,"Lançamento "+status+" ("+duration(row.minutes)+") · "+change.decisionNote,
      now,actor)],
  }};
}
/** Corrigir um lançamento aprovado via estorno correspondente; nunca apagar nem recalcular silenciosamente.
 * Estorno sempre tem a mesma competência do original, para manter extratos históricos consistentes.
 */
export function reverseEntry(store:HourStore,id:string,actor:string,reason:string,now=new Date().toISOString()){
  const row=store.entries.find(e=>e.id===id);
  if(!row||row.status!=="aprovado"||row.kind==="estorno")
    return {ok:false as const,message:"Somente lançamento aprovado original pode ser estornado.",store};
  if(store.entries.some(e=>e.reversalOf===id&&e.status==="aprovado"))
    return {ok:false as const,message:"Este lançamento já foi estornado.",store};
  if(actor.trim().length<2||reason.trim().length<8)
    return {ok:false as const,message:"Informe responsável e motivo do estorno (mínimo 8 caracteres).",store};
  const reversal:HourEntry={
    ...row,id:"EST-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
    minutes:-row.minutes,kind:"estorno",status:"aprovado",
    reversalOf:id,createdAt:now,decidedAt:now,responsible:clean(actor,100),
    description:"Estorno de "+id+": "+clean(reason),decisionNote:clean(reason),
  };
  return {ok:true as const,message:"Estorno demonstrativo aplicado; lançamento original preservado.",store:{
    version:1 as const,entries:[...store.entries,reversal],
    history:[...store.history,event(reversal.id,"Estorno de "+id+" ("+duration(reversal.minutes)+") · "+reason,now,actor)],
  }};
}
export function approvedThrough(store:HourStore,date:ISODate,employeeId?:string){
  return store.entries.filter(e=>e.status==="aprovado"&&e.date<=date&&
    (!employeeId||e.employeeId===employeeId));
}
export function balanceOf(store:HourStore,employeeId:string,date:ISODate):number{
  return approvedThrough(store,date,employeeId).reduce((acc,e)=>acc+e.minutes,0);
}
export function movementsOf(store:HourStore,employeeId:string,first:ISODate,last:ISODate){
  const rows=store.entries.filter(e=>e.status==="aprovado"&&e.employeeId===employeeId&&
    e.date>=first&&e.date<=last);
  return {credits:rows.reduce((v,e)=>v+Math.max(0,e.minutes),0),
    debits:rows.reduce((v,e)=>v+Math.max(0,-e.minutes),0),
    net:rows.reduce((v,e)=>v+e.minutes,0),count:rows.length};
}
export function monthWindow(date:ISODate){
  const month=date.slice(0,7);
  const first=month+"-01";
  const [year=0,monthN=1]=month.split("-").map(Number);
  const end=new Date(Date.UTC(year,monthN,0)).toISOString().slice(0,10);
  return {first,end};
}
export function hourSnapshot(store:HourStore,date:ISODate,employeeId?:string){
  const {first}=monthWindow(date);
  const rows=DEMO_EMPLOYEES.filter(e=>!employeeId||e.id===employeeId);
  return rows.map(employee=>{
    const opening=balanceOf(store,employee.id,new Date(Date.parse(first+"T12:00:00Z")-86400000).toISOString().slice(0,10));
    const movement=movementsOf(store,employee.id,first,date);
    return {employee,opening,...movement,closing:opening+movement.net,
      pending:store.entries.filter(e=>e.employeeId===employee.id&&e.status==="pendente"&&e.date<=date).length};
  });
}
export function hourTotals(store:HourStore,date:ISODate){
  const rows=hourSnapshot(store,date);
  return {positive:rows.reduce((v,r)=>v+Math.max(0,r.closing),0),
    negative:rows.reduce((v,r)=>v+Math.max(0,-r.closing),0),
    net:rows.reduce((v,r)=>v+r.closing,0),
    credited:rows.reduce((v,r)=>v+r.credits,0),
    debited:rows.reduce((v,r)=>v+r.debits,0),
    pending:store.entries.filter(e=>e.status==="pendente").length,
    peoplePositive:rows.filter(r=>r.closing>0).length,
    peopleNegative:rows.filter(r=>r.closing<0).length,
  };
}

/* ------------------------------------------------------------------
 * Painel simples do banco de horas (regras informadas pela gerência):
 * - minutos a mais na saída acumulam crédito;
 * - ao chegar a 7h, conceder uma folga de compensação, de preferência
 *   no período de BAIXO movimento (dia 19 a 27);
 * - pedidos de saída antecipada / entrada mais tarde usam o saldo.
 * ------------------------------------------------------------------ */
export type BankLevel = "negativo" | "verde" | "amarelo" | "vermelho";
export const BANK_LEVEL_TEXT: Record<BankLevel, { label: string; advice: string }> = {
  negativo: { label: "Saldo negativo", advice: "Deve horas: combinar reposição." },
  verde: { label: "Tranquilo", advice: "Saldo baixo, nada a fazer." },
  amarelo: { label: "Planejar folga", advice: "Combine a folga de compensação dentro do prazo do acordo (até 6 meses)." },
  vermelho: { label: "Dar folga agora", advice: "Saldo de 1 jornada ou mais: conceda a folga de compensação para não virar hora extra paga." },
};
export function bankLevel(minutes: number): BankLevel {
  if (minutes < 0) return "negativo";
  if (minutes >= BANK_RULES.compensateMinutes) return "vermelho";
  if (minutes >= BANK_RULES.attentionMinutes) return "amarelo";
  return "verde";
}
/** Horas em texto simples: 445 → "7h25", -30 → "-0h30". */
export function hoursText(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  const n = Math.abs(Math.trunc(minutes));
  return (minutes < 0 ? "-" : "") + Math.floor(n / 60) + "h" + String(n % 60).padStart(2, "0");
}
export interface BankRow {
  employee: Employee;
  minutes: number;
  level: BankLevel;
  pending: number;
  lastCredit: ISODate | null;
  /** Crédito aprovado mais antigo e o prazo para compensar (acordo individual: 6 meses). */
  oldestCredit: ISODate | null;
  deadline: ISODate | null;
}
/** Minutos de uma folga de compensação = 1 jornada do colaborador (12×36: 11h; 6×1: 7h20; 5×2: 8h24/8h). */
export function compensationMinutesFor(employee: Pick<Employee, "group" | "turn">, date: ISODate): number {
  return shiftMinutes(employeeShift(employee, date));
}
/** Prazo final de compensação a partir da data do crédito. */
export function compensationDeadline(date: ISODate, months = BANK_RULES.compensationMonths): ISODate {
  const [y = 2026, m = 1, d = 1] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
export function bankBoard(store: HourStore, date: ISODate): BankRow[] {
  return DEMO_EMPLOYEES.map(employee => {
    const minutes = balanceOf(store, employee.id, date);
    const credits = store.entries.filter(e => e.employeeId === employee.id && e.status === "aprovado" && e.minutes > 0 && e.date <= date);
    const dates = credits.map(e => e.date).sort();
    const oldestCredit = minutes > 0 ? dates[0] ?? null : null;
    return {
      employee, minutes, level: bankLevel(minutes),
      pending: store.entries.filter(e => e.employeeId === employee.id && e.status === "pendente").length,
      lastCredit: dates.at(-1) ?? null,
      oldestCredit, deadline: oldestCredit ? compensationDeadline(oldestCredit) : null,
    };
  }).sort((a, b) => b.minutes - a.minutes || a.employee.name.localeCompare(b.employee.name));
}
export function bankSummary(store: HourStore, date: ISODate) {
  const rows = bankBoard(store, date);
  const count = (level: BankLevel) => rows.filter(r => r.level === level).length;
  return {
    vermelho: count("vermelho"), amarelo: count("amarelo"), verde: count("verde"), negativo: count("negativo"),
    totalPositive: rows.reduce((n, r) => n + Math.max(0, r.minutes), 0),
    folgasDevidas: rows.reduce((n, r) => n + Math.floor(Math.max(0, r.minutes) / BANK_RULES.compensateMinutes), 0),
  };
}
/** Resposta direta para o gerente: a pessoa pode usar X minutos do banco? */
export function canUseBank(balance: number, request: number) {
  const remaining = balance - request;
  if (request <= 0) return { ok: false, remaining: balance, message: "Informe quanto tempo a pessoa precisa." };
  if (remaining >= 0) return { ok: true, remaining, message: "Sim. Tem saldo. Depois do pedido ficará com " + hoursText(remaining) + "." };
  return { ok: false, remaining, message: "Não tem saldo suficiente. Faltam " + hoursText(-remaining) + ". Precisa de autorização do RH." };
}
/** Próximo dia (a partir de amanhã) em que a pessoa estaria trabalhando — vira a folga de compensação.
 * Serviços gerais: prefere segunda a sexta. Portaria: o próximo plantão da turma. */
export function suggestCompensationDate(schedule: ScheduleStore, employee: Employee, from: ISODate): ISODate {
  let date = dateOffset(from, 1);
  for (let i = 0; i < 70; i++) {
    const weekday = dayOfWeek(date);
    const okDay = employee.group === "P" || (weekday >= 1 && weekday <= 5);
    if (okDay && assignmentFor(schedule, employee, date) !== null) return date;
    date = dateOffset(date, 1);
  }
  return date;
}
function newId(prefix: string, now: string) { return prefix + "-" + Date.parse(now).toString(36) + "-" + Math.random().toString(36).slice(2, 7); }
/** Programa a folga de compensação: lança o débito de 1 jornada e devolve o ajuste da escala (folga no dia). */
export function scheduleCompensation(store: HourStore, employee: Employee, date: ISODate, actor: string, now = new Date().toISOString()) {
  if (!isValidReferenceDate(date)) return { ok: false as const, message: "Data inválida.", store, change: null };
  const row: HourEntry = {
    id: newId("FC", now), employeeId: employee.id, date, kind: "compensacao", minutes: -compensationMinutesFor(employee, date),
    description: "Folga de compensação do banco de horas", responsible: clean(actor || "Gerente", 100),
    status: "aprovado", createdAt: now, decidedAt: now, decisionNote: "Folga programada pelo gestor",
  };
  const change: AssignmentChange = { employeeId: employee.id, date, group: null };
  return {
    ok: true as const, message: "Folga marcada para " + date.split("-").reverse().join("/") + ".",
    change,
    store: { version: 1 as const, entries: [...store.entries, row],
      history: [...store.history, event(row.id, "Folga de compensação programada para " + date + " (" + duration(row.minutes) + ")", now, row.responsible)] },
  };
}
/** Pedido de saída antecipada ou entrada mais tarde. Com saldo: aprovado na hora. Sem saldo: aguarda o RH. */
export function requestBankUse(store: HourStore, employee: Employee, date: ISODate, kind: "saida_antecipada" | "entrada_tardia",
  minutes: number, reason: string, actor: string, now = new Date().toISOString()) {
  if (!isValidReferenceDate(date) || !Number.isInteger(minutes) || minutes <= 0 || minutes > 600)
    return { ok: false as const, message: "Informe data e tempo válidos.", store };
  const check = canUseBank(balanceOf(store, employee.id, date), minutes);
  const row: HourEntry = {
    id: newId("US", now), employeeId: employee.id, date, kind, minutes: -minutes,
    description: clean(reason || KINDS[kind]), responsible: clean(actor || "Gerente", 100),
    status: check.ok ? "aprovado" : "pendente", createdAt: now,
    ...(check.ok ? { decidedAt: now, decisionNote: "Aprovado com saldo disponível" } : {}),
  };
  return {
    ok: true as const, approved: check.ok,
    message: check.ok ? "Registrado e aprovado: havia saldo." : "Registrado como pendente: sem saldo, aguarda o RH.",
    store: { version: 1 as const, entries: [...store.entries, row],
      history: [...store.history, event(row.id, KINDS[kind] + " " + duration(row.minutes) + (check.ok ? " aprovada" : " pendente"), now, row.responsible)] },
  };
}
