import { createFileRoute } from "@tanstack/react-router";
import { HourBankWorkspace } from "@/components/hours/HourBankWorkspace";

export const Route = createFileRoute("/banco-de-horas")({
  head: () => ({
    meta: [
      { title: "Banco de horas — Formosa | Augusto Montenegro" },
      { name: "description", content: "Créditos e débitos demonstrativos com autorização, saldo individual, estorno e extrato." },
    ],
  }),
  component: HourBankWorkspace,
});
