import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {FiveTwoWorkspace} from "./FiveTwoWorkspace";
beforeEach(()=>window.localStorage.clear());
afterEach(()=>cleanup());
describe("Simulador 5×2 · tela",()=>{
 it("apresenta lei, cenários e diagnóstico",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByRole("heading",{name:/Simulador 5×2/})).toBeInTheDocument();
   expect(screen.getByText(/EC 141\/2026 PROMULGADA/)).toBeInTheDocument();
   expect(screen.getByRole("button",{name:/Reforço · 76 pessoas/})).toBeInTheDocument();
   expect(screen.getByRole("heading",{name:/Quanto pessoal seria necessário/})).toBeInTheDocument();
 });
 it("simula quadro original sem salvar escala operacional",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Atual · 63 pessoas/}));
   expect(screen.getByText("63 atuais + 0 hipotéticos")).toBeInTheDocument();
 });
 it("mostra escala individual com 76 colaboradores e filtra por matrícula",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Escala por pessoa/}));
   const table=screen.getByRole("region",{name:"Escala individual semanal"});
   expect(within(table).getAllByRole("row")).toHaveLength(77);
   fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador do simulador"}),
     {target:{value:"FM-001"}});
   expect(within(table).getAllByRole("row")).toHaveLength(2);
 });
 it("não gera escala com início fora de segunda",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.change(screen.getByLabelText("Início da simulação"),{target:{value:"2026-12-22"}});
   expect(screen.getByRole("alert")).toHaveTextContent(/segunda-feira/);
   expect(screen.getByRole("button",{name:"Exportar simulação"})).toBeDisabled();
 });
 it("exibe roteiro e fonte oficial da EC 141",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Guia de implementação/}));
   expect(screen.getByRole("heading",{name:"Roteiro de transição segura"})).toBeInTheDocument();
   expect(screen.getByRole("link",{name:/Emenda Constitucional 141/})).toHaveAttribute(
     "href","https://www.presidencia.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm");
 });
});
