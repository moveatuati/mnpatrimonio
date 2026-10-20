import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CollaboratorsDirectory } from "./CollaboratorsDirectory";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";

afterEach(cleanup);

describe("Colaboradores - consulta demonstrativa", () => {
  it("exibe o quadro inteiro com rolagem vertical, título de colunas e filtros", () => {
    render(<CollaboratorsDirectory />);
    const region = screen.getByRole("region", { name: /Tabela de colaboradores com rolagem vertical/ });
    expect(region).toHaveClass("rh-directory-scroll");
    expect(within(region).getAllByRole("row")).toHaveLength(64);
    expect(screen.queryByRole("button", { name: "Próxima página" })).not.toBeInTheDocument();

    region.scrollTop = 210;
    fireEvent.click(screen.getByRole("button", { name: /Grupo B/ }));
    expect(region.scrollTop).toBe(0);
    expect(within(region).getAllByRole("row")).toHaveLength(30);

    region.scrollTop = 170;
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar por nome ou código" }), {
      target: { value: "FM-005" },
    });
    expect(region.scrollTop).toBe(0);
    expect(within(region).getAllByRole("row")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]!);
    expect(within(region).getAllByRole("row")).toHaveLength(64);
  });

  it("exibe os 63 colaboradores em três grupos e não usa o placeholder antigo", () => {
    render(<CollaboratorsDirectory />);
    expect(screen.getByRole("heading", { name: "Colaboradores." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quadro completo/ })).toHaveTextContent("63");
    expect(screen.getByRole("button", { name: /Grupo A/ })).toHaveTextContent("4");
    expect(screen.getByRole("button", { name: /Grupo B/ })).toHaveTextContent("29");
    expect(screen.getByRole("button", { name: /Grupo C/ })).toHaveTextContent("30");
    expect(screen.getByText("63 colaboradores na lista · role para consultar todos")).toBeInTheDocument();
    expect(screen.queryByText("O que este módulo vai oferecer")).not.toBeInTheDocument();
  });
  it("filtra por grupo e matrícula, com estado vazio e limpeza", () => {
    render(<CollaboratorsDirectory />);
    fireEvent.click(screen.getByRole("button", { name: /Grupo B/ }));
    expect(screen.getByText("29 colaboradores na lista · role para consultar todos")).toBeInTheDocument();
    const employee = DEMO_EMPLOYEES.find(e => e.group === "B")!;
    const input = screen.getByRole("searchbox", { name: "Buscar por nome ou código" });
    fireEvent.change(input, { target: { value: employee.id } });
    expect(screen.getByText("1 colaborador na lista · role para consultar todos")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText(employee.name)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "nenhum-nome-encontrado" } });
    expect(screen.getByText("Nenhum colaborador encontrado")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]!);
    expect(screen.getByText("63 colaboradores na lista · role para consultar todos")).toBeInTheDocument();
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
    expect(screen.getByText("63 colaboradores na lista · role para consultar todos")).toBeInTheDocument();
  });
});
