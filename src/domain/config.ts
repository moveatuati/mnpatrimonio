import type { OperationalGroup, GroupId } from "./types";

export const UNIT = {
  company: "MN Patrimônios",
  /** Razão social e CNPJ como constam na escala de domingo da unidade. */
  legalName: "MN Patrimônios Assessoria, Consultoria e Serviços Imobiliários",
  cnpj: "63.864.771/0007-32",
  unit: "Augusto Montenegro",
  city: "Belém/PA",
  system: "MN Patrimônios • Gestão de Pessoas",
};

/** Horários-base (configuráveis). Jornada de 7h20 em todos os grupos. */
export const GROUPS: Record<GroupId, OperationalGroup> = {
  A: {
    id: "A",
    name: "Abertura",
    shift: { start: "07:00", breakStart: "12:00", breakEnd: "14:00", end: "16:20" },
    requiredStaff: 4,
  },
  B: {
    id: "B",
    name: "Intermediário",
    shift: { start: "08:00", breakStart: "13:00", breakEnd: "15:00", end: "17:20" },
    requiredStaff: 29,
  },
  C: {
    id: "C",
    name: "Fechamento",
    shift: { start: "12:40", breakStart: "15:00", breakEnd: "17:00", end: "22:00" },
    requiredStaff: 30,
  },
};

export const GROUP_IDS: GroupId[] = ["A", "B", "C"];

export const SUNDAY_SHIFTS = [
  { id: "manha1", name: "Turno das 08h", start: "08:00", end: "14:15" },
  { id: "manha2", name: "Turno das 09h", start: "09:00", end: "15:15" },
  { id: "tarde", name: "Turno das 15h15", start: "15:15", end: "21:30" },
];

/**
 * Em domingos e feriados o código A/B/C da escala indica o TURNO ESPECIAL
 * (A = 08h, B = 09h, C = 15h15), e não o grupo habitual do colaborador.
 * Assim qualquer operador pode ser escalado em qualquer turno dominical.
 */
export const SPECIAL_SLOT_LABEL: Record<GroupId, string> = {
  A: "Turno das 08h às 14h15",
  B: "Turno das 09h às 15h15",
  C: "Turno das 15h15 às 21h30",
};

/** Vagas por turno do domingo, conforme a escala real de 25/10/2026 (9 + 10 + 10). */
export const DEFAULT_SUNDAY_SLOTS: Record<GroupId, number> = { A: 9, B: 10, C: 10 };

/**
 * Calendário de movimento informado pela gerência:
 * ALTO movimento do dia 28 até o dia 18 do mês seguinte; BAIXO do dia 19 ao dia 27.
 */
export const MOVEMENT = { lowFromDay: 19, lowUntilDay: 27 };

/** Meta mínima de operadores em dias úteis (segunda a sexta), por período. Configurável. */
export const DEFAULT_WEEKDAY_TARGETS: Record<"alta" | "baixa", Record<GroupId, number>> = {
  alta: { A: 3, B: 23, C: 24 },
  baixa: { A: 3, B: 22, C: 23 },
};

/** Regras do banco de horas informadas pela gerência (minutos). */
export const BANK_RULES = {
  /** A partir deste saldo, planejar a folga (amarelo). */
  attentionMinutes: 4 * 60,
  /** Saldo que gera uma folga de compensação (vermelho). */
  compensateMinutes: 7 * 60,
  /** Horas descontadas ao conceder a folga de compensação. */
  folgaMinutes: 7 * 60,
  /** Minutos após o horário de saída que passam a contar como crédito. */
  creditToleranceMinutes: 5,
};

export const RULES = {
  /** Descanso mínimo entre jornadas, em horas. */
  minRestHours: 11,
  /** Limite de alerta operacional de atraso (minutos) — não é tolerância legal. */
  lateAlertMinutes: 10,
  /** Máximo de dias consecutivos no modelo 5×2. */
  maxConsecutiveDays5x2: 5,
};
