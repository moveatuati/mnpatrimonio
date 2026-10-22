import {
  LayoutDashboard, Users, CalendarClock, Fingerprint, Plane, Hourglass, FileText, FlaskConical, ScrollText, Smartphone, UserPlus, Building2, MonitorSmartphone,
} from "lucide-react";

/** `demo: true` = tela de demonstração (aparece em laranja no fim do menu; não fica no sistema final). */
export const NAV = [
  { to: "/", label: "Visão da operação", icon: LayoutDashboard },
  { to: "/candidatos", label: "Captação de candidatos", icon: UserPlus },
  { to: "/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/escala", label: "Escala & trocas", icon: CalendarClock },
  { to: "/ferias", label: "Férias & afastamentos", icon: Plane },
  { to: "/banco-de-horas", label: "Banco de horas", icon: Hourglass },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/condominios", label: "Condomínios & funções", icon: Building2 },
  { to: "/regras", label: "Regras & histórico", icon: ScrollText },
  { to: "/simulador", label: "Simulador 5×2", icon: FlaskConical, demo: true },
  { to: "/ponto", label: "Ponto simulado", icon: Fingerprint, demo: true },
  { to: "/app-gerente", label: "App do supervisor (prévia)", icon: Smartphone, demo: true },
  { to: "/link-candidato", label: "Link do candidato (prévia)", icon: MonitorSmartphone, demo: true },
] as { to: string; label: string; icon: typeof LayoutDashboard; demo?: boolean }[];
