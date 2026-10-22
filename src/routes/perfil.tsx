import { createFileRoute } from "@tanstack/react-router";
import { CandidateProfilePage } from "@/components/candidates/CandidateProfilePage";

/** Link público do teste de perfil (celular do candidato): tela cheia, sem o menu do sistema. */
export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Teste de perfil — MN Patrimônios" },
      { name: "description", content: "Responda o teste rápido de perfil da MN Patrimônios pelo celular." },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#2b4b6b" },
      { property: "og:title", content: "Teste de perfil — MN Patrimônios" },
      { property: "og:description", content: "Responda o teste rápido de perfil da MN Patrimônios pelo celular." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CandidateProfilePage,
});
