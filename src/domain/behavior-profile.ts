/**
 * Perfil comportamental do candidato (1ª etapa da captação) — mesmos 4 perfis do CRM MoveAtuati.
 * ETAPA DE DEMONSTRAÇÃO: questionário curto e cálculo no navegador. Na fase com banco de dados,
 * entra o questionário oficial do CRM (25 perguntas, resultado calculado no servidor).
 */

export type PerfilNome = "Tubarão" | "Gato" | "Águia" | "Lobo";
export const PERFIL_NOMES: PerfilNome[] = ["Tubarão", "Gato", "Águia", "Lobo"];

export const PERFIS: Record<PerfilNome, { foco: string; forcas: string[]; explorar: string[]; cor: string }> = {
  "Tubarão": {
    foco: "Ação, iniciativa e resultados", cor: "#0f8a57",
    forcas: ["iniciativa", "senso de urgência", "orientação a resultados"],
    explorar: [
      "Conte uma situação em que precisou agir rápido e depois ajustar o plano.",
      "Como você mantém a velocidade sem deixar de ouvir quem está à sua volta?",
    ],
  },
  "Gato": {
    foco: "Colaboração, comunicação e relacionamentos", cor: "#c2620f",
    forcas: ["comunicação", "cooperação", "construção de consenso"],
    explorar: [
      "Como você apresenta uma discordância sem deixar de dizer o que precisa?",
      "Quando manter a harmonia atrapalha uma entrega, como você decide?",
    ],
  },
  "Águia": {
    foco: "Exploração, criatividade e possibilidades", cor: "#1f5fcf",
    forcas: ["criatividade", "visão de possibilidades", "adaptação de ideias"],
    explorar: [
      "Conte uma ideia sua que deu certo no trabalho. Como você colocou em prática?",
      "O que ajuda você a equilibrar ideias novas com atenção aos detalhes da rotina?",
    ],
  },
  "Lobo": {
    foco: "Organização, consistência e planejamento", cor: "#7a3fb0",
    forcas: ["organização", "consistência", "atenção a regras e critérios"],
    explorar: [
      "Quando o plano muda de repente, como você se organiza?",
      "Que informações você precisa para começar uma tarefa nova com segurança?",
    ],
  },
};

export type ProfileScores = Record<PerfilNome, number>;

/** Situação do perfil dentro do candidato. `seen=false` = resposta nova ainda não vista pelo recrutador. */
export type BehaviorProfile = { linkSentAt: string; answeredAt: string; scores: ProfileScores | null; seen: boolean };
export const emptyProfile = (): BehaviorProfile => ({ linkSentAt: "", answeredAt: "", scores: null, seen: true });

/** Questionário de demonstração (6 perguntas, uma alternativa por perfil). */
export const PROFILE_QUESTIONS: { id: string; text: string; options: { text: string; perfil: PerfilNome }[] }[] = [
  { id: "q1", text: "Quando aparece um problema no trabalho, você normalmente…", options: [
    { text: "Resolve logo e toma a frente", perfil: "Tubarão" },
    { text: "Segue o procedimento combinado, passo a passo", perfil: "Lobo" },
    { text: "Conversa com os colegas para resolver juntos", perfil: "Gato" },
    { text: "Pensa em um jeito diferente de resolver", perfil: "Águia" },
  ] },
  { id: "q2", text: "O que mais deixa você satisfeito(a) no fim do dia?", options: [
    { text: "Ter um bom clima com as pessoas", perfil: "Gato" },
    { text: "Ter feito tudo rápido e bem feito", perfil: "Tubarão" },
    { text: "Ter aprendido ou feito algo novo", perfil: "Águia" },
    { text: "Tudo organizado e no horário certo", perfil: "Lobo" },
  ] },
  { id: "q3", text: "Um morador chega reclamando. Você…", options: [
    { text: "Registra e segue as regras do condomínio", perfil: "Lobo" },
    { text: "Escuta com calma e acalma a pessoa", perfil: "Gato" },
    { text: "Resolve na hora o que estiver ao seu alcance", perfil: "Tubarão" },
    { text: "Procura uma solução que ninguém tinha pensado", perfil: "Águia" },
  ] },
  { id: "q4", text: "Como você prefere receber uma tarefa?", options: [
    { text: "Com espaço para dar ideias", perfil: "Águia" },
    { text: "Com instruções claras e detalhadas", perfil: "Lobo" },
    { text: "Com o objetivo e liberdade para fazer", perfil: "Tubarão" },
    { text: "Explicada em conversa, junto com a equipe", perfil: "Gato" },
  ] },
  { id: "q5", text: "Os colegas costumam dizer que você é…", options: [
    { text: "Amigável e fácil de conversar", perfil: "Gato" },
    { text: "Organizado(a) e de confiança", perfil: "Lobo" },
    { text: "Criativo(a)", perfil: "Águia" },
    { text: "Decidido(a)", perfil: "Tubarão" },
  ] },
  { id: "q6", text: "Quando a rotina muda de repente, você…", options: [
    { text: "Se adapta rápido e parte para a ação", perfil: "Tubarão" },
    { text: "Gosta, vê como uma novidade", perfil: "Águia" },
    { text: "Prefere entender o novo plano antes de começar", perfil: "Lobo" },
    { text: "Procura saber como a equipe está lidando", perfil: "Gato" },
  ] },
];

/** Percentual de cada perfil a partir das alternativas escolhidas (soma 100). */
export function scoreAnswers(answers: Record<string, PerfilNome>): ProfileScores {
  const picks = Object.values(answers);
  const counts: ProfileScores = { "Tubarão": 0, "Gato": 0, "Águia": 0, "Lobo": 0 };
  picks.forEach(p => { counts[p] += 1; });
  return normalize(counts);
}

function normalize(raw: ProfileScores): ProfileScores {
  const total = PERFIL_NOMES.reduce((a, p) => a + raw[p], 0) || 1;
  const out = Object.fromEntries(PERFIL_NOMES.map(p => [p, Math.round((raw[p] / total) * 100)])) as ProfileScores;
  const diff = 100 - PERFIL_NOMES.reduce((a, p) => a + out[p], 0);
  const top = ranked(out)[0]!.nome;
  out[top] += diff;
  return out;
}

export function ranked(scores: ProfileScores): { nome: PerfilNome; pct: number }[] {
  return PERFIL_NOMES.map(nome => ({ nome, pct: scores[nome] })).sort((a, b) => b.pct - a.pct);
}

/** Perfil(is) predominante(s); empate mostra os dois, sem desempate artificial. */
export function predominant(scores: ProfileScores): PerfilNome[] {
  const r = ranked(scores);
  return r.filter(x => x.pct === r[0]!.pct).map(x => x.nome);
}

/** Resultado fictício (sempre o mesmo para o mesmo candidato) usado no botão "Simular resposta". */
export function simulatedScores(seed: string): ProfileScores {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const order = [...PERFIL_NOMES];
  for (let i = order.length - 1; i > 0; i--) { const j = (h >> (i * 3)) % (i + 1); [order[i], order[j]] = [order[j]!, order[i]!]; }
  const shape = [[46, 26, 17, 11], [38, 30, 20, 12], [52, 22, 15, 11]][h % 3]!;
  return Object.fromEntries(order.map((p, i) => [p, shape[i]!])) as ProfileScores;
}

export const profileUrl = (origin: string, name: string) => `${origin}/perfil?n=${encodeURIComponent(name.trim().split(" ")[0] ?? "")}`;

export function profileMessage(name: string, role: string, condo: string, url: string): string {
  const first = name.trim().split(" ")[0] || "candidato(a)";
  return `Olá, ${first}! Aqui é da MN Patrimônios. Obrigado pelo interesse na vaga de ${role}${condo ? ` (${condo})` : ""}.\n\nO primeiro passo é um teste rápido de perfil (uns 5 minutos, não tem resposta certa ou errada):\n${url}\n\nAo terminar, toque em "Enviar".`;
}
