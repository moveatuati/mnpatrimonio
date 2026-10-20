import { createFileRoute } from "@tanstack/react-router";
import { HourBankWorkspace } from "@/components/hours/HourBankWorkspace";

export const Route = createFileRoute("/banco-de-horas")({
  head: () => ({
    meta: [
      { title: "Banco de horas — Formosa | Augusto Montenegro" },
      { name: "description", content: "Créditos e débitos demonstrativos com autorização, saldo individual, estorno e extrato." },
      { property: "og:title", content: "Banco de horas — Formosa | Augusto Montenegro" },
      { property: "og:description", content: "Créditos e débitos demonstrativos com autorização, saldo individual, estorno e extrato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HourBankWorkspace,
});
