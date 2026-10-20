import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {FiveTwoWorkspace} from "./FiveTwoWorkspace";
import {DEFAULT_SCHEDULE} from "@/domain/schedule";
import {SCHEDULE_STORAGE_KEY} from "@/domain/absences";
beforeEach(()=>window.localStorage.clear());
afterEach(()=>cleanup());
describe("Simulador 5×2 · tela",()=>{
 it("apresenta lei, cenários e diagnóstico",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByRole("heading",{name:/Simulador 5×2/})).toBeInTheDocument();
   expect(screen.getByText(/EC 141\/2026 PROMULGADA/)).toBeInTheDocument();
   expect(screen.getByRole("button",{name:/Ampliação · 78 pessoas/})).toBeInTheDocument();
   expect(screen.getByRole("heading",{name:/Quanto pessoal seria necessário/})).toBeInTheDocument();
 });
 it("simula quadro original sem salvar escala operacional",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Atual · 63 pessoas/}));
   expect(screen.getByText("63 atuais + 0 hipotéticos")).toBeInTheDocument();
 });
 it("explica os cenários por clique e mostra a conta sem recomendar contratações",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:"Entender: Hipótese de ampliação"}));
   expect(screen.getByRole("dialog",{name:"Hipótese de ampliação"})).toHaveTextContent("sem cálculo de suficiência");
   fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});
   expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
   fireEvent.click(screen.getByText("Por que o piso é 91? Ver a conta por grupo"));
   expect(screen.getByRole("region",{name:"Memória de cálculo por grupo"})).toHaveTextContent("580 ÷ 14 → 42");
   expect(screen.getByText(/Não há faixa recomendada de contratação calculada/)).toBeInTheDocument();
   expect(screen.queryByRole("button",{name:/76 pessoas/})).not.toBeInTheDocument();
 });
 it("o botão do piso segue a base e aplica os grupos calculados",()=>{
   const schedule={...DEFAULT_SCHEDULE,rules:{...DEFAULT_SCHEDULE.rules,sunday:{A:4,B:22,C:22}}};
   window.localStorage.setItem(SCHEDULE_STORAGE_KEY,JSON.stringify(schedule));
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Piso teórico · 96 pessoas/}));
   expect(screen.getByText("63 atuais + 33 hipotéticos")).toBeInTheDocument();
   expect(screen.getByText("A 8 · B 44 · C 44")).toBeInTheDocument();
   expect(window.localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(JSON.stringify(schedule));
 });
 it("mostra escala individual com 78 colaboradores e filtra por matrícula",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Escala por pessoa/}));
   const table=screen.getByRole("region",{name:"Escala individual semanal"});
   expect(within(table).getAllByRole("row")).toHaveLength(79);
   fireEvent.change(screen.getByRole("textbox",{name:"Buscar colaborador do simulador"}),
     {target:{value:"FM-001"}});
   expect(within(table).getAllByRole("row")).toHaveLength(2);
 });
 it("mostra as regras fixas e os balões explicativos nos quatro cards",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByText(/Regras obrigatórias da Formosa/)).toBeInTheDocument();
   expect(screen.queryByRole("combobox",{name:"Formato das folgas"})).not.toBeInTheDocument();
   expect(screen.getByRole("button",{name:"Entender: Equipe simulada"})).toBeInTheDocument();
   expect(screen.getByRole("button",{name:"Entender: Cobertura prevista"})).toBeInTheDocument();
   expect(screen.getByRole("button",{name:"Entender: Postos-dia descobertos"})).toBeInTheDocument();
   expect(screen.getByRole("button",{name:"Entender: Dias com déficit"})).toBeInTheDocument();
 });
 it("destaca sábado obrigatório e domingos alternados na escala individual",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Escala por pessoa/}));
   const table=screen.getByRole("region",{name:"Escala individual semanal"});
   const saturday=within(table).getAllByRole("row");
   expect(saturday).toHaveLength(79);
   for(const row of saturday.slice(1))
     expect(within(row).getAllByRole("cell")[7]).toHaveTextContent("Trabalha");
   expect(screen.getByText(/Sábado é sempre dia escalado e domingo alterna/)).toBeInTheDocument();
 });
 it("não gera escala com início fora de segunda",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.change(screen.getByLabelText("Início da simulação"),{target:{value:"2026-12-22"}});
   expect(screen.getByRole("alert")).toHaveTextContent(/segunda-feira/);
   expect(screen.getByRole("button",{name:"Exportar simulação"})).toBeDisabled();
 });
 it("apresenta indicadores do piloto e checklist sem registrar aprovação real",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Guia de implementação/}));
   const table=screen.getByRole("region",{name:"Indicadores de acompanhamento do piloto"});
   expect(within(table).getAllByRole("row")).toHaveLength(7);
   expect(screen.getByText(/0 de 6 etapas conferidas/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole("checkbox",{name:/01 · Auditar quadro e demanda/}));
   expect(screen.getByText(/1 de 6 etapas conferidas/)).toBeInTheDocument();
 });
 it("exibe roteiro e fonte oficial da EC 141",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Guia de implementação/}));
   expect(screen.getByRole("heading",{name:"Roteiro de transição segura"})).toBeInTheDocument();
   expect(screen.getByRole("link",{name:/Emenda Constitucional 141/})).toHaveAttribute(
     "href","https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm");
 });
});
