import { createFileRoute } from "@tanstack/react-router";
import { MobileManagerApp } from "@/components/manager/ManagerApp";

/** Modo celular do app do gerente: tela cheia, sem o menu do sistema. */
export const Route = createFileRoute("/celular")({
  head: () => ({
    meta: [
      { title: "Formosa · App do gerente" },
      { name: "description", content: "Demonstração do aplicativo do gerente da Formosa no celular." },
      { name: "theme-color", content: "#7a2440" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Formosa Gerente" },
    ],
  }),
  component: MobileManagerApp,
});
