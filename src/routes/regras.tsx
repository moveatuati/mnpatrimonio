import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Regras & histórico';
const DESC = 'Parâmetros operacionais e histórico de decisões do projeto.';

export const Route = createFileRoute("/regras")({
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
  component: RegrasPage,
});

function RegrasPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 2' items={['Descanso mínimo de 11h entre jornadas', 'Horários-base dos grupos A, B e C', 'Turnos de domingo: 08h–14h15, 09h–15h15, 15h15–21h30', 'Alerta de atraso configurável', 'Histórico de alterações e trocas']} />;
}
