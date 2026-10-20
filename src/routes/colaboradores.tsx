import { createFileRoute } from "@tanstack/react-router";
import { CollaboratorsDirectory } from "@/components/employees/CollaboratorsDirectory";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({ meta: [
    { title: "Colaboradores — Formosa | Augusto Montenegro" },
    { name: "description", content: "Quadro fictício de colaboradores por grupo e jornada-base." },
  ] }),
  component: CollaboratorsDirectory,
});
