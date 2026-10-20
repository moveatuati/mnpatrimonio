import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,within } from "@testing-library/react";
import { ReportsWorkspace } from "./ReportsWorkspace";

beforeEach(()=>{window.localStorage.clear();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("Central de relatórios — Formosa",()=>{
  it("mostra os sete relatórios, período e marca institucional",()=>{
    render(<ReportsWorkspace/>);
    expect(screen.getByRole("heading",{name:/Central de relatórios/})).toBeInTheDocument();
    const nav=screen.getByRole("navigation",{name:"Tipos de relatório"});
    expect(within(nav).getAllByRole("button")).toHaveLength(7);
    expect(screen.getByText(/Relatório gerencial/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:/Imprimir \/ PDF/})).toBeEnabled();
  });
  it("troca demonstrativo e preserva filtros sem perder detalhamento",()=>{
    render(<ReportsWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:/Cobertura operacional/}));
    expect(screen.getByRole("heading",{name:"Cobertura por grupo e data"})).toBeInTheDocument();
    expect(screen.getByText(/Postos-dia necessários/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/Ponto e pontualidade/}));
    expect(screen.getByRole("heading",{name:"Marcações e pontualidade por colaborador e data"})).toBeInTheDocument();
    expect(screen.getByText(/Sem registros do Ponto simulado neste intervalo/)).toBeInTheDocument();
  });
  it("bloqueia intervalo acima de 93 dias sem exportar relatório inválido",()=>{
    render(<ReportsWorkspace/>);
    fireEvent.change(screen.getByLabelText("Início do relatório"),{target:{value:"2026-01-01"}});
    expect(screen.getByRole("alert")).toHaveTextContent(/93 dias/);
    expect(screen.getByRole("button",{name:/Exportar CSV/})).toBeDisabled();
  });
});
