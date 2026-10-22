/**
 * Captação de pessoas — perfil comportamental, entrevista do candidato e ficha de emprego.
 * Regras puras, sem UI. Etapa 1: dados fictícios salvos só no navegador (sem backend).
 * Fluxo: perfil → (aprovado) entrevista → parecer → (aprovado) ficha de emprego + documentos → envio → parecer do RH.
 * Ao aprovar uma etapa o candidato sai da sub-aba e passa para a próxima.
 */
import { emptyProfile, simulatedScores, type BehaviorProfile, type ProfileScores } from "./behavior-profile";
import { DOC_LIST, emptyDocs, restoreDocs, type DocRequest } from "./candidate-docs";

export const CANDIDATE_KEY = "mn-candidatos-v3";

/* ───────────── Entrevista (Formulário de Candidato) ───────────── */

export const INTERVIEW_QUESTIONS = [
  { id: "saida", label: "O que você não gostava no seu emprego anterior? Por qual motivo você saiu (ou quer sair)?" },
  { id: "colaborador", label: "O que você considera importante em um colaborador?" },
  { id: "dificuldade", label: "Com que tipo de pessoa você encontra dificuldade para trabalhar?" },
  { id: "horario", label: "Você está disposto a trabalhar de acordo com o horário estabelecido pela empresa, sabendo que, caso seja necessário, a empresa pode trocar o seu turno de trabalho?" },
  { id: "hobby", label: "O que você faz no seu tempo livre? Tem algum hobby?" },
  { id: "uniforme", label: "Você tem alguma restrição em utilizar o uniforme da empresa?" },
  { id: "salario", label: "Qual sua pretensão salarial?" },
  { id: "supervisao", label: "Você tem dificuldade em trabalhar sob supervisão de um superior hierárquico?" },
  { id: "parente", label: "Você tem algum parente trabalhando na empresa? Qual o nome?" },
  { id: "sobre", label: "Fale sobre você.", long: true },
] as const;
export type QuestionId = (typeof INTERVIEW_QUESTIONS)[number]["id"];

/** Critérios rápidos de avaliação do entrevistador (1 a 5). */
export const CRITERIA = [
  { id: "comunicacao", label: "Comunicação" },
  { id: "postura", label: "Postura e apresentação" },
  { id: "disponibilidade", label: "Disponibilidade de horário" },
  { id: "perfil", label: "Perfil para o cargo" },
] as const;
export type CriterionId = (typeof CRITERIA)[number]["id"];

export type Stage = "perfil" | "entrevista" | "aprovado" | "banco" | "reprovado";
export const STAGE_LABELS: Record<Stage, string> = {
  perfil: "Perfil comportamental",
  entrevista: "Em entrevista",
  aprovado: "Aprovado na entrevista",
  banco: "Banco de talentos",
  reprovado: "Não aprovado",
};

export type Interview = {
  date: string;
  interviewer: string;
  answers: Partial<Record<QuestionId, string>>;
  scores: Partial<Record<CriterionId, number>>;
  opinion: string;
  /** Preenchido quando as respostas vieram do link enviado ao candidato. */
  source?: "candidato";
  receivedAt?: string;
  linkSentAt?: string;
};

/* ───────────── Ficha de emprego (Solicitação de Emprego) ───────────── */

export type FieldType = "text" | "date" | "number" | "select" | "tel" | "textarea";
export type Field = { key: string; label: string; type?: FieldType; options?: string[]; required?: boolean; wide?: boolean; placeholder?: string };
export type Section = { id: string; title: string; hint?: string; fields: Field[] };

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS SC SP SE TO RO RR".split(" ");
const YES_NO = ["Sim", "Não"];

export const FORM_SECTIONS: Section[] = [
  { id: "pessoais", title: "Dados pessoais", fields: [
    { key: "nome", label: "Nome completo", required: true, wide: true },
    { key: "cargo", label: "Candidato ao cargo de", required: true },
    { key: "sexo", label: "Sexo", type: "select", options: ["Masculino", "Feminino"] },
    { key: "telefone", label: "Nº telefone (celular/WhatsApp)", type: "tel", required: true, placeholder: "(91) 9 0000-0000" },
    { key: "telefone2", label: "Outro telefone", type: "tel" },
    { key: "telefone2Tipo", label: "Tipo do outro telefone", type: "select", options: ["Residencial", "Recado"] },
    { key: "recadoCom", label: "Deixar recado com" },
    { key: "nascimento", label: "Data de nascimento", type: "date", required: true },
    { key: "altura", label: "Altura (m)", placeholder: "1,70" },
    { key: "peso", label: "Peso (kg)", type: "number" },
    { key: "naturalidade", label: "Naturalidade" },
    { key: "nacionalidade", label: "Nacionalidade" },
    { key: "estadoCivil", label: "Estado civil", type: "select", options: ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"] },
  ] },
  { id: "endereco", title: "Endereço e moradia", fields: [
    { key: "endereco", label: "Endereço", required: true, wide: true },
    { key: "numero", label: "Número" },
    { key: "perimetro", label: "Perímetro / complemento" },
    { key: "bairro", label: "Bairro", required: true },
    { key: "cidade", label: "Cidade", required: true },
    { key: "cep", label: "CEP", placeholder: "00000-000" },
    { key: "uf", label: "UF", type: "select", options: UFS, required: true },
    { key: "casaPropria", label: "Casa própria", type: "select", options: YES_NO },
    { key: "alugada", label: "Alugada", type: "select", options: YES_NO },
    { key: "parenteGrau", label: "Mora com parente — grau de parentesco" },
    { key: "proprietario", label: "Se alugada — nome/telefone do(a) proprietário(a)", wide: true },
  ] },
  { id: "familia", title: "Família", fields: [
    { key: "pai", label: "Nome do pai" }, { key: "paiProfissao", label: "Profissão do pai" },
    { key: "mae", label: "Nome da mãe" }, { key: "maeProfissao", label: "Profissão da mãe" },
    { key: "conjuge", label: "Nome do cônjuge" }, { key: "conjugeProfissao", label: "Profissão do cônjuge" },
    { key: "filhos", label: "Número de filhos", type: "number" },
    { key: "filhosMaiores", label: "Maiores de idade", type: "number" },
    { key: "filhosMenores", label: "Menores de idade", type: "number" },
  ] },
  { id: "documentos", title: "Documentos pessoais", fields: [
    { key: "tipoSanguineo", label: "Tipo sanguíneo", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Não sei"] },
    { key: "rg", label: "RG", required: true }, { key: "rgEmissao", label: "Data de emissão (RG)", type: "date" },
    { key: "rgOrgao", label: "Órgão emissor" }, { key: "rgUf", label: "UF (RG)", type: "select", options: UFS },
    { key: "cpf", label: "CPF", required: true, placeholder: "000.000.000-00" }, { key: "cpfEmissao", label: "Data de emissão (CPF)", type: "date" },
    { key: "ctps", label: "CTPS nº" }, { key: "ctpsSerie", label: "Série (CTPS)" },
    { key: "ctpsEmissao", label: "Data de emissão (CTPS)", type: "date" }, { key: "ctpsUf", label: "UF (CTPS)", type: "select", options: UFS },
    { key: "pis", label: "PIS/PASEP" }, { key: "pisData", label: "Data do cadastramento", type: "date" },
    { key: "banco", label: "Banco" }, { key: "agencia", label: "Agência / código" },
    { key: "titulo", label: "Título de eleitor nº" }, { key: "tituloZona", label: "Zona" },
    { key: "tituloSecao", label: "Seção" }, { key: "tituloUf", label: "UF (título)", type: "select", options: UFS },
    { key: "cnh", label: "Carteira de habilitação nº" }, { key: "cnhCategoria", label: "Categoria (CNH)" },
    { key: "cnhValidade", label: "Validade (CNH)", type: "date" },
    { key: "reservista", label: "Carteira de reservista nº" }, { key: "reservistaSerie", label: "Série (reservista)" },
    { key: "reservistaCategoria", label: "Categoria (reservista)" }, { key: "reservistaRegiao", label: "Região militar" },
  ] },
  { id: "escolaridade", title: "Escolaridade", fields: [
    { key: "escolaridade", label: "Grau de escolaridade", type: "select", required: true, options: [
      "Fundamental incompleto", "Fundamental completo", "Médio incompleto", "Médio completo",
      "Técnico", "Superior incompleto", "Superior completo", "Pós-graduação"] },
    { key: "estuda", label: "Estuda atualmente?", type: "select", options: YES_NO },
    { key: "escola", label: "Escola / colégio / universidade", wide: true },
  ] },
];

export const EXPERIENCE_SLOTS = [
  { id: "penultima", title: "Penúltima empresa" },
  { id: "ultima", title: "Última empresa" },
] as const;
export const REFERENCE_GROUPS = [
  { id: "pessoais", title: "Referências pessoais" },
  { id: "comerciais", title: "Referências comerciais" },
  { id: "bancarias", title: "Referências bancárias" },
] as const;

export type Dependent = { nome: string; parentesco: string; nascimento: string };
export type Course = { curso: string; entidade: string; periodo: string };
export type Experience = { empresa: string; telefone: string; cargo: string; admissao: string; demissao: string; motivo: string; atividades: string };
export type Reference = { nome: string; endereco: string; telefone: string };
export type RhOpinion = { verdict: "" | "apto" | "inapto"; notes: string; recrutamento: string; requisitante: string; rh: string };

export type Application = {
  fields: Record<string, string>;
  photo: string;
  dependents: Dependent[];
  courses: Course[];
  experiences: Record<(typeof EXPERIENCE_SLOTS)[number]["id"], Experience>;
  references: Record<(typeof REFERENCE_GROUPS)[number]["id"], Reference[]>;
  declaration: boolean;
  declarationDate: string;
  status: "rascunho" | "enviada";
  sentAt: string;
  rh: RhOpinion;
};

export type Candidate = {
  id: string;
  name: string;
  role: string;
  /** Condomínio (cliente) e função da vaga — ver src/domain/clients.ts. */
  condoId: string;
  functionId: string;
  phone: string;
  createdAt: string;
  stage: Stage;
  decidedAt: string;
  interview: Interview;
  application: Application | null;
  /** 1ª etapa: teste de perfil comportamental. */
  profile: BehaviorProfile;
  /** Documentos pedidos na etapa da ficha. */
  docs: DocRequest;
};
export type CandidateStore = { version: 2; seq: number; candidates: Candidate[] };

const emptyExperience = (): Experience => ({ empresa: "", telefone: "", cargo: "", admissao: "", demissao: "", motivo: "", atividades: "" });
const emptyReferences = () => [{ nome: "", endereco: "", telefone: "" }, { nome: "", endereco: "", telefone: "" }];

export function emptyApplication(c: Pick<Candidate, "name" | "role" | "phone">): Application {
  return {
    fields: { nome: c.name, cargo: c.role, telefone: c.phone, cidade: "Ananindeua", uf: "PA", nacionalidade: "Brasileira" },
    photo: "",
    dependents: [],
    courses: [],
    experiences: { penultima: emptyExperience(), ultima: emptyExperience() },
    references: { pessoais: emptyReferences(), comerciais: emptyReferences(), bancarias: emptyReferences() },
    declaration: false,
    declarationDate: "",
    status: "rascunho",
    sentAt: "",
    rh: { verdict: "", notes: "", recrutamento: "", requisitante: "", rh: "" },
  };
}

/* ───────────── Regras ───────────── */

/** Dados básicos que toda etapa exige (nome, vaga, condomínio e WhatsApp). */
export function basicMissing(c: Candidate): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("Nome do candidato");
  if (!c.condoId) out.push("Condomínio da vaga");
  if (!c.functionId || !c.role.trim()) out.push("Função da vaga");
  if (c.phone.replace(/\D/g, "").length < 10) out.push("WhatsApp do candidato");
  return out;
}

/** Resultado do perfil chegou (pelo link ou pela simulação): vira novidade para o recrutador. */
export function receiveProfile(c: Candidate, scores: ProfileScores, now: string): Candidate | string {
  if (c.stage !== "perfil") return "Este candidato já passou da etapa de perfil.";
  return { ...c, profile: { ...c.profile, linkSentAt: c.profile.linkSentAt || now, answeredAt: now, scores, seen: false } };
}

/**
 * Decide a etapa de perfil. "entrevista" = aprovado no perfil: sai da sub-aba Perfil e vai para Entrevista.
 */
export function decideProfile(c: Candidate, outcome: "entrevista" | "banco" | "reprovado", now: string): Candidate | string {
  if (c.stage !== "perfil") return "Este candidato não está na etapa de perfil.";
  const missing = basicMissing(c);
  if (missing.length) return `Complete antes: ${missing.join(", ")}.`;
  if (outcome === "entrevista" && !c.profile.scores) return "O candidato ainda não respondeu o teste de perfil.";
  return { ...c, stage: outcome, decidedAt: outcome === "entrevista" ? "" : now, profile: { ...c.profile, seen: true } };
}

/** Pergunta(s) obrigatória(s) para fechar o parecer: todas as 10 do formulário. */
export function interviewMissing(c: Candidate): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("Nome do candidato");
  if (!c.condoId) out.push("Condomínio da vaga");
  if (!c.functionId || !c.role.trim()) out.push("Função da vaga");
  if (c.phone.replace(/\D/g, "").length < 10) out.push("WhatsApp do candidato");
  if (!c.interview.date) out.push("Data da entrevista");
  if (!c.interview.interviewer.trim()) out.push("Entrevistador");
  INTERVIEW_QUESTIONS.forEach((q, i) => { if (!c.interview.answers[q.id]?.trim()) out.push(`Pergunta ${i + 1}`); });
  CRITERIA.forEach(k => { if (!c.interview.scores[k.id]) out.push(`Nota: ${k.label}`); });
  if (!c.interview.opinion.trim()) out.push("Parecer do entrevistador");
  return out;
}

export function interviewScore(c: Candidate): number | null {
  const values = CRITERIA.map(k => c.interview.scores[k.id]).filter((v): v is number => !!v);
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function answeredCount(c: Candidate): number {
  return INTERVIEW_QUESTIONS.filter(q => c.interview.answers[q.id]?.trim()).length;
}

/**
 * Decide a entrevista. Só "aprovado" libera a ficha de emprego.
 * Retorna erro (string) se faltar algo ou a ficha já tiver sido enviada.
 */
export function decide(c: Candidate, stage: Exclude<Stage, "entrevista" | "perfil">, now: string): Candidate | string {
  if (c.stage === "perfil") return "Aprove primeiro o Perfil comportamental.";
  const missing = interviewMissing(c);
  if (missing.length) return `Complete antes do parecer: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` e mais ${missing.length - 4}` : ""}.`;
  if (c.application?.status === "enviada" && stage !== "aprovado") return "A ficha de emprego já foi enviada; o parecer não pode ser revertido.";
  return {
    ...c, stage, decidedAt: now,
    application: stage === "aprovado" ? c.application ?? emptyApplication(c) : c.application,
  };
}

/** Reabre o processo (somente antes do envio da ficha): volta para a entrevista, ou para o perfil se não houve entrevista. */
export function reopen(c: Candidate): Candidate | string {
  if (c.application?.status === "enviada") return "A ficha já foi enviada; a entrevista não pode ser reaberta.";
  return { ...c, stage: c.interview.opinion.trim() ? "entrevista" : "perfil", decidedAt: "" };
}

/** Validação de CPF pelos dígitos verificadores. */
export function isValidCPF(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function formatCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

/** Pendências que impedem o envio da ficha. */
export function applicationMissing(a: Application): string[] {
  const out: string[] = [];
  FORM_SECTIONS.forEach(s => s.fields.forEach(f => { if (f.required && !a.fields[f.key]?.trim()) out.push(f.label); }));
  if (a.fields["cpf"]?.trim() && !isValidCPF(a.fields["cpf"])) out.push("CPF válido");
  a.dependents.forEach((d, i) => { if (!d.nome.trim()) out.push(`Nome do dependente ${i + 1}`); });
  if (!a.declaration) out.push("Aceite da declaração do candidato");
  return out;
}

/** Percentual de preenchimento da ficha (campos simples), para acompanhar o progresso. */
export function applicationProgress(a: Application): number {
  const all = FORM_SECTIONS.flatMap(s => s.fields);
  const filled = all.filter(f => a.fields[f.key]?.trim()).length;
  return Math.round((filled / all.length) * 100);
}

export function submit(c: Candidate, now: string): Candidate | string {
  if (c.stage !== "aprovado" || !c.application) return "A ficha só é liberada para candidatos aprovados na entrevista.";
  if (c.application.status === "enviada") return "Esta ficha já foi enviada.";
  const missing = applicationMissing(c.application);
  if (missing.length) return `Faltam ${missing.length} item(ns): ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}.`;
  const f = c.application.fields;
  return {
    ...c, name: (f["nome"] ?? "").trim(), role: (f["cargo"] ?? "").trim(), phone: (f["telefone"] ?? "").trim(),
    application: { ...c.application, status: "enviada", sentAt: now, declarationDate: c.application.declarationDate || now.slice(0, 10) },
  };
}

/** Parecer do RH só depois do envio. */
export function setRhOpinion(c: Candidate, rh: RhOpinion): Candidate | string {
  if (c.application?.status !== "enviada") return "O parecer do RH só pode ser dado após o envio da ficha.";
  return { ...c, application: { ...c.application, rh } };
}

export function newCandidate(store: CandidateStore, today: string): { store: CandidateStore; id: string } {
  const seq = store.seq + 1;
  const id = `CAND-${String(seq).padStart(3, "0")}`;
  const c: Candidate = {
    id, name: "", role: "", condoId: "", functionId: "", phone: "", createdAt: today, stage: "perfil", decidedAt: "",
    interview: { date: today, interviewer: "", answers: {}, scores: {}, opinion: "" }, application: null,
    profile: emptyProfile(), docs: emptyDocs(),
  };
  return { store: { ...store, seq, candidates: [c, ...store.candidates] }, id };
}

export function updateCandidate(store: CandidateStore, next: Candidate): CandidateStore {
  return { ...store, candidates: store.candidates.map(c => (c.id === next.id ? next : c)) };
}

export function removeCandidate(store: CandidateStore, id: string): CandidateStore | string {
  const c = store.candidates.find(x => x.id === id);
  if (c?.application?.status === "enviada") return "Candidato com ficha enviada não pode ser excluído.";
  return { ...store, candidates: store.candidates.filter(x => x.id !== id) };
}

export function summary(store: CandidateStore) {
  const cs = store.candidates;
  return {
    profile: cs.filter(c => c.stage === "perfil").length,
    newProfiles: cs.filter(c => c.stage === "perfil" && c.profile.scores && !c.profile.seen).length,
    newDocs: cs.filter(c => c.stage === "aprovado" && !c.docs.seen).length,
    interviewing: cs.filter(c => c.stage === "entrevista").length,
    awaitingForm: cs.filter(c => c.stage === "aprovado" && c.application?.status !== "enviada").length,
    sent: cs.filter(c => c.application?.status === "enviada" && !c.application.rh.verdict).length,
    fit: cs.filter(c => c.application?.rh.verdict === "apto").length,
  };
}

/* ───────────── Demonstração e restauração ───────────── */

/** Imagem simples de documento usada só na demonstração (o recrutador vê como o arquivo chega). */
export function sampleDocImage(title: string, name: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" rx="18" fill="#eef3f8" stroke="#9fb3c8" stroke-width="3"/><rect x="28" y="28" width="584" height="54" rx="8" fill="#2b4b6b"/><text x="48" y="64" font-family="Arial" font-size="24" font-weight="700" fill="#fff">${title}</text><rect x="40" y="110" width="150" height="190" rx="8" fill="#c9d5e2"/><circle cx="115" cy="175" r="34" fill="#9fb3c8"/><rect x="70" y="220" width="90" height="60" rx="30" fill="#9fb3c8"/><text x="220" y="135" font-family="Arial" font-size="16" fill="#5d6b79">NOME</text><text x="220" y="162" font-family="Arial" font-size="22" font-weight="700" fill="#22303d">${name.toUpperCase()}</text><text x="220" y="205" font-family="Arial" font-size="16" fill="#5d6b79">NÚMERO</text><text x="220" y="232" font-family="Arial" font-size="22" font-weight="700" fill="#22303d">00.000.000-0</text><text x="220" y="275" font-family="Arial" font-size="16" fill="#5d6b79">DATA</text><text x="220" y="302" font-family="Arial" font-size="22" font-weight="700" fill="#22303d">01/01/1990</text><text x="320" y="380" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#c2622a">DOCUMENTO DE EXEMPLO — DEMONSTRAÇÃO</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Data/hora de demonstração N dias atrás (horário de Belém), para a Visão geral mostrar atrasos reais. */
function ago(days: number, time = "09:00:00"): string {
  return `${new Date(Date.now() - 3 * 3600000 - days * 86400000).toISOString().slice(0, 10)}T${time}`;
}

export function demoCandidates(): CandidateStore {
  const full: Interview["answers"] = {
    saida: "Fim do contrato temporário; buscava estabilidade.", colaborador: "Pontualidade e compromisso com o cliente.",
    dificuldade: "Pessoas que não cumprem combinados.", horario: "Sim, tenho disponibilidade para troca de turno.",
    hobby: "Futebol aos sábados e igreja.", uniforme: "Nenhuma restrição.", salario: "Piso da categoria.",
    supervisao: "Não, gosto de receber orientação.", parente: "Não.", sobre: "Trabalhei 2 anos como repositor, sou organizado e gosto de atender.",
  };
  const done = (id: string, at: string): BehaviorProfile => ({ linkSentAt: at, answeredAt: at, scores: simulatedScores(id), seen: true });
  const ana: Candidate = {
    id: "CAND-001", name: "Ana Paula Ribeiro (fictícia)", role: "Agente de portaria", condoId: "COND-001", functionId: "FN-01", phone: "(91) 9 8100-0001",
    createdAt: ago(8).slice(0, 10), stage: "aprovado", decidedAt: ago(5, "10:00:00"),
    interview: { date: ago(5).slice(0, 10), interviewer: "Supervisão de portaria", answers: full,
      scores: { comunicacao: 5, postura: 4, disponibilidade: 5, perfil: 4 }, opinion: "Boa comunicação e disponibilidade total. Aprovada para a ficha." },
    application: null, profile: done("CAND-001", ago(7, "09:30:00")), docs: emptyDocs(),
  };
  ana.application = emptyApplication(ana);
  const at = ago(2, "15:40:00");
  ana.docs = { requestedAt: ago(4, "08:00:00"), seen: true, files: Object.fromEntries(DOC_LIST.slice(0, 4).map(d =>
    [d.id, { name: `${d.short}.jpg`, at, url: sampleDocImage(d.short, "Ana Paula Ribeiro") }])) };
  const bruno: Candidate = {
    id: "CAND-002", name: "Bruno Lima (fictício)", role: "Auxiliar de serviços gerais", condoId: "COND-002", functionId: "FN-02", phone: "(91) 9 8100-0002",
    createdAt: ago(3).slice(0, 10), stage: "entrevista", decidedAt: "",
    interview: { date: ago(0).slice(0, 10), interviewer: "", answers: { saida: "Mudança de bairro.", colaborador: "Honestidade." }, scores: {}, opinion: "" },
    application: null, profile: done("CAND-002", ago(1, "11:15:00")), docs: emptyDocs(),
  };
  const naely: Candidate = {
    id: "CAND-003", name: "Naely Drago (fictícia)", role: "Agente de portaria", condoId: "COND-001", functionId: "FN-01", phone: "(91) 9 8100-0003",
    createdAt: ago(3).slice(0, 10), stage: "perfil", decidedAt: "",
    interview: { date: ago(0).slice(0, 10), interviewer: "", answers: {}, scores: {}, opinion: "" },
    application: null, profile: { ...emptyProfile(), linkSentAt: ago(3, "14:20:00") }, docs: emptyDocs(),
  };
  const carlos: Candidate = {
    id: "CAND-004", name: "Carlos Souza (fictício)", role: "Auxiliar de serviços gerais", condoId: "COND-002", functionId: "FN-02", phone: "(91) 9 8100-0004",
    createdAt: ago(1).slice(0, 10), stage: "perfil", decidedAt: "",
    interview: { date: ago(0).slice(0, 10), interviewer: "", answers: {}, scores: {}, opinion: "" },
    application: null, profile: { linkSentAt: ago(1, "16:00:00"), answeredAt: ago(0, "08:10:00"), scores: simulatedScores("CAND-004"), seen: false }, docs: emptyDocs(),
  };
  return { version: 2, seq: 4, candidates: [bruno, ana, naely, carlos] };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
export function restoreCandidates(raw: unknown): CandidateStore {
  const r = raw as Partial<CandidateStore> | null;
  if (!r || r.version !== 2 || !Array.isArray(r.candidates)) return demoCandidates();
  const candidates = r.candidates.filter(c => c && typeof c.id === "string").map(c => {
    const base: Candidate = {
      id: c.id, name: str(c.name), role: c.functionId ? str(c.role) : "", condoId: str(c.condoId), functionId: str(c.functionId), phone: str(c.phone), createdAt: str(c.createdAt),
      stage: (["perfil", "entrevista", "aprovado", "banco", "reprovado"] as Stage[]).includes(c.stage) ? c.stage : "perfil",
      decidedAt: str(c.decidedAt),
      interview: { date: str(c.interview?.date), interviewer: str(c.interview?.interviewer), answers: { ...(c.interview?.answers ?? {}) },
        scores: { ...(c.interview?.scores ?? {}) }, opinion: str(c.interview?.opinion),
        ...(c.interview?.source === "candidato" ? { source: "candidato" as const } : {}),
        ...(c.interview?.receivedAt ? { receivedAt: str(c.interview.receivedAt) } : {}),
        ...(c.interview?.linkSentAt ? { linkSentAt: str(c.interview.linkSentAt) } : {}) },
      application: null,
      profile: { linkSentAt: str(c.profile?.linkSentAt), answeredAt: str(c.profile?.answeredAt), seen: c.profile?.seen !== false,
        scores: c.profile?.scores && typeof c.profile.scores === "object" ? { ...c.profile.scores } : null },
      docs: restoreDocs(c.docs),
    };
    if (c.application) {
      const e = emptyApplication(base);
      base.application = { ...e, ...c.application, fields: { ...c.application.fields },
        experiences: { ...e.experiences, ...c.application.experiences },
        references: { ...e.references, ...c.application.references }, rh: { ...e.rh, ...c.application.rh } };
    }
    return base;
  });
  return { version: 2, seq: Math.max(Number(r.seq) || 0, candidates.length), candidates };
}
