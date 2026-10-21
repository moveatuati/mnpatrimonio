/**
 * Link da entrevista para o candidato responder no celular — ETAPA SEM BANCO DE DADOS.
 * O convite e as respostas viajam dentro do próprio link (codificado). O candidato envia as
 * respostas pelo WhatsApp do entrevistador; ao abrir o link de retorno, elas entram no sistema.
 * Próxima etapa: trocar por banco de dados + login do entrevistador (respostas automáticas).
 */
import { INTERVIEW_QUESTIONS, type Candidate, type CandidateStore, type QuestionId } from "./candidates";

export const INTERVIEWER_KEY = "mn-entrevistador-v1";
export const ANSWER_LIMIT = 600;
export const ABOUT_LIMIT = 1500;

export type InterviewerProfile = { name: string; phone: string };
/** Convite enviado ao candidato. */
export type Invite = { v: 1; id: string; name: string; phone: string; role: string; interviewer: string; interviewerPhone: string; date: string };
/** Respostas devolvidas pelo candidato. */
export type Reply = { v: 1; id: string; name: string; phone: string; role: string; interviewer: string; answers: Partial<Record<QuestionId, string>>; sentAt: string };

export function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decode<T>(code: string): T | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
}

const s = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
export const digits = (v: string) => v.replace(/\D/g, "");
export const isPhone = (v: string) => digits(v).length >= 10 && digits(v).length <= 11;

export function readInvite(code: string | null | undefined): Invite | null {
  if (!code) return null;
  const r = decode<Partial<Invite>>(code);
  if (!r || r.v !== 1 || typeof r.id !== "string" || !r.id) return null;
  return { v: 1, id: s(r.id, 40), name: s(r.name), phone: s(r.phone, 30), role: s(r.role), interviewer: s(r.interviewer),
    interviewerPhone: s(r.interviewerPhone, 30), date: s(r.date, 10) };
}

export function readReply(code: string | null | undefined): Reply | null {
  if (!code) return null;
  const r = decode<Partial<Reply>>(code);
  if (!r || r.v !== 1 || typeof r.id !== "string" || !r.id || !r.answers || typeof r.answers !== "object") return null;
  const answers: Reply["answers"] = {};
  INTERVIEW_QUESTIONS.forEach(q => {
    const a = s((r.answers as Record<string, unknown>)[q.id], q.id === "sobre" ? ABOUT_LIMIT : ANSWER_LIMIT);
    if (a) answers[q.id] = a;
  });
  return { v: 1, id: s(r.id, 40), name: s(r.name), phone: s(r.phone, 30), role: s(r.role), interviewer: s(r.interviewer), answers, sentAt: s(r.sentAt, 19) };
}

/** Pendências do convite antes de gerar o link. */
export function inviteMissing(c: Candidate, me: InterviewerProfile): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("nome do candidato");
  if (!isPhone(c.phone)) out.push("WhatsApp do candidato");
  if (!c.role.trim()) out.push("cargo");
  if (!me.name.trim()) out.push("seu nome (entrevistador)");
  if (!isPhone(me.phone)) out.push("seu WhatsApp (para receber as respostas)");
  return out;
}

export function makeInvite(c: Candidate, me: InterviewerProfile): Invite {
  return { v: 1, id: c.id, name: c.name.trim(), phone: c.phone, role: c.role.trim(), interviewer: me.name.trim(), interviewerPhone: digits(me.phone), date: c.interview.date };
}

export const inviteUrl = (origin: string, inv: Invite) => `${origin}/entrevista?c=${encode(inv)}`;
export const replyUrl = (origin: string, rep: Reply) => `${origin}/candidatos?r=${encode(rep)}`;
/** Link do WhatsApp (Brasil: acrescenta 55 quando falta). */
export function whatsappUrl(phone: string, text: string): string {
  const d = digits(phone);
  const full = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function inviteMessage(inv: Invite, url: string): string {
  const first = inv.name.split(" ")[0] || "candidato(a)";
  return `Olá, ${first}! Aqui é ${inv.interviewer}, da MN Patrimônios. Obrigado pelo interesse na vaga de ${inv.role}.\n\nResponda a entrevista pelo celular neste link (leva uns 10 minutos):\n${url}\n\nAo terminar, toque em "Enviar respostas".`;
}
export function replyMessage(rep: Reply, url: string): string {
  return `Entrevista respondida — ${rep.name} (${rep.role}).\nAbra no sistema MN Patrimônios para ver as respostas:\n${url}`;
}

/** Pendências do candidato antes de enviar. */
export function replyMissing(name: string, phone: string, answers: Reply["answers"]): string[] {
  const out: string[] = [];
  if (!name.trim()) out.push("Nome");
  if (!isPhone(phone)) out.push("WhatsApp");
  INTERVIEW_QUESTIONS.forEach((q, i) => { if (!answers[q.id]?.trim()) out.push(`Pergunta ${i + 1}`); });
  return out;
}

/**
 * Coloca as respostas recebidas no candidato (pelo id do convite) ou cria um novo candidato.
 * Não sobrescreve entrevista já decidida.
 */
export function importReply(store: CandidateStore, rep: Reply, today: string): { store: CandidateStore; id: string } | string {
  const found = store.candidates.find(c => c.id === rep.id);
  if (found && found.stage !== "entrevista") return `As respostas de ${found.name} já foram avaliadas; nada foi alterado.`;
  if (found) {
    const next: Candidate = {
      ...found, name: rep.name || found.name, phone: rep.phone || found.phone,
      interview: { ...found.interview, answers: { ...found.interview.answers, ...rep.answers }, source: "candidato", receivedAt: rep.sentAt || today },
    };
    return { store: { ...store, candidates: store.candidates.map(c => (c.id === found.id ? next : c)) }, id: found.id };
  }
  const seq = store.seq + 1;
  const id = `CAND-${String(seq).padStart(3, "0")}`;
  const c: Candidate = {
    id, name: rep.name, role: rep.role, phone: rep.phone, createdAt: today, stage: "entrevista", decidedAt: "",
    interview: { date: today, interviewer: rep.interviewer, answers: rep.answers, scores: {}, opinion: "", source: "candidato", receivedAt: rep.sentAt || today },
    application: null,
  };
  return { store: { ...store, seq, candidates: [c, ...store.candidates] }, id };
}
