import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HourBankWorkspace } from "./HourBankWorkspace";
beforeEach(()=>{
  window.localStorage.clear();
  vi.spyOn(window,"confirm").mockReturnValue(true);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Banco de horas — operação demonstrativa",()=>{
  it("mostra 63 colaboradores e tabela sem paginação",()=>{
    render(<HourBankWorkspace/>);
    expect(screen.getByRole("heading",{name:/Banco de horas/})).toBeInTheDocument();
    const table=screen.getByRole("region",{name:"Tabela de saldos com rolagem vertical"});
    expect(within(table).getAllByRole("row")).toHaveLength(64);
    fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador"}),{target:{value:"FM-001"}});
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });
  it("registra pendência e contabiliza após a autorização",()=>{
    render(<HourBankWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Novo lançamento"}));
    fireEvent.change(screen.getByRole("combobox",{name:"Tipo de movimentação"}),{target:{value:"debito_ajuste"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Justificativa"}),{
      target:{value:"Ajuste operacional de compensação autorizado"}});
    fireEvent.click(screen.getByRole("button",{name:"Enviar para aprovação"}));
    expect(screen.getByText(/Lançamento enviado para aprovação/)).toBeInTheDocument();
    const approve=screen.getAllByRole("button",{name:"Aprovar e contabilizar"});
    fireEvent.click(approve[approve.length-1]!);
    expect(screen.getByText(/Lançamento aprovado na demonstração/)).toBeInTheDocument();
  });
  it("extrato permite estorno justificado sem apagar lançamentos",()=>{
    render(<HourBankWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Extrato individual"}));
    expect(screen.getByRole("heading",{name:"Saldo detalhado por colaborador"})).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button",{name:"Estornar"})[0]!);
    expect(screen.getByRole("textbox",{name:"Motivo do estorno"})).toBeInTheDocument();
  });
});
