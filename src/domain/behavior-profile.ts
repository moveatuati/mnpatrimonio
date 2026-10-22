/**
 * Perfil comportamental do candidato (1ª etapa da captação) — mesmos 4 perfis do CRM MoveAtuati.
 * ETAPA DE DEMONSTRAÇÃO: questionário curto e cálculo no navegador. Na fase com banco de dados,
 * entra o questionário oficial do CRM (25 perguntas, resultado calculado no servidor).
 */

export type PerfilNome = "Tubarão" | "Gato" | "Águia" | "Lobo";
export const PERFIL_NOMES: PerfilNome[] = ["Tubarão", "Gato", "Águia", "Lobo"];

export type PerfilInfo = {
  emoji: string; cor: string; fundo: string; foco: string; leitura: string;
  forcas: string[]; descricaoAcao: string[]; pontosDesenvolvimento: string[];
};

/** Textos iguais aos do relatório do CRM MoveAtuati. */
export const PERFIS: Record<PerfilNome, PerfilInfo> = {
  "Tubarão": {
    emoji: "🦈", cor: "#0f8a57", fundo: "#e6f4ec", foco: "Ação, iniciativa e resultados",
    leitura: "As respostas podem indicar preferência por agir, enfrentar desafios e manter atenção no avanço das entregas.",
    forcas: ["iniciativa", "senso de urgência", "orientação a resultados"],
    descricaoAcao: ["Tendência à iniciativa diante de desafios", "Foco no avanço das entregas e nos resultados", "Prefere partir para a ação quando há um caminho viável"],
    pontosDesenvolvimento: ["Equilibrar rapidez com escuta ativa", "Reavaliar o plano quando surgem novas informações", "Confirmar detalhes importantes antes da decisão"],
  },
  "Gato": {
    emoji: "🐱", cor: "#c2620f", fundo: "#fcefe2", foco: "Colaboração, comunicação e relacionamentos",
    leitura: "As respostas podem indicar preferência por construir em conjunto, manter diálogo e considerar o clima das relações.",
    forcas: ["comunicação", "cooperação", "construção de consenso"],
    descricaoAcao: ["Valoriza diálogo e relações de colaboração", "Tende a buscar consenso para avançar em equipe", "Considera o clima das relações no cotidiano"],
    pontosDesenvolvimento: ["Expressar discordâncias com clareza", "Conciliar harmonia e cumprimento das entregas", "Tomar posição quando há prioridades conflitantes"],
  },
  "Águia": {
    emoji: "🦅", cor: "#1f5fcf", fundo: "#e7effc", foco: "Exploração, criatividade e possibilidades",
    leitura: "As respostas podem indicar abertura para novas possibilidades, autonomia de pensamento e interesse por caminhos alternativos.",
    forcas: ["criatividade", "visão de possibilidades", "adaptação de ideias"],
    descricaoAcao: ["Explora novas ideias e possibilidades", "Tende a buscar caminhos alternativos", "Valoriza autonomia para pensar e criar"],
    pontosDesenvolvimento: ["Transformar ideias em primeiros testes observáveis", "Equilibrar criatividade e atenção aos detalhes", "Estruturar o acompanhamento da execução"],
  },
  "Lobo": {
    emoji: "🐺", cor: "#7a3fb0", fundo: "#f1eaf8", foco: "Organização, consistência e planejamento",
    leitura: "As respostas podem indicar preferência por estrutura, previsibilidade, critérios claros e acompanhamento cuidadoso.",
    forcas: ["organização", "consistência", "atenção a critérios"],
    descricaoAcao: ["Prefere critérios claros e planejamento", "Valoriza consistência na execução", "Acompanha com atenção o que foi combinado"],
    pontosDesenvolvimento: ["Ajustar planos diante de mudanças reais", "Começar mesmo sem informações completas", "Conciliar método e flexibilidade"],
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

export type Eixo = { titulo: string; a: string; av: number; b: string; bv: number; lider: string; sinal: string; leitura: string; equilibrio: boolean };

function eixo(titulo: string, a: string, av: number, b: string, bv: number): Eixo {
  const equilibrio = Math.abs(av - bv) < 0.01;
  const lider = av >= bv ? a : b;
  const sinal = equilibrio ? "Equilíbrio entre os polos" : Math.max(av, bv) > 70 ? "Predominância acentuada"
    : Math.max(av, bv) > 60 ? "Predominância intermediária" : "Leve predominância";
  const leituras: Record<string, string> = {
    Atuante: "Tendência à ação e à iniciativa.", Pensante: "Tendência à reflexão antes da ação.",
    Razão: "Tendência a priorizar critérios racionais.", Emoção: "Tendência a considerar aspectos emocionais e relacionais.",
  };
  return { titulo, a, av, b, bv, lider, sinal, equilibrio, leitura: equilibrio ? "As respostas se distribuem igualmente entre os polos." : leituras[lider]! };
}

/**
 * Leitura completa do resultado — mesma inteligência do CRM:
 * Atuante = Gato + Tubarão · Pensante = Águia + Lobo · Razão = Tubarão + Lobo · Emoção = Gato + Águia.
 */
export function profileReading(scores: ProfileScores) {
  const p = (n: PerfilNome) => scores[n];
  const atuante = p("Gato") + p("Tubarão"), pensante = p("Águia") + p("Lobo");
  const razao = p("Tubarão") + p("Lobo"), emocao = p("Gato") + p("Águia");
  const dominantes = predominant(scores);
  const metas = dominantes.map(n => PERFIS[n]);
  const fortalezas = [...new Set(metas.flatMap(m => m.forcas))];
  return {
    dominantes,
    foco: metas.map(m => m.foco).join(" • "),
    descricao: dominantes.length === 1 ? metas[0]!.leitura : "Empate no maior resultado. Os perfis predominantes são exibidos juntos, sem desempate artificial.",
    agir: eixo("Forma de agir", "Atuante", atuante, "Pensante", pensante),
    orientacao: eixo("Orientação", "Razão", razao, "Emoção", emocao),
    caracteristicas: [...new Set([...fortalezas, ...metas.map(m => m.foco)])],
    pontosMelhoria: [...new Set(metas.flatMap(m => m.pontosDesenvolvimento))],
    comoAge: [...new Set(metas.flatMap(m => m.descricaoAcao))],
    notaAgir: atuante === pensante ? "Equilíbrio entre ação e reflexão."
      : atuante > pensante ? "Há maior preferência por iniciativa e ação." : "Há maior preferência por reflexão antes da ação.",
    comoDecide: razao === emocao
      ? ["Equilíbrio entre critérios racionais e relacionais", "Considere evidências e impactos humanos antes de decidir"]
      : razao > emocao
        ? ["As respostas favorecem critérios racionais", "Avaliar informações disponíveis antes de decidir", "Considerar também os impactos humanos"]
        : ["As respostas favorecem aspectos relacionais", "Considerar emoções e contexto ao decidir", "Checar também os critérios e fatos envolvidos"],
    notaDecidir: razao === emocao ? "Equilíbrio entre razão e emoção."
      : razao > emocao ? "A orientação tende a privilegiar critérios racionais." : "A orientação tende a considerar aspectos relacionais e emocionais.",
    forcas: fortalezas.map(f => f.charAt(0).toLocaleUpperCase("pt-BR") + f.slice(1)),
  };
}
