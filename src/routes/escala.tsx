import { createFileRoute } from "@tanstack/react-router";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";

export const Route = createFileRoute("/escala")({
  head: () => ({
    meta: [
      { title: "Escala & trocas — Formosa | Augusto Montenegro" },
      { name: "description", content: "Escalas, revezamento de domingos, feriados e trocas com validação demonstrativa de descanso e cobertura." },
    ],
  }),
  component: ScheduleWorkspace,
});
