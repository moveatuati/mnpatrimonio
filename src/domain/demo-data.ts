/**
 * DADOS FICTÍCIOS para demonstração. Nenhum nome ou registro corresponde a pessoas reais.
 */
import { employeeShift } from "./config";
import { fromMinutes, toMinutes } from "./time";
import type { Employee, ISODate, PunchRecord } from "./types";

const FIRST = [
  "Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Iara", "João",
  "Karina", "Lucas", "Marina", "Nícolas", "Olívia", "Paulo", "Raquel", "Sérgio", "Tainá", "Vítor", "Yasmin",
];
const LAST = ["Andrade", "Barros", "Costa", "Duarte", "Farias", "Lima", "Moraes", "Nunes", "Pinheiro", "Queiroz", "Siqueira"];

/**
 * Quadro fictício por condomínio: portaria 12×36 (4 agentes por posto 24h: 2 diurnos e
 * 2 noturnos em dias alternados) e serviços gerais 6×1.
 */
const STAFF: { condoId: string; portaria: number; servicos: number }[] = [
  { condoId: "COND-001", portaria: 8, servicos: 6 },
  { condoId: "COND-002", portaria: 4, servicos: 3 },
];

export const DEMO_EMPLOYEES: Employee[] = (() => {
  const list: Employee[] = [];
  let i = 0;
  const push = (e: Omit<Employee, "id" | "name" | "status" | "demo">) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`;
    list.push({ id: `MN-${String(i + 1).padStart(3, "0")}`, name, status: "ativo", demo: true, ...e });
    i++;
  };
  for (const unit of STAFF) {
    for (let k = 0; k < unit.portaria; k++) {
      push({ group: "P", condoId: unit.condoId, turn: k % 4 < 2 ? "diurno" : "noturno", team: (k % 2) as 0 | 1 });
    }
    for (let k = 0; k < unit.servicos; k++) push({ group: "S", condoId: unit.condoId });
  }
  return list;
})();

/** Hash determinístico simples para variar os registros por data sem fixar números no código. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gera registros de ponto fictícios para a data. */
export function demoPunches(date: ISODate, employees: Employee[] = DEMO_EMPLOYEES,
  startOf: (e: Employee) => string = (e) => employeeShift(e, date).start): PunchRecord[] {
  return employees.map((e) => {
    const r = hash(`${date}:${e.id}`) % 100;
    const shift = { start: startOf(e) };
    if (r < 3) return { employeeId: e.id, date };
    let offset: number;
    if (r < 12) offset = 11 + (r % 15); // acima do alerta
    else if (r < 30) offset = 1 + (r % 9); // dentro do alerta
    else offset = -((r % 12) + 1); // antecipado
    return { employeeId: e.id, date, entry: fromMinutes(toMinutes(shift.start) + offset) };
  });
}
