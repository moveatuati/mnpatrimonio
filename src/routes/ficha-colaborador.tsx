import { createFileRoute } from "@tanstack/react-router";
import { EmployeePrintableSheet } from "@/components/employees/EmployeePrintableSheet";
import { isValidReferenceDate } from "@/domain/operation-query";

export const Route = createFileRoute("/ficha-colaborador")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : "",
    date:
      typeof search["date"] === "string" && isValidReferenceDate(search["date"])
        ? search["date"]
        : "2026-10-20",
  }),
  head: () => ({ meta: [
    { title: "Ficha individual A4 — MN Patrimônios | Gestão de Pessoas" },
    { name: "description", content: "Ficha e histórico mensal fictício de colaborador para impressão A4." },
      { property: "og:title", content: "Ficha individual A4 — MN Patrimônios | Gestão de Pessoas" },
      { property: "og:description", content: "Ficha e histórico mensal fictício de colaborador para impressão A4." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: EmployeePrintableRoute,
});

function EmployeePrintableRoute() {
  const { id, date } = Route.useSearch();
  return <EmployeePrintableSheet employeeId={id} date={date} />;
}
