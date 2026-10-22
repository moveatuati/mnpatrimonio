import {
  LayoutDashboard, Users, CalendarClock, Fingerprint, Plane, Hourglass, FileText, FlaskConical, ScrollText, Smartphone, UserPlus, Building2, MonitorSmartphone,
} from "lucide-react";

export const NAV = [
  { to: "/", label: "Visão da operação", icon: LayoutDashboard },
  { to: "/condominios", label: "Condomínios & funções", icon: Building2 },
  { to: "/candidatos", label: "Captação de candidatos", icon: UserPlus },
  { to: "/link-candidato", label: "Link do candidato (prévia)", icon: MonitorSmartphone },
  { to: "/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/escala", label: "Escala & trocas", icon: CalendarClock },
  { to: "/ponto", label: "Ponto simulado", icon: Fingerprint },
  { to: "/ferias", label: "Férias & afastamentos", icon: Plane },
  { to: "/banco-de-horas", label: "Banco de horas", icon: Hourglass },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/simulador", label: "Simulador 5×2", icon: FlaskConical },
  { to: "/regras", label: "Regras & histórico", icon: ScrollText },
  { to: "/app-gerente", label: "App do supervisor (prévia)", icon: Smartphone },
] as const;
