import { describe, expect, it } from "vitest";
import {
  CRITERIA, INTERVIEW_QUESTIONS, applicationMissing, decide, demoCandidates, isValidCPF, newCandidate,
  removeCandidate, reopen, restoreCandidates, setRhOpinion, submit, decideProfile, receiveProfile, type Candidate,
} from "./candidates";
import { predominant, profileReading, scoreAnswers, simulatedScores } from "./behavior-profile";
import { DOC_LIST, docsComplete, docsReceived, receiveDocs } from "./candidate-docs";

function complete(c: Candidate): Candidate {
  return { ...c, stage: "entrevista", name: "Teste", role: "Agente de portaria", condoId: "COND-001", functionId: "FN-01", phone: "(91) 9 8100-0009", interview: { ...c.interview, interviewer: "RH",
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
    expect(ok.application?.fields["nome"]).toBe("Teste");
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
    expect(typeof removeCandidate({ version: 2, seq: 1, candidates: [sent] }, sent.id)).toBe("string");
    const rh = setRhOpinion(sent, { ...sent.application!.rh, verdict: "apto" }) as Candidate;
    expect(rh.application?.rh.verdict).toBe("apto");
  });
  it("parecer do RH exige ficha enviada e restauração tolera dados inválidos", () => {
    const ana = demoCandidates().candidates.find(c => c.stage === "aprovado")!;
    expect(typeof setRhOpinion(ana, { ...ana.application!.rh, verdict: "apto" })).toBe("string");
    expect(restoreCandidates(null).candidates.length).toBe(demoCandidates().candidates.length);
    const back = restoreCandidates(JSON.parse(JSON.stringify(demoCandidates())));
    expect(back.candidates[1]!.application?.references.pessoais.length).toBe(2);
  });
  it("perfil: só aprova para a entrevista depois da resposta; aprovado sai da etapa", () => {
    const { store, id } = newCandidate(demoCandidates(), "2026-10-22");
    const c = { ...store.candidates.find(x => x.id === id)!, name: "Teste", condoId: "COND-001", functionId: "FN-01", role: "Agente de portaria", phone: "(91) 9 8100-0009" };
    expect(c.stage).toBe("perfil");
    expect(typeof decide(c, "aprovado", "t")).toBe("string");
    expect(typeof decideProfile(c, "entrevista", "t")).toBe("string");
    const answered = receiveProfile(c, simulatedScores(c.id), "2026-10-22T09:00:00") as Candidate;
    expect(answered.profile.seen).toBe(false);
    const next = decideProfile(answered, "entrevista", "t") as Candidate;
    expect(next.stage).toBe("entrevista");
    expect(next.profile.seen).toBe(true);
    expect((decideProfile({ ...c, name: "" }, "banco", "t"))).toContain("Nome");
  });
  it("resultado do perfil soma 100 e mostra empate", () => {
    const s = scoreAnswers({ a: "Tubarão", b: "Tubarão", c: "Gato", d: "Gato", e: "Lobo", f: "Águia" });
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(100);
    expect(predominant(s)).toEqual(["Tubarão", "Gato"]);
    expect(Object.values(simulatedScores("x")).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("documentos: progresso e restauração", () => {
    const ana = demoCandidates().candidates.find(c => c.stage === "aprovado")!;
    expect(docsReceived(ana.docs)).toBe(4);
    const back = restoreCandidates(JSON.parse(JSON.stringify(demoCandidates()))).candidates.find(c => c.id === ana.id)!;
    expect(docsReceived(back.docs)).toBe(4);
    const all = receiveDocs(back.docs, Object.fromEntries(DOC_LIST.map(d => [d.id, { name: d.short, at: "t", url: "x" }])));
    expect(docsComplete(all)).toBe(true);
    expect(all.seen).toBe(false);
  });
  it("leitura do perfil igual ao CRM: atuante/pensante e razão/emoção", () => {
    const r = profileReading({ "Lobo": 60, "Tubarão": 20, "Gato": 16, "Águia": 4 });
    expect(r.agir.av).toBe(36); expect(r.agir.bv).toBe(64); expect(r.agir.lider).toBe("Pensante");
    expect(r.orientacao.av).toBe(80); expect(r.orientacao.sinal).toBe("Predominância acentuada");
    expect(r.dominantes).toEqual(["Lobo"]);
    expect(r.comoDecide[0]).toBe("As respostas favorecem critérios racionais");
  });
});
