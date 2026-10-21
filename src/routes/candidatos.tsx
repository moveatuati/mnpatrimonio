import { createFileRoute } from "@tanstack/react-router";
import { CandidatesWorkspace } from "@/components/candidates/CandidatesWorkspace";

export const Route = createFileRoute("/candidatos")({
  head: () => ({
    meta: [
      { title: "Captação de candidatos — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Entrevista de candidatos, parecer e ficha de emprego para aprovados." },
      { property: "og:title", content: "Captação de candidatos — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Entrevista de candidatos, parecer e ficha de emprego para aprovados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CandidatesWorkspace,
});
