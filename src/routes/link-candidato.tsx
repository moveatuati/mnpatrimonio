import { createFileRoute } from "@tanstack/react-router";
import { CandidateLinkPreview } from "@/components/candidates/CandidateLinkPreview";

/** Prévia provisória: como o candidato preenche cada etapa no celular, com explicação. */
export const Route = createFileRoute("/link-candidato")({
  head: () => ({
    meta: [
      { title: "Link do candidato (prévia) — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Veja como o candidato responde o perfil, a entrevista e envia documentos pelo celular." },
      { property: "og:title", content: "Link do candidato (prévia) — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Veja como o candidato responde o perfil, a entrevista e envia documentos pelo celular." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CandidateLinkPreview,
});
