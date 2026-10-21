import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {FiveTwoWorkspace} from "./FiveTwoWorkspace";
beforeEach(()=>window.localStorage.clear());
afterEach(()=>cleanup());
describe("Simulador 5×2 · serviços gerais (EC 141/2026)",()=>{
 it("apresenta o quadro atual, o mínimo para manter o sábado e a portaria 12×36",()=>{
   render(<FiveTwoWorkspace/>);
   expect(screen.getByRole("heading",{name:/Simulador 5×2/})).toBeInTheDocument();
   expect(screen.getByRole("button",{name:/Quadro atual/})).toHaveTextContent("9");
   expect(screen.getByRole("button",{name:/Mínimo para a necessidade/})).toHaveTextContent("11");
   expect(screen.getByText(/E a portaria 12×36\?/)).toBeInTheDocument();
 });
 it("com o quadro atual o sábado fica descoberto",()=>{
   render(<FiveTwoWorkspace/>);
   fireEvent.click(screen.getByRole("button",{name:/Quadro atual/}));
   expect(screen.getByText(/Não cobre|Quase cobre/)).toBeInTheDocument();
 });
});
