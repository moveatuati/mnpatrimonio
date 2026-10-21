/**
 * Riscos trabalhistas e de custo, em linguagem simples, para o RH e o gerente.
 * Não é parecer jurídico: aponta situações que a escala/banco mostram e o que fazer.
 */
import { BANK_RULES, LABOR_LAW, RULES } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { bankBoard, hoursText, type HourStore } from "./hour-bank";
import { adjacentRestProblems, assignmentFor, dateOffset, dayOfWeek, restAudit, type ScheduleStore } from "./schedule";
import type { ISODate } from "./types";

export type RiskLevel = "alto" | "medio" | "baixo";
export interface LaborRisk {
  id: string;
  level: RiskLevel;
  title: string;
  /** Por que importa (multa, processo ou custo). */
  why: string;
  /** O que fazer, em uma frase. */
  action: string;
  people: { id: string; name: string; detail: string }[];
}

export function laborRisks(schedule: ScheduleStore, hours: HourStore, absences: AbsenceStore | null,
  start: ISODate, days = 28): LaborRisk[] {
  const dates = Array.from({ length: days }, (_, i) => dateOffset(start, i));
  const end = dates[dates.length - 1]!;
  const risks: LaborRisk[] = [];

  // 1) Descanso menor que o mínimo (11h; 36h na 12×36) e dias seguidos acima do limite
  const rest: LaborRisk["people"] = [];
  const seven: LaborRisk["people"] = [];
  for (const e of DEMO_EMPLOYEES) {
    for (const d of dates.filter((_, i) => i % 2 === 0)) {
      for (const msg of adjacentRestProblems(schedule, e, d)) {
        const target = msg.includes("dias consecutivos") ? seven : rest;
        if (!target.some(p => p.id === e.id)) target.push({ id: e.id, name: e.name, detail: msg.replace(e.name + ": ", "").replace(e.name + " ", "") });
      }
    }
  }
  risks.push({
    id: "descanso", level: rest.length ? "alto" : "baixo",
    title: "Descanso menor que o mínimo entre jornadas",
    why: "A CLT exige " + RULES.minRestHours + "h entre jornadas (art. 66) e a 12×36 exige 36h após o plantão (art. 59-A). Desrespeitar gera hora extra devida e risco de multa.",
    action: rest.length ? "Ajustar o turno ou dar folga no dia seguinte." : "Nenhum caso na escala do período.",
    people: rest,
  });
  risks.push({
    id: "sete-dias", level: seven.length ? "alto" : "baixo",
    title: "Dias seguidos acima do limite (serviços gerais)",
    why: "No 6×1 o descanso semanal vem a cada 7 dias (art. 67 da CLT); na 5×2 são no máximo 5 jornadas. Sem a folga, o dia é pago em dobro.",
    action: seven.length ? "Marcar a folga antecipada ou a folga do 7º dia." : "Nenhum caso: as folgas estão em dia.",
    people: seven,
  });

  // 1b) Domingo trabalhado precisa de 1 folga antes e 1 folga depois (regra do gerente)
  const audit = restAudit(schedule, start, Math.ceil(days / 7));
  const missing = audit.rows.filter(r => r.checks.some(c => c.worked && !c.ok));
  risks.push({
    id: "folgas-domingo", level: missing.length ? "alto" : "baixo",
    title: "Serviços gerais no domingo sem as duas folgas (antes e depois)",
    why: "Quem trabalha no domingo precisa da folga compensatória. Sem ela, o descanso semanal fica em falta e o domingo é pago em dobro (Lei 605/1949).",
    action: missing.length ? "Marcar a folga que falta na aba Escala & trocas → Conferência de folgas." : "Todos os domingos trabalhados têm as duas folgas.",
    people: missing.map(r => ({ id: r.employee.id, name: r.employee.name,
      detail: r.checks.filter(c => c.worked && !c.ok).map(c => "domingo " + br(c.sunday) + (c.before ? "" : " sem folga antes") + (c.after ? "" : " sem folga depois")).join("; ") })),
  });

  // 2) Serviços gerais sem nenhum domingo de folga no período
  const sundays = dates.filter(d => dayOfWeek(d) === 0);
  const noSundayOff: LaborRisk["people"] = [];
  for (const e of DEMO_EMPLOYEES.filter(x => x.group === "S" && x.status === "ativo")) {
    if (sundays.length && sundays.every(s => assignmentFor(schedule, e, s) !== null))
      noSundayOff.push({ id: e.id, name: e.name, detail: "Trabalha todos os " + sundays.length + " domingos do período" });
  }
  risks.push({
    id: "domingos", level: noSundayOff.length ? "medio" : "baixo",
    title: "Serviços gerais sem domingo de folga",
    why: "O descanso semanal deve coincidir com o domingo periodicamente na escala de revezamento (Lei 605/1949).",
    action: noSundayOff.length ? "Revezar o domingo com um colega de folga." : "Todos têm domingo de folga no período.",
    people: noSundayOff,
  });

  // 3) Banco de horas acumulado (custo) e negativo
  const board = bankBoard(hours, end);
  const red = board.filter(r => r.level === "vermelho");
  risks.push({
    id: "banco-alto", level: red.length ? "alto" : "baixo",
    title: "Banco de horas com " + hoursText(BANK_RULES.compensateMinutes) + " ou mais",
    why: "Horas acumuladas sem folga podem virar hora extra paga (custo maior) ou passar do prazo de compensação.",
    action: red.length ? "Programar a folga de compensação dentro do prazo do acordo (até " + BANK_RULES.compensationMonths + " meses)." : "Ninguém acima do limite.",
    people: red.map(r => ({ id: r.employee.id, name: r.employee.name, detail: "Saldo " + hoursText(r.minutes) })),
  });
  const negative = board.filter(r => r.level === "negativo");
  risks.push({
    id: "banco-negativo", level: negative.length ? "medio" : "baixo",
    title: "Banco de horas negativo",
    why: "A pessoa deve horas à empresa. Precisa de acordo para repor, senão vira desconto.",
    action: negative.length ? "Combinar a reposição por escrito (ficar alguns minutos a mais em dias combinados)." : "Nenhum saldo negativo.",
    people: negative.map(r => ({ id: r.employee.id, name: r.employee.name, detail: "Saldo " + hoursText(r.minutes) })),
  });

  // 4) Transição legal da EC 141/2026 (serviços gerais 6×1 → 5×2)
  const services = DEMO_EMPLOYEES.filter(x => x.group === "S" && x.status === "ativo");
  const reachesTransition = end >= dateOffset(LABOR_LAW.fiveTwoStart, -45);
  risks.push({
    id: "ec141", level: reachesTransition ? "medio" : "baixo",
    title: "Transição para a 5×2 — " + LABOR_LAW.amendment,
    why: "A partir de " + br(LABOR_LAW.fiveTwoStart) + " a jornada máxima é de 42h em 5×2 (40h a partir de " + br(LABOR_LAW.fortyHoursStart) +
      "). A 6×1 só continua com convenção ou acordo coletivo.",
    action: reachesTransition ? "Preparar aditivo de contrato e a nova escala 5×2 dos serviços gerais; conferir a convenção coletiva." :
      "Acompanhar a data de transição; a escala já muda automaticamente na data.",
    people: reachesTransition ? services.map(e => ({ id: e.id, name: e.name, detail: "Serviços gerais · revisar contrato para 5×2" })) : [],
  });
  // 4b) Portaria 12×36: acordo escrito e adicional noturno
  const night = DEMO_EMPLOYEES.filter(x => x.group === "P" && x.turn === "noturno" && x.status === "ativo");
  risks.push({
    id: "12x36", level: "baixo",
    title: "Portaria 12×36: acordo escrito e adicional noturno",
    why: "A 12×36 exige acordo individual escrito ou convenção coletiva (art. 59-A da CLT). Das 22h às 5h há adicional noturno de 20% e a hora noturna tem 52min30s (art. 73).",
    action: "Manter o acordo assinado no prontuário e conferir o adicional noturno na folha da turma noturna.",
    people: night.map(e => ({ id: e.id, name: e.name, detail: "Turma noturna · adicional noturno" })),
  });

  // 5) Escalado com férias/atestado aprovado
  const conflicts: LaborRisk["people"] = [];
  for (const a of absences?.entries.filter(x => x.status === "aprovado") ?? []) {
    for (const d of dates) {
      if (d < a.start || d > a.end) continue;
      const e = DEMO_EMPLOYEES.find(p => p.id === a.employeeId);
      if (e && assignmentFor(schedule, e, d) !== null) {
        conflicts.push({ id: e.id, name: e.name, detail: "Escalado em " + br(d) + " durante " + (a.type === "ferias" ? "férias" : "afastamento") });
        break;
      }
    }
  }
  risks.push({
    id: "ferias-escala", level: conflicts.length ? "medio" : "baixo",
    title: "Pessoa de férias ou afastada ainda na escala",
    why: "O posto fica descoberto: na portaria 12×36 é preciso um folguista ou troca de turma.",
    action: conflicts.length ? "Colocar outra pessoa no lugar (troca ou cobertura) na Escala & trocas." : "Nenhum conflito.",
    people: conflicts,
  });

  const order: Record<RiskLevel, number> = { alto: 0, medio: 1, baixo: 2 };
  return risks.sort((a, b) => order[a.level] - order[b.level] || b.people.length - a.people.length);
}

function br(d: ISODate) { return d.split("-").reverse().join("/"); }
