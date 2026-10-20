import { createFileRoute } from "@tanstack/react-router";
import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios gerenciais — Formosa | Augusto Montenegro" },
      { name: "description", content: "Relatórios demonstrativos de escala, ponto, cobertura, ausências, banco de horas e 6×1 versus 5×2." },
      { property: "og:title", content: "Relatórios gerenciais — Formosa | Augusto Montenegro" },
      { property: "og:description", content: "Relatórios demonstrativos de escala, ponto, cobertura, ausências, banco de horas e 6×1 versus 5×2." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsWorkspace,
});
