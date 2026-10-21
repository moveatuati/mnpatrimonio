import { describe, expect, it } from "vitest";
import {
  CRITERIA, INTERVIEW_QUESTIONS, applicationMissing, decide, demoCandidates, isValidCPF, newCandidate,
  removeCandidate, reopen, restoreCandidates, setRhOpinion, submit, type Candidate,
} from "./candidates";

function complete(c: Candidate): Candidate {
  return { ...c, name: "Teste", phone: "(91) 9 8100-0009", interview: { ...c.interview, interviewer: "RH",
    answers: Object.fromEntries(INTERVIEW_QUESTIONS.map(q => [q.id, "ok"])),
    scores: Object.fromEntries(CRITERIA.map(k => [k.id, 4])), opinion: "Bom perfil" } };
}

describe("captação de candidatos", () => {
  it("bloqueia o parecer com entrevista incompleta", () => {
    const { store, id } = newCandidate(demoCandidates(), "2026-10-21");
    const c = store.candidates.find(x => x.id === id)!;
    expect(typeof decide(c, "aprovado", "2026-10-21T10:00:00")).toBe("string");
  });
  it("aprovação libera a ficha; reprovação não", () => {
    const { store, id } = newCandidate(demoCandidates(), "2026-10-21");
    const c = complete(store.candidates.find(x => x.id === id)!);
    const ok = decide(c, "aprovado", "2026-10-21T10:00:00") as Candidate;
    expect(ok.stage).toBe("aprovado");
    expect(ok.application?.fields.nome).toBe("Teste");
    expect((decide(c, "reprovado", "x") as Candidate).application).toBeNull();
  });
  it("valida CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("529.982.247-24")).toBe(false);
  });
  it("só envia a ficha completa e trava após envio", () => {
    const ana = demoCandidates().candidates.find(c => c.stage === "aprovado")!;
    expect(typeof submit(ana, "t")).toBe("string");
    const filled: Candidate = { ...ana, application: { ...ana.application!, declaration: true, fields: { ...ana.application!.fields,
      nascimento: "2000-01-01", endereco: "Rua A", bairro: "Coqueiro", rg: "123", cpf: "529.982.247-25", escolaridade: "Médio completo" } } };
    expect(applicationMissing(filled.application!)).toEqual([]);
    const sent = submit(filled, "2026-10-21T11:00:00") as Candidate;
    expect(sent.application?.status).toBe("enviada");
    expect(typeof reopen(sent)).toBe("string");
    expect(typeof decide(sent, "reprovado", "t")).toBe("string");
    expect(typeof removeCandidate({ version: 1, seq: 1, candidates: [sent] }, sent.id)).toBe("string");
    const rh = setRhOpinion(sent, { ...sent.application!.rh, verdict: "apto" }) as Candidate;
    expect(rh.application?.rh.verdict).toBe("apto");
  });
  it("parecer do RH exige ficha enviada e restauração tolera dados inválidos", () => {
    const ana = demoCandidates().candidates.find(c => c.stage === "aprovado")!;
    expect(typeof setRhOpinion(ana, { ...ana.application!.rh, verdict: "apto" })).toBe("string");
    expect(restoreCandidates(null).candidates.length).toBe(2);
    const back = restoreCandidates(JSON.parse(JSON.stringify(demoCandidates())));
    expect(back.candidates[1].application?.references.pessoais.length).toBe(2);
  });
});
