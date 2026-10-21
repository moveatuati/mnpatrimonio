import { createFileRoute } from "@tanstack/react-router";
import { OperationDashboard } from "@/components/dashboard/OperationDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão da operação — MN Patrimônios | Condomínio Ananinville" },
      {
        name: "description",
        content:
          "Visão gerencial demonstrativa de equipes, entradas e pendências da MN Patrimônios, Condomínio Ananinville.",
      },
      { property: "og:title", content: "Visão da operação — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Visão gerencial demonstrativa de equipes, entradas e pendências da MN Patrimônios, Condomínio Ananinville." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationDashboard,
});
