import { createFileRoute } from "@tanstack/react-router";
import { RulesWorkspace } from "@/components/rules/RulesWorkspace";

export const Route=createFileRoute("/regras")({
  head:()=>({meta:[
    {title:"Regras & histórico — RH Formosa"},
    {name:"description",content:"Central de horários, regras operacionais e histórico demonstrativo do RH Formosa."},
  ]}),
  component:RulesWorkspace,
});
