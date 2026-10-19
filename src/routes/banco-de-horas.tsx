import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

const TITLE = 'Banco de horas';
const DESC = 'Movimentações demonstrativas de horas positivas e negativas.';

export const Route = createFileRoute("/banco-de-horas")({
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
  component: BancoDeHorasPage,
});

function BancoDeHorasPage() {
  return <ModulePlaceholder title={TITLE} subtitle={DESC} stage='Etapa 3' items={['Lançamentos com justificativa e responsável', 'Saldo acumulado por colaborador', 'Sem compensações automáticas sem regra aprovada']} />;
}
