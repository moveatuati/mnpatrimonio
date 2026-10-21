/**
 * DADOS FICTÍCIOS para demonstração. Nenhum nome ou registro corresponde a pessoas reais.
 */
import { GROUPS } from "./config";
import { fromMinutes, toMinutes } from "./time";
import type { Employee, GroupId, ISODate, PunchRecord } from "./types";

const FIRST = [
  "Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Iara", "João",
  "Karina", "Lucas", "Marina", "Nícolas", "Olívia", "Paulo", "Raquel", "Sérgio", "Tainá", "Vítor", "Yasmin",
];
const LAST = ["Andrade", "Barros", "Costa", "Duarte", "Farias", "Lima", "Moraes", "Nunes", "Pinheiro", "Queiroz", "Siqueira"];

const COUNTS: Record<GroupId, number> = { A: 4, B: 29, C: 30 };

export const DEMO_EMPLOYEES: Employee[] = (() => {
  const list: Employee[] = [];
  let i = 0;
  (Object.keys(COUNTS) as GroupId[]).forEach((g) => {
    for (let k = 0; k < COUNTS[g]; k++) {
      const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`;
      list.push({
        id: `FM-${String(i + 1).padStart(3, "0")}`,
        name,
        group: g,
        status: "ativo",
        demo: true,
      });
      i++;
    }
  });
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
  startOf: (e: Employee) => string = (e) => GROUPS[e.group].shift.start): PunchRecord[] {
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
