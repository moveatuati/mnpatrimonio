import { createFileRoute } from "@tanstack/react-router";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";

export const Route = createFileRoute("/escala")({
  head: () => ({
    meta: [
      { title: "Escala & trocas — MN Patrimônios | Augusto Montenegro" },
      { name: "description", content: "Escalas, revezamento de domingos, feriados e trocas com validação demonstrativa de descanso e cobertura." },
      { property: "og:title", content: "Escala & trocas — MN Patrimônios | Augusto Montenegro" },
      { property: "og:description", content: "Escalas, revezamento de domingos, feriados e trocas com validação demonstrativa de descanso e cobertura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScheduleWorkspace,
});
