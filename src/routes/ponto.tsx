import { createFileRoute } from "@tanstack/react-router";
import { PointSimulator } from "@/components/point/PointSimulator";

export const Route = createFileRoute("/ponto")({
  head: () => ({
    meta: [
      { title: "Ponto simulado — Formosa | Augusto Montenegro" },
      { name: "description", content: "Demonstração de entrada, saída para intervalo, retorno e saída final, sem registro oficial de ponto." },
    ],
  }),
  component: PointSimulator,
});
