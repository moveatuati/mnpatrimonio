import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Colaboradores';
const DESC = 'Cadastro dos 63 colaboradores fictícios, com pesquisa, filtros e consulta individual.';

export const Route = createFileRoute("/colaboradores")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Rh Formosa Augusto Montenegro` },
      { name: "description", content: DESC },
      { property: "og:title", content: `${TITLE} — Rh Formosa Augusto Montenegro` },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 3' items={['Pesquisa, filtros, ordenação e edição', 'Grupo operacional e horário-base', 'Situação cadastral e admissão', 'Histórico de escalas, trocas, ponto e folgas', 'Férias, afastamentos e banco de horas', 'Campos adicionais configuráveis']} />;
}
