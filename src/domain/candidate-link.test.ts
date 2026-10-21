import { describe, expect, it } from "vitest";
import { demoCandidates, INTERVIEW_QUESTIONS } from "./candidates";
import { decode, encode, importReply, inviteMissing, makeInvite, readInvite, readReply, replyMissing, whatsappUrl, type Reply } from "./candidate-link";

const me = { name: "Joana (RH)", phone: "(91) 9 9999-0000" };
describe("link da entrevista", () => {
  it("codifica e decodifica com acentos", () => {
    expect(decode(encode({ a: "ção ã é 😀" }))).toEqual({ a: "ção ã é 😀" });
    expect(decode("%%%")).toBeNull();
  });
  it("exige WhatsApp do candidato e dados do entrevistador", () => {
    const bruno = demoCandidates().candidates[0]!;
    expect(inviteMissing({ ...bruno, phone: "" }, me)).toEqual(["WhatsApp do candidato"]);
    expect(inviteMissing(bruno, { name: "", phone: "" }).length).toBe(2);
    const inv = readInvite(encode(makeInvite(bruno, me)))!;
    expect(inv.interviewer).toBe("Joana (RH)");
    expect(inv.interviewerPhone).toBe("91999990000");
    expect(readInvite("lixo")).toBeNull();
  });
  it("monta link do WhatsApp com 55", () => {
    expect(whatsappUrl("(91) 9 9999-0000", "oi")).toBe("https://wa.me/5591999990000?text=oi");
  });
  it("candidato precisa responder tudo; respostas entram no candidato certo", () => {
    expect(replyMissing("Bruno", "", {}).length).toBe(1 + INTERVIEW_QUESTIONS.length);
    const answers = Object.fromEntries(INTERVIEW_QUESTIONS.map(q => [q.id, "resp " + q.id]));
    const rep: Reply = { v: 1, id: "CAND-002", name: "Bruno Lima", phone: "(91) 9 8100-0002", role: "Fiscal", interviewer: "Joana", answers, sentAt: "2026-10-21T18:00:00" };
    const back = readReply(encode(rep))!;
    const r = importReply(demoCandidates(), back, "2026-10-21");
    if (typeof r === "string") throw new Error(r);
    const c = r.store.candidates.find(x => x.id === "CAND-002")!;
    expect(c.interview.source).toBe("candidato");
    expect(c.interview.answers.sobre).toBe("resp sobre");
    expect(r.store.candidates.length).toBe(2);
    const novo = importReply(demoCandidates(), { ...back, id: "CAND-999" }, "2026-10-21");
    if (typeof novo === "string") throw new Error(novo);
    expect(novo.store.candidates.length).toBe(3);
    expect(typeof importReply(demoCandidates(), { ...back, id: "CAND-001" }, "2026-10-21")).toBe("string");
  });
});
