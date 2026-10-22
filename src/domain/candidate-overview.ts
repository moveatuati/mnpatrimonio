/**
 * Visão geral da captação: em que etapa está cada candidato e o que precisa ser resolvido.
 * Objetivo: ninguém ficar parado até a ficha de emprego. Regras puras, sem UI.
 */
import { DOC_LIST, docsComplete, docsReceived } from "./candidate-docs";
import { interviewMissing, type Candidate, type CandidateStore } from "./candidates";

/** Prazos para considerar "Atrasado" (dias corridos). */
export const LATE_DAYS = { perfil: 2, entrevista: 3, documentos: 3 } as const;

export type Level = "ok" | "resolver" | "atrasado";
export type Action = "lembrar-perfil" | "ver-perfil" | "enviar-perfil" | "entrevista" | "pedir-docs" | "cobrar-docs" | "ver-docs" | "ficha";
export type Situation = { level: Level; isNew: boolean; text: string; action: Action | null };

export function daysSince(iso: string, today: string): number {
  if (!iso) return 0;
  const a = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 86400000)) : 0;
}
const ha = (n: number) => (n === 0 ? "hoje" : n === 1 ? "há 1 dia" : `há ${n} dias`);

/** Situação do candidato na etapa em que está. `null` = processo encerrado (banco de talentos ou não aprovado). */
export function situation(c: Candidate, today: string): Situation | null {
  if (c.stage === "perfil") {
    if (c.profile.scores) return { level: "resolver", isNew: !c.profile.seen, text: "respondeu o perfil e espera a sua decisão", action: "ver-perfil" };
    if (!c.profile.linkSentAt) return { level: "resolver", isNew: false, text: "ainda não recebeu o teste de perfil", action: "enviar-perfil" };
    const d = daysSince(c.profile.linkSentAt, today);
    return d > LATE_DAYS.perfil
      ? { level: "atrasado", isNew: false, text: `não respondeu o teste de perfil (enviado ${ha(d)})`, action: "lembrar-perfil" }
      : { level: "ok", isNew: false, text: `aguardando a resposta do teste (enviado ${ha(d)})`, action: null };
  }
  if (c.stage === "entrevista") {
    if (!interviewMissing(c).length) return { level: "resolver", isNew: false, text: "entrevista completa, falta o parecer", action: "entrevista" };
    const d = daysSince(c.interview.linkSentAt || c.profile.answeredAt || c.createdAt, today);
    return d > LATE_DAYS.entrevista
      ? { level: "atrasado", isNew: false, text: `entrevista parada ${ha(d)}`, action: "entrevista" }
      : { level: "ok", isNew: false, text: "entrevista em andamento", action: null };
  }
  if (c.stage === "aprovado") {
    const a = c.application;
    if (a?.status === "enviada") return a.rh.verdict
      ? { level: "ok", isNew: false, text: a.rh.verdict === "apto" ? "pronto: apto para admissão" : "RH: inapto", action: null }
      : { level: "resolver", isNew: false, text: "ficha enviada, falta o parecer do RH", action: "ficha" };
    if (!c.docs.requestedAt) return { level: "resolver", isNew: false, text: "aprovado(a): falta pedir os documentos", action: "pedir-docs" };
    if (docsComplete(c.docs)) return { level: "resolver", isNew: !c.docs.seen, text: "enviou todos os documentos: preencha a ficha", action: "ver-docs" };
    const faltam = DOC_LIST.length - docsReceived(c.docs);
    const d = daysSince(c.docs.requestedAt, today);
    return d > LATE_DAYS.documentos
      ? { level: "atrasado", isNew: false, text: `ainda não enviou ${faltam} documento${faltam > 1 ? "s" : ""} (pedidos ${ha(d)})`, action: "cobrar-docs" }
      : { level: "ok", isNew: !c.docs.seen, text: `aguardando ${faltam} documento${faltam > 1 ? "s" : ""}`, action: null };
  }
  return null;
}

/** Números dos 3 quadros da Visão geral. */
export function overview(store: CandidateStore) {
  const cs = store.candidates;
  const at = (s: Candidate["stage"]) => cs.filter(c => c.stage === s);
  const perfil = at("perfil"), entrevista = at("entrevista"), aprovado = at("aprovado");
  const decidedAfterInterview = cs.filter(c => c.interview.opinion.trim() && c.stage !== "entrevista");
  return {
    perfil: {
      respondeu: perfil.filter(c => c.profile.scores).length,
      aguardando: perfil.filter(c => !c.profile.scores && c.profile.linkSentAt).length,
      naoEnviado: perfil.filter(c => !c.profile.scores && !c.profile.linkSentAt).length,
    },
    entrevista: {
      paraEntrevistar: entrevista.length,
      aprovados: decidedAfterInterview.filter(c => c.stage === "aprovado").length,
      naoAprovados: decidedAfterInterview.filter(c => c.stage === "reprovado" || c.stage === "banco").length,
    },
    ficha: {
      faltamDocs: aprovado.filter(c => c.application?.status !== "enviada" && !docsComplete(c.docs)).length,
      preenchendo: aprovado.filter(c => c.application?.status !== "enviada" && docsComplete(c.docs)).length,
      prontas: aprovado.filter(c => c.application?.status === "enviada").length,
    },
  };
}

/** Lista "Precisa resolver": atrasados primeiro, depois novidades e pendências. */
export function needsAttention(store: CandidateStore, today: string): { c: Candidate; s: Situation }[] {
  const rank = (s: Situation) => (s.level === "atrasado" ? 0 : s.isNew ? 1 : 2);
  return store.candidates
    .map(c => ({ c, s: situation(c, today) }))
    .filter((x): x is { c: Candidate; s: Situation } => !!x.s && (x.s.level !== "ok" || x.s.isNew))
    .sort((a, b) => rank(a.s) - rank(b.s));
}
