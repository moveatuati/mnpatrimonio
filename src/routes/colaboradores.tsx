import { createFileRoute } from "@tanstack/react-router";
import { CollaboratorsDirectory } from "@/components/employees/CollaboratorsDirectory";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({ meta: [
    { title: "Colaboradores — Formosa | Augusto Montenegro" },
    { name: "description", content: "Quadro fictício de colaboradores por grupo e jornada-base." },
      { property: "og:title", content: "Colaboradores — Formosa | Augusto Montenegro" },
      { property: "og:description", content: "Quadro fictício de colaboradores por grupo e jornada-base." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CollaboratorsDirectory,
});
