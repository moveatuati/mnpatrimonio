import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {FiveTwoWorkspace} from "./FiveTwoWorkspace";
beforeEach(()=>window.localStorage.clear());
afterEach(()=>cleanup());
describe("Simulador 5×2 · equipe integrada e projeção 83",()=>{
 it("apresenta 83 e crescimento de 31,7% sem déficit artificial",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByRole("heading",{name:/Simulador 5×2/})).toBeInTheDocument();
   expect(screen.getByRole("button",{name:/Projeção ideal · 83 pessoas/})).toBeInTheDocument();
   expect(screen.getByText("31,7%")).toBeInTheDocument();
   expect(screen.getByText("+20")).toBeInTheDocument();
   expect(screen.queryByText(/Piso teórico/)).not.toBeInTheDocument();
   expect(screen.queryByText(/Postos-dia descobertos/)).not.toBeInTheDocument();
   expect(screen.queryByText(/Diferença entre cenários/)).not.toBeInTheDocument();
 });
 it("explica a referência de 63 e evita prometer 100% no 5×2",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByText(/Validação pendente:/)).toBeInTheDocument();
   expect(screen.getByText(/83 é uma projeção, não cobertura certificada/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole("button",{name:"Entender: Projeção de 83"}));
   expect(screen.getByRole("dialog",{name:"Projeção de 83"})).toHaveTextContent("31,7%");
 });
 it("aplica cenário 63 e recupera projeção A6/B38/C39",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Atual · 63 pessoas/}));
   expect(screen.getByText("0,0%")).toBeInTheDocument();
   expect(screen.getByText("315")).toBeInTheDocument();
   fireEvent.click(screen.getByRole("button",{name:/Projeção ideal · 83 pessoas/}));
   expect(screen.getByText("6 pessoas")).toBeInTheDocument();
   expect(screen.getByText("38 pessoas")).toBeInTheDocument();
   expect(screen.getByText("39 pessoas")).toBeInTheDocument();
 });
 it("escala individual mostra 83 pessoas com sábado escalado",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Escala por pessoa/}));
   const table=screen.getByRole("region",{name:"Escala individual semanal"});
   const rows=within(table).getAllByRole("row");
   expect(rows).toHaveLength(84);
   for(const row of rows.slice(1))
     expect(within(row).getAllByRole("cell")[7]).toHaveTextContent("Trabalha");
   fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador do simulador"}),
     {target:{value:"FM-001"}});
   expect(within(table).getAllByRole("row")).toHaveLength(2);
 });
 it("painel exibe presença, não déficits por grupo",()=>{
   render(<FiveTwoWorkspace/>);
   const table=screen.getByRole("region",{name:"Detalhes diários de presença"});
   expect(within(table).getAllByRole("columnheader")).toHaveLength(5);
   expect(screen.getByRole("button",{name:"Entender: Crescimento percentual"})).toBeInTheDocument();
   expect(screen.queryByRole("region",{name:"Detalhes diários de cobertura"})).not.toBeInTheDocument();
 });
 it("bloqueia data não iniciada em segunda e mantém o roteiro",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.change(screen.getByLabelText("Início da simulação"),{target:{value:"2026-12-22"}});
   expect(screen.getByRole("alert")).toHaveTextContent(/segunda-feira/);
   expect(screen.getByRole("button",{name:"Exportar simulação"})).toBeDisabled();
   fireEvent.click(screen.getByRole("button",{name:/Guia de implementação/}));
   expect(screen.getByRole("heading",{name:"Roteiro de transição segura"})).toBeInTheDocument();
 });
});
