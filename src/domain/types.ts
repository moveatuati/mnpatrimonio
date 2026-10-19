/** Modelo de dados tipado — Formosa • Gestão de Pessoas (modo demonstração). */

export type GroupId = "A" | "B" | "C";

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
