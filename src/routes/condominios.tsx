import { createFileRoute } from "@tanstack/react-router";
import { ClientsWorkspace } from "@/components/clients/ClientsWorkspace";

export const Route = createFileRoute("/condominios")({
  head: () => ({
    meta: [
      { title: "Condomínios & funções — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Cadastro dos condomínios atendidos e das funções das vagas (agente de portaria, serviços gerais)." },
      { property: "og:title", content: "Condomínios & funções — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Cadastro dos condomínios atendidos e das funções das vagas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsWorkspace,
});
