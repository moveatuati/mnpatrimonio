import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {RulesWorkspace} from "./RulesWorkspace";
import {GROUPS} from "@/domain/config";
import {applyRhSettings,defaultRhSettings,RH_SETTINGS_KEY} from "@/domain/rh-settings";
import {DEFAULT_SCHEDULE} from "@/domain/schedule";

beforeEach(()=>{window.localStorage.clear();applyRhSettings(defaultRhSettings());});
afterEach(()=>{cleanup();window.localStorage.clear();applyRhSettings(defaultRhSettings());});

describe("Regras & histórico — central gerencial",()=>{
  it("oferece configuração de horários e grava antes/depois com justificativa",()=>{
    render(<RulesWorkspace/>);
    expect(screen.getByRole("heading",{name:"Regras & histórico"})).toBeInTheDocument();
    expect(screen.getByText("Central de regras da operação")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Grupo A start"),{target:{value:"07:10"}});
    fireEvent.change(screen.getByLabelText("Justificativa das novas regras"),
      {target:{value:"Planejamento aprovado para o piloto"}});
    fireEvent.click(screen.getByRole("button",{name:/Salvar regras e registrar histórico/}));
    expect(window.localStorage.getItem(RH_SETTINGS_KEY)).not.toBeNull();
    expect(GROUPS.A.shift.start).toBe("07:10");
    fireEvent.click(screen.getByRole("button",{name:"Parâmetros e histórico"}));
    expect(screen.getByText(/07:00 → 07:10/)).toBeInTheDocument();
  });
  it("bloqueia descanso abaixo de 11 horas",()=>{
    render(<RulesWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Parâmetros e histórico"}));
    fireEvent.change(screen.getByLabelText("Descanso mínimo em horas"),{target:{value:"9"}});
    expect(screen.getByRole("alert")).toHaveTextContent(/11 horas/);
    expect(screen.getByRole("button",{name:/Salvar regras e registrar histórico/})).toBeDisabled();
  });
  it("salva contingente dominical na estrutura existente de escalas",()=>{
    window.localStorage.setItem("formosa:augusto-montenegro:escala-demo:v1",JSON.stringify(DEFAULT_SCHEDULE));
    render(<RulesWorkspace/>);
    fireEvent.click(screen.getByRole("button",{name:"Domingos e feriados"}));
    fireEvent.change(screen.getByLabelText("Domingo grupo B"),{target:{value:"7"}});
    fireEvent.change(screen.getByLabelText("Justificativa das novas regras"),
      {target:{value:"Ajuste de equipe dominical"}});
    fireEvent.click(screen.getByRole("button",{name:/Salvar regras e registrar histórico/}));
    const saved=JSON.parse(window.localStorage.getItem("formosa:augusto-montenegro:escala-demo:v1")!);
    expect(saved.rules.sunday.B).toBe(7);
    expect(saved.history.at(-1)?.detail).toContain("Domingo B");
    expect(saved.overrides).toEqual(DEFAULT_SCHEDULE.overrides);
  });
});
