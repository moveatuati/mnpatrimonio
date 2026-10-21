import type { Employee, GroupId, ISODate, OperationalGroup, PortariaTurn, ShiftPattern } from "./types";

export const UNIT = {
  company: "MN Patrimônios",
  /** Razão social e CNPJ como constam na escala de domingo da unidade. */
  legalName: "MN Patrimônios Assessoria, Consultoria e Serviços Imobiliários",
  cnpj: "63.864.771/0007-32",
  unit: "Condomínio Ananinville",
  city: "Ananindeua/PA",
  system: "MN Patrimônios • Gestão de Pessoas",
};

/* ------------------------------------------------------------------
 * Dois grupos de trabalho (funções da MN Patrimônios nos condomínios):
 *  P — Agente de portaria: escala 12×36 (art. 59-A da CLT), turmas diurna e noturna.
 *  S — Auxiliar de serviços gerais: 6×1 de 44h (7h20 de segunda a sábado, DSR no domingo)
 *      até a transição da EC 141/2026; depois 5×2 de 42h e, 12 meses depois, 40h.
 * ------------------------------------------------------------------ */
export const GROUPS: Record<GroupId, OperationalGroup> = {
  P: {
    id: "P",
    name: "Agente de portaria",
    shift: { start: "07:00", breakStart: "12:00", breakEnd: "13:00", end: "19:00" },
    requiredStaff: 6,
  },
  S: {
    id: "S",
    name: "Serviços gerais",
    shift: { start: "07:00", breakStart: "11:00", breakEnd: "12:00", end: "15:20" },
    requiredStaff: 9,
  },
};

export const GROUP_IDS: GroupId[] = ["P", "S"];

/** Nome curto do regime de cada grupo (para etiquetas). */
export const GROUP_REGIME: Record<GroupId, string> = { P: "12×36", S: "6×1" };

/** Turnos da portaria 12×36. Intervalo de 1h (art. 59-A: observado ou indenizado). */
export const PORTARIA_SHIFTS: Record<PortariaTurn, ShiftPattern & { label: string }> = {
  diurno: { label: "Diurno 07h–19h", start: "07:00", breakStart: "12:00", breakEnd: "13:00", end: "19:00" },
  noturno: { label: "Noturno 19h–07h", start: "19:00", breakStart: "00:00", breakEnd: "01:00", end: "07:00" },
};

/**
 * Linha do tempo legal (EC 141/2026, promulgada em 16/10/2026):
 * - até `fiveTwoStart`: 6×1 de 44h ainda aplicável;
 * - a partir de `fiveTwoStart` (até 60 dias da promulgação): 5×2 com 42h semanais (8h24 por dia);
 * - a partir de `fortyHoursStart` (12 meses depois): 5×2 com 40h (8h por dia).
 * Datas estimadas pela contagem do prazo — confirmar com o contador/sindicato da categoria.
 * A 6×1 só continua se convenção ou acordo coletivo permitir, com a folga extra no mesmo mês.
 */
export const LABOR_LAW = {
  amendment: "EC 141/2026",
  promulgation: "2026-10-16",
  fiveTwoStart: "2026-12-15",
  fortyHoursStart: "2027-12-15",
};

/** Jornada dos serviços gerais conforme a data (regime legal vigente). */
export type ServiceRegime = "6x1" | "5x2-42h" | "5x2-40h";
export function serviceRegime(date: ISODate): ServiceRegime {
  if (date >= LABOR_LAW.fortyHoursStart) return "5x2-40h";
  if (date >= LABOR_LAW.fiveTwoStart) return "5x2-42h";
  return "6x1";
}
export const SERVICE_SHIFTS: Record<ServiceRegime, ShiftPattern & { label: string; weeklyHours: number; dailyMinutes: number }> = {
  "6x1": { label: "6×1 · 07h–15h20 (44h)", start: "07:00", breakStart: "11:00", breakEnd: "12:00", end: "15:20", weeklyHours: 44, dailyMinutes: 440 },
  "5x2-42h": { label: "5×2 · 07h–16h24 (42h)", start: "07:00", breakStart: "11:00", breakEnd: "12:00", end: "16:24", weeklyHours: 42, dailyMinutes: 504 },
  "5x2-40h": { label: "5×2 · 07h–16h (40h)", start: "07:00", breakStart: "11:00", breakEnd: "12:00", end: "16:00", weeklyHours: 40, dailyMinutes: 480 },
};
export const REGIME_LABEL: Record<ServiceRegime, string> = { "6x1": "6×1 (44h)", "5x2-42h": "5×2 (42h)", "5x2-40h": "5×2 (40h)" };

/** Horário de trabalho do colaborador na data (portaria por turno; serviços gerais pelo regime legal). */
export function employeeShift(employee: Pick<Employee, "group" | "turn">, date?: ISODate): ShiftPattern & { label: string } {
  if (employee.group === "P") return PORTARIA_SHIFTS[employee.turn ?? "diurno"];
  return SERVICE_SHIFTS[serviceRegime(date ?? LABOR_LAW.promulgation)];
}

/** Minutos efetivos de trabalho (sem o intervalo), atravessando a meia-noite quando preciso. */
export function shiftMinutes(shift: ShiftPattern): number {
  const span = (a: string, b: string) => {
    const [ah = 0, am = 0] = a.split(":").map(Number); const [bh = 0, bm = 0] = b.split(":").map(Number);
    return ((bh * 60 + bm) - (ah * 60 + am) + 1440) % 1440;
  };
  return span(shift.start, shift.end) - span(shift.breakStart, shift.breakEnd);
}

/** Vagas padrão por dia (configuráveis na escala). Portaria: agentes por dia (diurno + noturno). */
export const DEFAULT_DAILY_TARGETS: Record<GroupId, number> = { P: 6, S: 9 };
/** Serviços gerais aos domingos/feriados: 0 = todos folgam (DSR preferencialmente aos domingos, Lei 605/1949). */
export const DEFAULT_SUNDAY_SLOTS: Record<GroupId, number> = { P: 6, S: 0 };

/**
 * Banco de horas (art. 59, §§ 2º, 5º e 6º da CLT) com ponto eletrônico (Portaria MTP 671/2021).
 * - Acordo individual escrito: compensação em até 6 meses; acordo/convenção coletiva: até 12 meses.
 * - Variações de até 5 min por marcação (máx. 10 min/dia) não contam (art. 58, § 1º).
 * Valores de alerta e da folga ajustáveis pelo RH.
 */
export const BANK_RULES = {
  /** A partir deste saldo, planejar a folga (amarelo). */
  attentionMinutes: 4 * 60,
  /** Saldo que gera uma folga de compensação (vermelho) ≈ 1 jornada. */
  compensateMinutes: 7 * 60 + 20,
  /** Horas descontadas ao conceder a folga de compensação (1 jornada de serviços gerais 6×1). */
  folgaMinutes: 7 * 60 + 20,
  /** Minutos após o horário de saída que passam a contar como crédito (art. 58, § 1º). */
  creditToleranceMinutes: 5,
  /** Prazo máximo para compensar o saldo (meses) — acordo individual escrito. */
  compensationMonths: 6,
};

export const RULES = {
  /** Descanso mínimo entre jornadas, em horas. */
  minRestHours: 11,
  /** Limite de alerta operacional de atraso (minutos) — não é tolerância legal. */
  lateAlertMinutes: 10,
  /** Máximo de dias consecutivos no modelo 5×2. */
  maxConsecutiveDays5x2: 5,
  /** Máximo de dias consecutivos no 6×1 (DSR a cada 7 dias, art. 67 da CLT). */
  maxConsecutiveDays6x1: 6,
  /** Descanso mínimo após a jornada de 12h na 12×36. */
  rest12x36Hours: 36,
};
