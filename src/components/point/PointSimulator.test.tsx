import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PointSimulator } from "./PointSimulator";
beforeEach(()=>{
  window.localStorage.clear();
  vi.spyOn(window,"confirm").mockReturnValue(true);
  vi.spyOn(window,"scrollTo").mockImplementation(()=>undefined);
});
afterEach(()=>{ cleanup();vi.restoreAllMocks(); });
describe("Ponto simulado - quatro marcações manuais",()=>{
  it("abre relógio e tabela completa sem paginação",()=>{
    render(<PointSimulator/>);
    expect(screen.getByRole("heading",{name:/Ponto simulado/})).toBeInTheDocument();
    const table=screen.getByRole("region",{name:"Tabela com rolagem vertical do ponto simulado"});
    expect(within(table).getAllByRole("row")).toHaveLength(64);
    expect(screen.queryByRole("button",{name:"Próxima página"})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox",{name:"Buscar nome ou matrícula"}),
      {target:{value:"MN-001"}});
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });
  it("grava sequência de entrada e intervalo e registra justificativa em correção",()=>{
    render(<PointSimulator/>);
    fireEvent.click(screen.getByRole("button",{name:"Registrar marcação simulada"}));
    expect(screen.getByText(/Marcação demonstrativa registrada: Entrada/)).toBeInTheDocument();
    expect(screen.getByText("Saída para intervalo", { selector: ".fp-active-step strong" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Corrigir Entrada"}));
    fireEvent.change(screen.getByRole("textbox",{name:"Justificativa da correção (obrigatória)"}),
      {target:{value:"Demonstração de ajuste autorizado"}});
    fireEvent.change(screen.getByLabelText("Horário da marcação"),{target:{value:"07:14"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar correção"}));
    expect(screen.getByText(/Correção demonstrativa registrada/)).toBeInTheDocument();
  });
  it("gera amostra completa preservando a possibilidade de limpar apenas a data",()=>{
    render(<PointSimulator/>);
    fireEvent.click(screen.getByRole("button",{name:"Gerar amostra do dia"}));
    expect(screen.getByText(/Amostra fictícia gerada/)).toBeInTheDocument();
    expect(screen.getByText("21 colaboradores na lista · rolagem vertical sem paginação")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Limpar data"}));
    expect(screen.getByText(/Registros da data removidos/)).toBeInTheDocument();
  });
});
