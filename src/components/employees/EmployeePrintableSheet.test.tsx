import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmployeePrintableSheet } from "./EmployeePrintableSheet";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Ficha A4 para impressão", () => {
  it("mostra logo, unidade, colaborador e todos os dias do mês até a referência", () => {
    const employee = DEMO_EMPLOYEES.find(item => item.id === "FM-047")!;
    render(<EmployeePrintableSheet employeeId={employee.id} date="2026-10-20" />);
    expect(screen.getByRole("img", { name: "Formosa" })).toHaveAttribute("src", "/formosa-logo.svg");
    expect(screen.getByText("Unidade Augusto Montenegro · Belém/PA")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: `Ficha A4 de ${employee.name}` })).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(21);
    expect(screen.getByText(/não há confirmação de presença/)).toBeInTheDocument();
    const spy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir / salvar PDF" }));
    expect(spy).toHaveBeenCalledOnce();
  });
  it("não produz relatório para identificador desconhecido", () => {
    render(<EmployeePrintableSheet employeeId="FM-999" date="2026-10-20" />);
    expect(screen.getByRole("heading", { name: "Colaborador não encontrado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir / salvar PDF" })).not.toBeInTheDocument();
  });
});
