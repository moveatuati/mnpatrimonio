import { describe, expect, it } from "vitest";
import { demoCandidates, type Candidate } from "./candidates";
import { daysSince, needsAttention, overview, situation } from "./candidate-overview";

const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const by = (id: string) => demoCandidates().candidates.find(c => c.id === id)!;

describe("visão geral da captação", () => {
  it("conta dias entre datas", () => {
    expect(daysSince("2026-10-19T14:00:00", "2026-10-22")).toBe(3);
    expect(daysSince("", "2026-10-22")).toBe(0);
  });
  it("marca atraso no perfil e nos documentos; novidade no perfil respondido", () => {
    expect(situation(by("CAND-003"), today())?.level).toBe("atrasado");
    expect(situation(by("CAND-001"), today())?.action).toBe("cobrar-docs");
    const carlos = situation(by("CAND-004"), today())!;
    expect(carlos.level).toBe("resolver");
    expect(carlos.isNew).toBe(true);
    expect(situation(by("CAND-002"), today())?.level).toBe("ok");
  });
  it("encerrados ficam fora; lista de pendências começa pelos atrasados", () => {
    const c: Candidate = { ...by("CAND-002"), stage: "banco" };
    expect(situation(c, today())).toBeNull();
    const list = needsAttention(demoCandidates(), today());
    expect(list.map(x => x.c.id)).toEqual(["CAND-001", "CAND-003", "CAND-004"]);
  });
  it("resume as 3 etapas", () => {
    const o = overview(demoCandidates());
    expect(o.perfil).toEqual({ respondeu: 1, aguardando: 1, naoEnviado: 0 });
    expect(o.entrevista.paraEntrevistar).toBe(1);
    expect(o.entrevista.aprovados).toBe(1);
    expect(o.ficha.faltamDocs).toBe(1);
  });
});
