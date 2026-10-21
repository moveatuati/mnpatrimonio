import { createFileRoute } from "@tanstack/react-router";
import { ManagerApp } from "@/components/manager/ManagerApp";

export const Route = createFileRoute("/app-gerente")({
  head: () => ({
    meta: [
      { title: "App do gerente (prévia) — MN Patrimônios | Condomínio Ananinville" },
      { name: "description", content: "Prévia do aplicativo dos gerentes: chegadas por turno, alertas de atraso, banco de horas e envio ao RH." },
      { property: "og:title", content: "App do gerente (prévia) — MN Patrimônios | Condomínio Ananinville" },
      { property: "og:description", content: "Prévia do aplicativo dos gerentes: chegadas por turno, alertas de atraso, banco de horas e envio ao RH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagerApp,
});
