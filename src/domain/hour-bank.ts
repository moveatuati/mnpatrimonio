import { DEMO_EMPLOYEES } from "./demo-data";
import { isValidReferenceDate } from "./operation-query";
import type { ISODate } from "./types";

/** Livro-razão de demonstração: quantidades inteiras de minutos; sem cálculos automáticos de folha/ponto. */
export type HourKind = "credito_extra" | "credito_ajuste" | "debito_ausencia" |
  "debito_ajuste" | "compensacao" | "baixa_informada" | "estorno";
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
export const HOUR_KEY = "formosa:augusto-montenegro:banco-horas-demo:v1";
export const REFERENCE_DAY = "2026-10-20";
export const KINDS: Record<HourKind, string> = {
  credito_extra:"Crédito autorizado",
  credito_ajuste:"Ajuste de crédito",
  debito_ausencia:"Débito autorizado",
  debito_ajuste:"Ajuste de débito",
  compensacao:"Compensação autorizada",
  baixa_informada:"Baixa informada (sem integração com folha)",
  estorno:"Estorno de lançamento",
};
export const ENTRY_STATUSES: Record<EntryStatus,string> = {
  pendente:"Aguardando aprovação", aprovado:"Aprovado", recusado:"Recusado",
};
export const DEBIT_KINDS:HourKind[] = ["debito_ausencia","debito_ajuste","compensacao","baixa_informada"];
export const CREDIT_KINDS:HourKind[] = ["credito_extra","credito_ajuste"];
export const DEFAULT_DRAFT:EntryDraft = {
  employeeId:"FM-001",date:REFERENCE_DAY,kind:"credito_extra",
  hours:"1",minutes:"00",description:"",responsible:"Gestão demonstrativa",
};
const demoRows = [
  ["BH-001","FM-001","2026-10-01","credito_extra",90,"Extensão autorizada do atendimento"],
  ["BH-002","FM-001","2026-10-08","compensacao",-30,"Compensação autorizada em escala"],
  ["BH-003","FM-002","2026-10-05","credito_extra",110,"Apoio em horário extraordinário"],
  ["BH-004","FM-002","2026-10-16","debito_ausencia",-45,"Ajuste demonstrativo autorizado"],
  ["BH-005","FM-006","2026-10-03","credito_ajuste",35,"Acerto de conferência da jornada"],
  ["BH-006","FM-006","2026-10-19","compensacao",-20,"Compensação aprovada"],
  ["BH-007","FM-018","2026-10-11","credito_extra",75,"Extensão de expediente demonstrativa"],
  ["BH-008","FM-018","2026-10-20","debito_ajuste",-15,"Ajuste de saldo em revisão"],
  ["BH-009","FM-049","2026-09-25","credito_extra",120,"Saldo inicial ilustrativo anterior ao mês"],
  ["BH-010","FM-049","2026-10-14","compensacao",-60,"Compensação de período anterior"],
  ["BH-011","FM-055","2026-10-21","credito_extra",80,"Solicitação futura ilustrativa"],
  ["BH-012","FM-020","2026-10-19","debito_ajuste",-75,"Apontamento pendente de justificativa"],
] as const;
export function demoHourStore():HourStore {
  return { version:1,entries:demoRows.map(([id,employeeId,date,kind,minutes,description])=>({
    id,employeeId,date,kind,minutes,description,responsible:"Gestão demonstrativa",
    status:id==="BH-012"?"pendente": "aprovado",
    createdAt:"2026-10-20T09:00:00.000Z",
    ...(id==="BH-012"?{}:{decidedAt:"2026-10-20T09:00:00.000Z",decisionNote:"Aprovação fictícia inicial"}),
  })),history:[] };
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
  if(!kinds.includes(draft.kind)||draft.kind==="estorno")errors.push("Tipo de lançamento inválido.");
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
  const [year,monthN]=month.split("-").map(Number);
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
