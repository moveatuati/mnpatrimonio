import type { OperationalGroup, GroupId } from "./types";

export const UNIT = {
  company: "Formosa",
  unit: "Augusto Montenegro",
  city: "Belém/PA",
  system: "Formosa • Gestão de Pessoas",
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
  { id: "manha1", name: "Manhã 1", start: "08:00", end: "14:15" },
  { id: "manha2", name: "Manhã 2", start: "09:00", end: "15:15" },
  { id: "tarde", name: "Tarde/noite", start: "15:15", end: "21:30" },
];

export const RULES = {
  /** Descanso mínimo entre jornadas, em horas. */
  minRestHours: 11,
  /** Limite de alerta operacional de atraso (minutos) — não é tolerância legal. */
  lateAlertMinutes: 10,
  /** Máximo de dias consecutivos no modelo 5×2. */
  maxConsecutiveDays5x2: 5,
};
