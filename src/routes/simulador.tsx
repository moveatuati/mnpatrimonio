import { createFileRoute } from "@tanstack/react-router";
import { FiveTwoWorkspace } from "@/components/simulator/FiveTwoWorkspace";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador 5×2 · EC 141/2026 — Formosa | Augusto Montenegro" },
      { name: "description", content: "Estudo de quatro semanas: folgas, jornadas, reforços, cobertura e transição da escala 6×1 para 5×2." },
    ],
  }),
  component: FiveTwoWorkspace,
});
