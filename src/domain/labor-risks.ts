/**
 * Riscos trabalhistas e de custo, em linguagem simples, para o RH e o gerente.
 * Não é parecer jurídico: aponta situações que a escala/banco mostram e o que fazer.
 */
import { BANK_RULES, RULES } from "./config";
import { DEMO_EMPLOYEES } from "./demo-data";
import type { AbsenceStore } from "./absences";
import { bankBoard, hoursText, type HourStore } from "./hour-bank";
import { movementKind } from "./movement";
import { adjacentRestProblems, assignmentFor, dateOffset, dayOfWeek, type ScheduleStore } from "./schedule";
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

  // 1) Descanso menor que 11h e 7 dias seguidos (escala)
  const rest: LaborRisk["people"] = [];
  const seven: LaborRisk["people"] = [];
  for (const e of DEMO_EMPLOYEES) {
    for (const d of dates.filter((_, i) => i % 2 === 0)) {
      for (const msg of adjacentRestProblems(schedule, e, d)) {
        const target = msg.includes("sete dias") ? seven : rest;
        if (!target.some(p => p.id === e.id)) target.push({ id: e.id, name: e.name, detail: msg.replace(e.name + ": ", "").replace(e.name + " ", "") });
      }
    }
  }
  risks.push({
    id: "descanso", level: rest.length ? "alto" : "baixo",
    title: "Descanso menor que " + RULES.minRestHours + "h entre um dia e outro",
    why: "A CLT exige 11h de descanso entre jornadas. Desrespeitar gera hora extra devida e risco de multa.",
    action: rest.length ? "Ajustar o turno ou dar folga no dia seguinte." : "Nenhum caso na escala do período.",
    people: rest,
  });
  risks.push({
    id: "sete-dias", level: seven.length ? "alto" : "baixo",
    title: "Sete dias seguidos de trabalho",
    why: "Todo trabalhador precisa de um descanso semanal. Sem ele, o dia é pago em dobro.",
    action: seven.length ? "Marcar a folga antecipada ou a folga do 7º dia." : "Nenhum caso: as folgas do revezamento estão em dia.",
    people: seven,
  });

  // 2) Domingos seguidos
  const sundays = dates.filter(d => dayOfWeek(d) === 0);
  const doubleSunday: LaborRisk["people"] = [];
  for (const e of DEMO_EMPLOYEES) {
    for (const s of sundays) {
      if (assignmentFor(schedule, e, s) !== null && assignmentFor(schedule, e, dateOffset(s, -7)) !== null) {
        doubleSunday.push({ id: e.id, name: e.name, detail: "Trabalha " + br(dateOffset(s, -7)) + " e " + br(s) });
        break;
      }
    }
  }
  risks.push({
    id: "domingos", level: doubleSunday.length ? "medio" : "baixo",
    title: "Dois domingos seguidos trabalhados",
    why: "A regra da loja é domingo sim, domingo não. O comércio também precisa garantir folga em domingos periodicamente.",
    action: doubleSunday.length ? "Trocar um dos domingos com um colega que estava de folga." : "Revezamento de domingos respeitado.",
    people: doubleSunday,
  });

  // 3) Banco de horas acumulado (custo) e negativo
  const board = bankBoard(hours, end);
  const red = board.filter(r => r.level === "vermelho");
  risks.push({
    id: "banco-alto", level: red.length ? "alto" : "baixo",
    title: "Banco de horas com " + hoursText(BANK_RULES.compensateMinutes) + " ou mais",
    why: "Horas acumuladas sem folga podem virar hora extra paga (custo maior) ou passar do prazo de compensação.",
    action: red.length ? "Programar a folga de compensação, de preferência do dia 19 ao 27." : "Ninguém acima do limite.",
    people: red.map(r => ({ id: r.employee.id, name: r.employee.name, detail: "Saldo " + hoursText(r.minutes) })),
  });
  const negative = board.filter(r => r.level === "negativo");
  risks.push({
    id: "banco-negativo", level: negative.length ? "medio" : "baixo",
    title: "Banco de horas negativo",
    why: "A pessoa deve horas à empresa. Precisa de acordo para repor, senão vira desconto.",
    action: negative.length ? "Combinar a reposição (ficar alguns minutos a mais em dias de alto movimento)." : "Nenhum saldo negativo.",
    people: negative.map(r => ({ id: r.employee.id, name: r.employee.name, detail: "Saldo " + hoursText(r.minutes) })),
  });

  // 4) Folgas de compensação marcadas em período de alto movimento
  const highFolgas = hours.entries.filter(e => e.kind === "compensacao" && e.status === "aprovado" &&
    e.date >= start && e.date <= end && movementKind(e.date) === "alta");
  risks.push({
    id: "folga-alta", level: "baixo",
    title: "Folgas do banco marcadas no alto movimento",
    why: "Não é infração, mas deixa o caixa com menos gente nos dias de maior fluxo.",
    action: highFolgas.length ? "Se possível, mover para o período do dia 19 ao 27." : "Nenhuma folga no período de alto movimento.",
    people: highFolgas.map(e => ({ id: e.employeeId, name: DEMO_EMPLOYEES.find(p => p.id === e.employeeId)?.name ?? e.employeeId, detail: "Folga em " + br(e.date) })),
  });

  // 5) Escalado com férias/atestado aprovado
  const conflicts: LaborRisk["people"] = [];
  for (const a of absences?.entries.filter(x => x.status === "aprovado") ?? []) {
    for (const d of dates) {
      if (d < a.start || d > a.end) continue;
      const e = DEMO_EMPLOYEES.find(p => p.id === a.employeeId);
      if (e && assignmentFor(schedule, e, d) !== null && dayOfWeek(d) === 0) {
        conflicts.push({ id: e.id, name: e.name, detail: "Escalado no domingo " + br(d) + " durante " + (a.type === "ferias" ? "férias" : "afastamento") });
        break;
      }
    }
  }
  risks.push({
    id: "ferias-escala", level: conflicts.length ? "medio" : "baixo",
    title: "Pessoa de férias ou atestado escalada no domingo",
    why: "O domingo fica com menos gente do que o planejado.",
    action: conflicts.length ? "Colocar outra pessoa no lugar na escala de domingo." : "Nenhum conflito.",
    people: conflicts,
  });

  const order: Record<RiskLevel, number> = { alto: 0, medio: 1, baixo: 2 };
  return risks.sort((a, b) => order[a.level] - order[b.level] || b.people.length - a.people.length);
}

function br(d: ISODate) { return d.split("-").reverse().join("/"); }
