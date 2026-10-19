import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Escala & trocas';
const DESC = 'Escala atual 6×1, domingos, feriados, folgas e trocas de horário com validação de descanso.';

export const Route = createFileRoute("/escala")({
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
  component: EscalaPage,
});

function EscalaPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 2' items={['Escala 6×1 de segunda a sábado', 'Revezamento dos domingos (regra parametrizável)', 'Feriados com efetivo ajustável por data', 'Trocas com origem, motivo, autorização e histórico', 'Bloqueio de descanso inferior a 11h', 'Validação de cobertura antes e depois da troca']} />;
}
