/**
 * Captação de pessoas — entrevista do candidato e ficha de emprego (solicitação de emprego).
 * Regras puras, sem UI. Etapa 1: dados fictícios salvos só no navegador (sem backend).
 * Fluxo: entrevista → parecer do entrevistador → (aprovado) ficha de emprego liberada → envio → parecer do RH.
 */

export const CANDIDATE_KEY = "mn-candidatos-v1";

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

export type Stage = "entrevista" | "aprovado" | "banco" | "reprovado";
export const STAGE_LABELS: Record<Stage, string> = {
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
  phone: string;
  createdAt: string;
  stage: Stage;
  decidedAt: string;
  interview: Interview;
  application: Application | null;
};
export type CandidateStore = { version: 1; seq: number; candidates: Candidate[] };

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

/** Pergunta(s) obrigatória(s) para fechar o parecer: todas as 10 do formulário. */
export function interviewMissing(c: Candidate): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("Nome do candidato");
  if (!c.role.trim()) out.push("Cargo pretendido");
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
export function decide(c: Candidate, stage: Exclude<Stage, "entrevista">, now: string): Candidate | string {
  const missing = interviewMissing(c);
  if (missing.length) return `Complete antes do parecer: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ` e mais ${missing.length - 4}` : ""}.`;
  if (c.application?.status === "enviada" && stage !== "aprovado") return "A ficha de emprego já foi enviada; o parecer não pode ser revertido.";
  return {
    ...c, stage, decidedAt: now,
    application: stage === "aprovado" ? c.application ?? emptyApplication(c) : c.application,
  };
}

/** Reabre a entrevista (somente antes do envio da ficha). */
export function reopen(c: Candidate): Candidate | string {
  if (c.application?.status === "enviada") return "A ficha já foi enviada; a entrevista não pode ser reaberta.";
  return { ...c, stage: "entrevista", decidedAt: "" };
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
  if (a.fields.cpf?.trim() && !isValidCPF(a.fields.cpf)) out.push("CPF válido");
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
    ...c, name: f.nome.trim(), role: f.cargo.trim(), phone: f.telefone.trim(),
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
    id, name: "", role: "Operador(a) de caixa", phone: "", createdAt: today, stage: "entrevista", decidedAt: "",
    interview: { date: today, interviewer: "", answers: {}, scores: {}, opinion: "" }, application: null,
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
    interviewing: cs.filter(c => c.stage === "entrevista").length,
    awaitingForm: cs.filter(c => c.stage === "aprovado" && c.application?.status !== "enviada").length,
    sent: cs.filter(c => c.application?.status === "enviada" && !c.application.rh.verdict).length,
    fit: cs.filter(c => c.application?.rh.verdict === "apto").length,
  };
}

/* ───────────── Demonstração e restauração ───────────── */

export function demoCandidates(): CandidateStore {
  const full: Interview["answers"] = {
    saida: "Fim do contrato temporário; buscava estabilidade.", colaborador: "Pontualidade e compromisso com o cliente.",
    dificuldade: "Pessoas que não cumprem combinados.", horario: "Sim, tenho disponibilidade para troca de turno.",
    hobby: "Futebol aos sábados e igreja.", uniforme: "Nenhuma restrição.", salario: "Piso da categoria.",
    supervisao: "Não, gosto de receber orientação.", parente: "Não.", sobre: "Trabalhei 2 anos como repositor, sou organizado e gosto de atender.",
  };
  const ana: Candidate = {
    id: "CAND-001", name: "Ana Paula Ribeiro (fictícia)", role: "Operador(a) de caixa", phone: "(91) 9 8100-0001",
    createdAt: "2026-10-19", stage: "aprovado", decidedAt: "2026-10-20T10:00:00",
    interview: { date: "2026-10-20", interviewer: "Supervisão de caixa", answers: full,
      scores: { comunicacao: 5, postura: 4, disponibilidade: 5, perfil: 4 }, opinion: "Boa comunicação e disponibilidade total. Aprovada para a ficha." },
    application: null,
  };
  ana.application = emptyApplication(ana);
  const bruno: Candidate = {
    id: "CAND-002", name: "Bruno Lima (fictício)", role: "Fiscal de caixa", phone: "(91) 9 8100-0002",
    createdAt: "2026-10-21", stage: "entrevista", decidedAt: "",
    interview: { date: "2026-10-21", interviewer: "", answers: { saida: "Mudança de bairro.", colaborador: "Honestidade." }, scores: {}, opinion: "" },
    application: null,
  };
  return { version: 1, seq: 2, candidates: [bruno, ana] };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
export function restoreCandidates(raw: unknown): CandidateStore {
  const r = raw as Partial<CandidateStore> | null;
  if (!r || r.version !== 1 || !Array.isArray(r.candidates)) return demoCandidates();
  const candidates = r.candidates.filter(c => c && typeof c.id === "string").map(c => {
    const base: Candidate = {
      id: c.id, name: str(c.name), role: str(c.role), phone: str(c.phone), createdAt: str(c.createdAt),
      stage: (["entrevista", "aprovado", "banco", "reprovado"] as Stage[]).includes(c.stage) ? c.stage : "entrevista",
      decidedAt: str(c.decidedAt),
      interview: { date: str(c.interview?.date), interviewer: str(c.interview?.interviewer), answers: { ...(c.interview?.answers ?? {}) },
        scores: { ...(c.interview?.scores ?? {}) }, opinion: str(c.interview?.opinion),
        ...(c.interview?.source === "candidato" ? { source: "candidato" as const } : {}),
        ...(c.interview?.receivedAt ? { receivedAt: str(c.interview.receivedAt) } : {}),
        ...(c.interview?.linkSentAt ? { linkSentAt: str(c.interview.linkSentAt) } : {}) },
      application: null,
    };
    if (c.application) {
      const e = emptyApplication(base);
      base.application = { ...e, ...c.application, fields: { ...c.application.fields },
        experiences: { ...e.experiences, ...c.application.experiences },
        references: { ...e.references, ...c.application.references }, rh: { ...e.rh, ...c.application.rh } };
    }
    return base;
  });
  return { version: 1, seq: Math.max(Number(r.seq) || 0, candidates.length), candidates };
}
