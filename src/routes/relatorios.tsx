import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Relatórios';
const DESC = 'Relatórios semanais, mensais e personalizados com impressão A4 e PDF.';

export const Route = createFileRoute("/relatorios")({
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
  component: RelatoriosPage,
});

function RelatoriosPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 3' items={['Escalas, folgas, domingos e feriados', 'Trocas, entradas, atrasos e ranking de pontualidade', 'Férias, afastamentos e banco de horas', 'Cobertura dos grupos e déficits', 'Comparação 6×1 x 5×2', 'Cabeçalho institucional e paginação A4']} />;
}
