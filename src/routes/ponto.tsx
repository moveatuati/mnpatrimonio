import { createFileRoute } from "@tanstack/react-router";
import { PointSimulator } from "@/components/point/PointSimulator";

export const Route = createFileRoute("/ponto")({
  head: () => ({
    meta: [
      { title: "Ponto simulado — MN Patrimônios | Augusto Montenegro" },
      { name: "description", content: "Demonstração de entrada, saída para intervalo, retorno e saída final, sem registro oficial de ponto." },
      { property: "og:title", content: "Ponto simulado — MN Patrimônios | Augusto Montenegro" },
      { property: "og:description", content: "Demonstração de entrada, saída para intervalo, retorno e saída final, sem registro oficial de ponto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PointSimulator,
});
