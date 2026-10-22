import { createFileRoute } from "@tanstack/react-router";
import { CandidateDocsPage } from "@/components/candidates/CandidateDocsPage";

/** Link público para o candidato aprovado enviar documentos pelo celular: tela cheia, sem o menu do sistema. */
export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Envio de documentos — MN Patrimônios" },
      { name: "description", content: "Envie seus documentos para a contratação na MN Patrimônios pelo celular." },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#2b4b6b" },
      { property: "og:title", content: "Envio de documentos — MN Patrimônios" },
      { property: "og:description", content: "Envie seus documentos para a contratação na MN Patrimônios pelo celular." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CandidateDocsPage,
});
