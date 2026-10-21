import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScheduleWorkspace } from "./ScheduleWorkspace";
beforeEach(()=>window.localStorage.clear());
afterEach(cleanup);

describe("Escala & trocas — interface demonstrativa",()=>{
  it("substitui placeholder por semana, tabela com todos os funcionários e filtros",()=>{
    render(<ScheduleWorkspace/>);
    expect(screen.getByRole("heading",{name:/Escala.*trocas/i})).toBeInTheDocument();
    expect(screen.getByRole("navigation",{name:"Áreas de escalas e trocas"})).toBeInTheDocument();
    const table=screen.getByRole("region",{name:"Tabela de escala com rolagem vertical"});
    expect(within(table).getAllByRole("row")).toHaveLength(64);
    fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador"}),{target:{value:"MN-001"}});
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(screen.queryByRole("button",{name:"Próxima página"})).not.toBeInTheDocument();
  });
  it("mantém solicitação pendente antes de aprovar, e conserva histórico",()=>{
    render(<ScheduleWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:/Trocas & autorização/}));
    fireEvent.change(screen.getByLabelText("Colaborador de origem"),{target:{value:"MN-001"}});
    fireEvent.change(screen.getByLabelText("Colega / destino"),{target:{value:"MN-005"}});
    fireEvent.change(screen.getByLabelText("Motivo informado (obrigatório)"),
      {target:{value:"Compromisso pessoal previamente informado"}});
    fireEvent.click(screen.getByRole("button",{name:"Solicitar troca"}));
    expect(screen.getByText(/A escala NÃO foi alterada/)).toBeInTheDocument();
    expect(screen.getByText("1 pendente(s)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/Aprovar e aplicar/}));
    expect(screen.getByText(/Troca aprovada na demonstração/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Histórico"}));
    expect(screen.getByText(/Troca aprovada e aplicada/)).toBeInTheDocument();
  });
});
