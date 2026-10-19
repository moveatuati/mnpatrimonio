import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Ponto simulado';
const DESC = 'Registros fictícios de entrada, intervalo, retorno e saída. Não constitui registro oficial de ponto.';

export const Route = createFileRoute("/ponto")({
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
  component: PontoPage,
});

function PontoPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 3' items={['Entrada, saída e retorno do intervalo, saída final', 'Comparação previsto x registrado', 'Alerta operacional configurável (padrão 10 min)', 'Ausências, saídas antecipadas e inconsistências']} />;
}
