import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Férias & afastamentos';
const DESC = 'Controle de períodos de ausência e seus impactos na cobertura.';

export const Route = createFileRoute("/ferias")({
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
  component: FeriasPage,
});

function FeriasPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 3' items={['Período, tipo e observação', 'Responsável e histórico', 'Alteração ou cancelamento', 'Alertas de déficit de cobertura']} />;
}
