import { createFileRoute } from "@tanstack/react-router";
import { OperationDashboard } from "@/components/dashboard/OperationDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão da operação — Formosa | Augusto Montenegro" },
      {
        name: "description",
        content:
          "Visão gerencial demonstrativa de equipes, entradas e pendências da Formosa, unidade Augusto Montenegro.",
      },
      { property: "og:title", content: "Visão da operação — Formosa | Augusto Montenegro" },
      { property: "og:description", content: "Visão gerencial demonstrativa de equipes, entradas e pendências da Formosa, unidade Augusto Montenegro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationDashboard,
});
