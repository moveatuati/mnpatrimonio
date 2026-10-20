import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CollaboratorsDirectory } from "./CollaboratorsDirectory";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";

afterEach(cleanup);

describe("Colaboradores - consulta demonstrativa", () => {
  it("exibe os 63 colaboradores em três grupos e não usa o placeholder antigo", () => {
    render(<CollaboratorsDirectory />);
    expect(screen.getByRole("heading", { name: "Colaboradores." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quadro completo/ })).toHaveTextContent("63");
    expect(screen.getByRole("button", { name: /Grupo A/ })).toHaveTextContent("4");
    expect(screen.getByRole("button", { name: /Grupo B/ })).toHaveTextContent("29");
    expect(screen.getByRole("button", { name: /Grupo C/ })).toHaveTextContent("30");
    expect(screen.getByText("1–12 de 63")).toBeInTheDocument();
    expect(screen.queryByText("O que este módulo vai oferecer")).not.toBeInTheDocument();
  });
  it("filtra por grupo e matrícula, com estado vazio e limpeza", () => {
    render(<CollaboratorsDirectory />);
    fireEvent.click(screen.getByRole("button", { name: /Grupo B/ }));
    expect(screen.getByText("1–12 de 29")).toBeInTheDocument();
    const employee = DEMO_EMPLOYEES.find(e => e.group === "B")!;
    const input = screen.getByRole("searchbox", { name: "Buscar por nome ou código" });
    fireEvent.change(input, { target: { value: employee.id } });
    expect(screen.getByText("1–1 de 1")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText(employee.name)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "nenhum-nome-encontrado" } });
    expect(screen.getByText("Nenhum colaborador encontrado")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]!);
    expect(screen.getByText("1–12 de 63")).toBeInTheDocument();
  });
  it("abre ficha individual sem inventar informações de admissão ou banco de horas", () => {
    render(<CollaboratorsDirectory />);
    const button = within(screen.getByRole("table")).getAllByRole("button", { name: /^Ver ficha de/ })[0]!;
    const name = button.getAttribute("aria-label")!.replace("Ver ficha de ", "");
    const employee = DEMO_EMPLOYEES.find(e => e.name === name)!;
    fireEvent.click(button);
    const dialog = screen.getByRole("dialog", { name });
    expect(dialog).toHaveTextContent(employee.id);
    expect(dialog).toHaveTextContent("Não informada");
    expect(dialog).toHaveTextContent("Não implantado");
    expect(dialog).toHaveTextContent("Últimas cinco datas simuladas");
    expect(dialog).toHaveTextContent("Nenhuma alteração de cadastro");
  });
  it("mantém consulta quando a data informada é inválida", () => {
    render(<CollaboratorsDirectory />);
    const date = screen.getByLabelText("Data de referência");
    fireEvent.change(date, { target: { value: "2026-02-30" } });
    expect(date).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Mantendo 20/10/2026");
    expect(screen.getByText("1–12 de 63")).toBeInTheDocument();
  });
});
