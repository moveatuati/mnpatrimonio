import { createFileRoute } from "@tanstack/react-router";
import { AbsenceWorkspace } from "@/components/absences/AbsenceWorkspace";

export const Route = createFileRoute("/ferias")({
  head: () => ({
    meta: [
      { title: "Férias & afastamentos — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Controle demonstrativo de férias, afastamentos, retorno previsto e cobertura de equipe." },
      { property: "og:title", content: "Férias & afastamentos — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Controle demonstrativo de férias, afastamentos, retorno previsto e cobertura de equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AbsenceWorkspace,
});
