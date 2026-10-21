import { createFileRoute } from "@tanstack/react-router";
import { MobileManagerApp } from "@/components/manager/ManagerApp";

/** Modo celular do app do gerente: tela cheia, sem o menu do sistema. */
export const Route = createFileRoute("/celular")({
  head: () => ({
    meta: [
      { title: "MN Patrimônios · App do gerente" },
      { name: "description", content: "Demonstração do aplicativo do gerente da MN Patrimônios no celular." },
      { name: "theme-color", content: "#2b4b6b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "MN Patrimônios" },
    ],
    links: [
      { rel: "manifest", href: "/gerente.webmanifest" },
      { rel: "apple-touch-icon", href: "/mn-apple-touch.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/mn-app-192.png" },
    ],
  }),
  component: MobileManagerApp,
});
