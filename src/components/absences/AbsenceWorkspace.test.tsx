import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AbsenceWorkspace } from "./AbsenceWorkspace";
beforeEach(()=>{
  window.localStorage.clear();
  vi.spyOn(window,"confirm").mockReturnValue(true);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Férias e afastamentos — painel demonstrativo",()=>{
  it("exibe indicadores, cobertura dos grupos e tabela contínua com filtro",()=>{
    render(<AbsenceWorkspace/>);
    expect(screen.getByRole("heading",{name:/Férias.*afastamentos/})).toBeInTheDocument();
    const table=screen.getByRole("region",{name:"Tabela de ausências com rolagem vertical"});
    expect(within(table).getAllByRole("row")).toHaveLength(8);
    fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador ou matrícula"}),
      {target:{value:"FM-006"}});
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(screen.queryByRole("button",{name:"Próxima página"})).not.toBeInTheDocument();
  });
  it("cria solicitação pendente sem descontar cobertura antes da decisão",()=>{
    render(<AbsenceWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Cadastrar pedido"}));
    fireEvent.change(screen.getByRole("combobox",{name:"Colaborador"}),{target:{value:"FM-002"}});
    fireEvent.change(screen.getByRole("combobox",{name:"Tipo da ausência"}),{target:{value:"atestado"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Observação administrativa"}),{target:{value:"Registro operacional genérico"}});
    fireEvent.click(screen.getByRole("button",{name:"Registrar pedido"}));
    expect(screen.getByText(/Pedido enviado para análise/)).toBeInTheDocument();
    expect(screen.getByRole("heading",{name:"Pedidos pendentes e cancelamentos"})).toBeInTheDocument();
  });
  it("restaura registros fictícios mediante confirmação explícita",()=>{
    render(<AbsenceWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Histórico"}));
    fireEvent.click(screen.getByRole("checkbox",{name:/Confirmo que quero restaurar/}));
    fireEvent.click(screen.getByRole("button",{name:"Restaurar demonstração"}));
    expect(screen.getByText(/Registros de demonstração restaurados/)).toBeInTheDocument();
  });
});
