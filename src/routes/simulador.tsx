import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Simulador 5×2';
const DESC = 'Estudo de migração para 5×2 (hipótese para dezembro de 2026, não aprovada). Separado da escala real.';

export const Route = createFileRoute("/simulador")({
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
  component: SimuladorPage,
});

function SimuladorPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 4' items={['Atual 6×1 com 63 colaboradores', '5×2 com 63 colaboradores', '5×2 com 76 colaboradores (hipótese, +13)', 'Cenários personalizados com quantidades editáveis', 'Folgas não consecutivas, sábados trabalhados, máx. 5 dias seguidos', 'Explicação de inviabilidades em vez de escala artificial']} />;
}
