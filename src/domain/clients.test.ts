import { describe, expect, it } from "vitest";
import { demoClients, emptyCondo, formatCNPJ, restoreClients, saveCondo, saveFunction, totalPosts } from "./clients";

describe("condomínios e funções", () => {
  it("traz as duas funções padrão", () => {
    expect(demoClients().functions.map(f => f.name)).toEqual(["Agente de portaria", "Auxiliar de serviços gerais"]);
  });
  it("valida e cadastra condomínio novo sem duplicar nome", () => {
    const s = demoClients();
    expect(typeof saveCondo(s, emptyCondo())).toBe("string");
    const ok = saveCondo(s, { ...emptyCondo(), name: "Residencial Teste", manager: "Fulano", phone: "(91) 9 9999-0000", posts: { "FN-01": 2 } });
    if (typeof ok === "string") throw new Error(ok);
    expect(ok.id).toBe("COND-003");
    expect(totalPosts(ok.store.condos[2]!)).toBe(2);
    expect(typeof saveCondo(ok.store, { ...emptyCondo(), name: "residencial teste", manager: "X", phone: "(91) 9 9999-0000" })).toBe("string");
  });
  it("cadastra função e formata CNPJ", () => {
    const r = saveFunction(demoClients(), { id: "", name: "Zelador", description: "", active: true });
    if (typeof r === "string") throw new Error(r);
    expect(r.functions[2]!.id).toBe("FN-03");
    expect(typeof saveFunction(r, { id: "", name: "zelador", description: "", active: true })).toBe("string");
    expect(formatCNPJ("12345678000195")).toBe("12.345.678/0001-95");
    expect(restoreClients(null).condos.length).toBe(2);
  });
});
