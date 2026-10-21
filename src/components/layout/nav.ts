import {
  LayoutDashboard, Users, CalendarClock, Fingerprint, Plane, Hourglass, FileText, FlaskConical, ScrollText, Smartphone,
} from "lucide-react";

export const NAV = [
  { to: "/", label: "Visão da operação", icon: LayoutDashboard },
  { to: "/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/escala", label: "Escala & trocas", icon: CalendarClock },
  { to: "/ponto", label: "Ponto simulado", icon: Fingerprint },
  { to: "/ferias", label: "Férias & afastamentos", icon: Plane },
  { to: "/banco-de-horas", label: "Banco de horas", icon: Hourglass },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/simulador", label: "Simulador 5×2", icon: FlaskConical },
  { to: "/regras", label: "Regras & histórico", icon: ScrollText },
  { to: "/app-gerente", label: "App do gerente (prévia)", icon: Smartphone },
] as const;
