/** Modelo de dados tipado — MN Patrimônios • Gestão de Pessoas (modo demonstração). */

/** P = Agente de portaria (12×36) · S = Serviços gerais (6×1 → 5×2). */
export type GroupId = "P" | "S";
/** Turma da portaria 12×36. */
export type PortariaTurn = "diurno" | "noturno";

/** Horário no formato "HH:MM". */
export type Time = string;

/** Data no formato "AAAA-MM-DD". */
export type ISODate = string;

export interface ShiftPattern {
  start: Time;
  breakStart: Time;
  breakEnd: Time;
  end: Time;
}

export interface OperationalGroup {
  id: GroupId;
  name: string;
  shift: ShiftPattern;
  /** Necessidade operacional configurável (padrão = quadro atual até definição da administração). */
  requiredStaff: number;
}

export type EmployeeStatus = "ativo" | "ferias" | "afastado" | "desligado";

export interface Employee {
  id: string;
  name: string;
  group: GroupId;
  /** Portaria: turno (diurno/noturno) e turma (0/1 = dias alternados da 12×36). */
  turn?: PortariaTurn;
  team?: 0 | 1;
  /** Condomínio onde está lotado (cadastro de clientes). */
  condoId?: string;
  status: EmployeeStatus;
  admissionDate?: ISODate;
  hourBankMinutes?: number;
  /** Indica registro fictício para demonstração. */
  demo: true;
}

export interface PunchRecord {
  employeeId: string;
  date: ISODate;
  entry?: Time;
  breakOut?: Time;
  breakIn?: Time;
  exit?: Time;
}

export type ArrivalStatus = "no_horario" | "atraso_alerta" | "atraso_acima" | "sem_registro";

export type AlertSeverity = "critico" | "atencao" | "info";

export interface AttentionAlert {
  id: string;
  severity: AlertSeverity;
  category: "descanso" | "escala" | "ausencia" | "ponto" | "cobertura" | "alteracao";
  title: string;
  detail: string;
}

/** Perfis previstos para fases futuras (ainda sem controle de acesso). */
export type FutureRole = "administrador" | "gerente" | "operador" | "consulta";
