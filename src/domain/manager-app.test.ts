import { describe, expect, it } from "vitest";
import { demoAbsences } from "./absences";
import { DEMO_EMPLOYEES } from "./demo-data";
import {
  EMPTY_MANAGER_STORE, TOLERANCE_MINUTES, acknowledge, archiveSigned, arrivalBoard, informEarlyExit, issueWarning,
  liveAlerts, managersOnDuty, monthlyLateCount, restoreManagerStore, sendToRH,
} from "./manager-app";
import { DEFAULT_SCHEDULE } from "./schedule";

const DATE = "2026-10-21";

describe("App do supervisor — chegada por turno e alertas", () => {
  it("antes do turno ninguém aparece como atrasado; batidas só surgem depois que acontecem", () => {
    const early = arrivalBoard(DEFAULT_SCHEDULE, demoAbsences(), DATE, "06:30");
    expect(early.every(c => c.counts.ainda_nao === c.rows.length)).toBe(true);
    expect(liveAlerts(early, EMPTY_MANAGER_STORE, DATE)).toHaveLength(0);
  });
  it("tolerância de 10 min: atraso só depois de passar do horário + 10", () => {
    expect(TOLERANCE_MINUTES).toBe(10);
    const board = arrivalBoard(DEFAULT_SCHEDULE, demoAbsences(), DATE, "22:00");
    for (const r of board.flatMap(c => c.rows)) {
      if (r.state === "atrasado") expect(r.lateMinutes).toBeGreaterThan(10);
      if (r.state === "no_horario") expect(r.lateMinutes).toBeLessThanOrEqual(10);
    }
    const total = board.reduce((n, c) => n + c.rows.length, 0);
    expect(total).toBeLessThan(21); // folgas e ausências não entram
  });
  it("fluxo completo: alerta → ciente → RH → advertência numerada → arquivada", () => {
    const board = arrivalBoard(DEFAULT_SCHEDULE, demoAbsences(), DATE, "22:00");
    const alert = liveAlerts(board, EMPTY_MANAGER_STORE, DATE)[0]!;
    expect(alert.status).toBe("novo");
    let store = acknowledge(EMPTY_MANAGER_STORE, alert, "Gerente");
    let occ = store.occurrences[0]!;
    expect(occ.status).toBe("ciente");
    store = sendToRH(store, occ, "Gerente", "Conversei com o colaborador");
    occ = store.occurrences[0]!;
    expect(occ.status).toBe("enviado_rh");
    expect(monthlyLateCount(store, occ.employeeId, DATE)).toBe(1);
    store = issueWarning(store, occ, "RH");
    occ = store.occurrences[0]!;
    expect(occ.warningNumber).toBe("001/2026");
    store = archiveSigned(store, occ, "RH");
    expect(store.occurrences[0]!.status).toBe("arquivado");
    expect(store.occurrences[0]!.events.length).toBeGreaterThanOrEqual(4);
    expect(liveAlerts(board, store, DATE).find(a => a.id === occ.id)?.status).toBe("arquivado");
  });
  it("saída antecipada informada ao RH com o gerente que autorizou", () => {
    const store = informEarlyExit(EMPTY_MANAGER_STORE, DEMO_EMPLOYEES[0]!, DATE, "saida_antecipada", 120, "Exame médico", "Gerente X", true, "5h00");
    expect(store.occurrences[0]!.status).toBe("informado");
    expect(store.occurrences[0]!.events[0]!.text).toContain("Autorizado");
    expect(restoreManagerStore(JSON.parse(JSON.stringify(store))).occurrences).toHaveLength(1);
  });
  it("supervisores de plantão por horário (o noturno atravessa a meia-noite)", () => {
    expect(managersOnDuty("07:10").map(m => m.id)).toEqual(["GM", "GN"]);
    expect(managersOnDuty("09:00").map(m => m.id)).toEqual(["GL", "GM"]);
    expect(managersOnDuty("02:00").map(m => m.id)).toEqual(["GN"]);
    expect(managersOnDuty("21:00").map(m => m.id)).toEqual(["GN"]);
  });
});
