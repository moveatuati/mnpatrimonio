import { createFileRoute } from "@tanstack/react-router";
import { FiveTwoWorkspace } from "@/components/simulator/FiveTwoWorkspace";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador 5×2 · EC 141/2026 — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Estudo de quatro semanas: folgas, jornadas, reforços, cobertura e transição da escala 6×1 para 5×2." },
      { property: "og:title", content: "Simulador 5×2 · EC 141/2026 — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Estudo de quatro semanas: folgas, jornadas, reforços, cobertura e transição da escala 6×1 para 5×2." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FiveTwoWorkspace,
});
