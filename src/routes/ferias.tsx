import { createFileRoute } from "@tanstack/react-router";
import { AbsenceWorkspace } from "@/components/absences/AbsenceWorkspace";

export const Route = createFileRoute("/ferias")({
  head: () => ({
    meta: [
      { title: "Férias & afastamentos — Formosa | Augusto Montenegro" },
      { name: "description", content: "Controle demonstrativo de férias, afastamentos, retorno previsto e cobertura de equipe." },
    ],
  }),
  component: AbsenceWorkspace,
});
