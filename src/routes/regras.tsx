import { createFileRoute } from "@tanstack/react-router";
import { RulesWorkspace } from "@/components/rules/RulesWorkspace";

export const Route=createFileRoute("/regras")({
  head:()=>({meta:[
    {title:"Regras & histórico — MN Patrimônios"},
    {name:"description",content:"Central de horários, regras operacionais e histórico demonstrativo do MN Patrimônios."},
      { property: "og:title", content: "Regras & histórico — MN Patrimônios" },
      { property: "og:description", content: "Central de horários, regras operacionais e histórico demonstrativo do MN Patrimônios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component:RulesWorkspace,
});
