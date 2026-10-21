import { createFileRoute } from "@tanstack/react-router";
import { CandidateInterviewPage } from "@/components/candidates/CandidateInterviewPage";

/** Link público que o candidato abre no celular: tela cheia, sem o menu do sistema. */
export const Route = createFileRoute("/entrevista")({
  head: () => ({
    meta: [
      { title: "Entrevista de candidato — MN Patrimônios" },
      { name: "description", content: "Responda a entrevista de candidato da MN Patrimônios pelo celular." },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#2b4b6b" },
      { property: "og:title", content: "Entrevista de candidato — MN Patrimônios" },
      { property: "og:description", content: "Responda a entrevista pelo celular. São 10 perguntas rápidas." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CandidateInterviewPage,
});
