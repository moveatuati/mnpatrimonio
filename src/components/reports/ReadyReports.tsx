import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Printer, ShieldAlert, Wallet } from "lucide-react";
import { BANK_RULES, GROUPS } from "@/domain/config";
import type { AbsenceStore } from "@/domain/absences";
import { BANK_LEVEL_TEXT, bankBoard, bankSummary, hoursText, suggestCompensationDate, type HourStore } from "@/domain/hour-bank";
import { laborRisks, type RiskLevel } from "@/domain/labor-risks";
import { movementPeriod } from "@/domain/movement";
import { startOfWeek, type ScheduleStore } from "@/domain/schedule";
import { PaperSheets } from "@/components/sheets/PaperSheets";
import { PrintHeader } from "@/components/print/PrintHeader";
import { printNode } from "@/lib/print";
import { RestAuditPanel } from "@/components/schedule/RestAuditPanel";
import "./ReadyReports.css";

type Ready = "riscos" | "folgas" | "banco" | "domingo" | "semana";
const br = (d: string) => d.split("-").reverse().join("/");
const LEVEL: Record<RiskLevel, { icon: string; text: string }> = {
  alto: { icon: "🔴", text: "Resolver já" },
  medio: { icon: "🟡", text: "Atenção" },
  baixo: { icon: "🟢", text: "Tudo certo" },
};

/** Relatórios prontos, de leitura rápida, para o gerente e o RH (evitar multas e custos). */
export function ReadyReports({ schedule, absences, hours, date }: {
  schedule: ScheduleStore; absences: AbsenceStore | null; hours: HourStore; date: string;
}) {
  const [view, setView] = useState<Ready>("riscos");
  const start = startOfWeek(date);
  const risks = useMemo(() => laborRisks(schedule, hours, absences, start, 28), [schedule, hours, absences, start]);
  const board = useMemo(() => bankBoard(hours, date), [hours, date]);
  const summary = useMemo(() => bankSummary(hours, date), [hours, date]);
  const due = board.filter(r => r.level === "vermelho" || r.level === "amarelo");
  const negatives = board.filter(r => r.level === "negativo");
  const high = risks.filter(r => r.level === "alto").length;
  const period = movementPeriod(date);

  const paperRef = useRef<HTMLElement | null>(null);
  function printThis() {
    printNode(paperRef.current, { title: view === "riscos" ? "Riscos trabalhistas" : "Banco de horas" });
  }

  return <section className="rr" aria-label="Relatórios prontos">
    <div className="rr-choose" role="tablist">
      {([
        ["riscos", ShieldAlert, "Riscos trabalhistas", high ? high + " para resolver" : "Tudo certo"],
        ["folgas", ShieldAlert, "Conferência de folgas", "antes e depois do domingo"],
        ["banco", Wallet, "Banco de horas", summary.vermelho + " precisam de folga"],
        ["domingo", CalendarDays, "Escala de domingo", "folha para assinar"],
        ["semana", CalendarDays, "Folgas da semana", "planilha da semana"],
      ] as const).map(([id, Icon, label, sub]) => <button key={id} type="button" role="tab" aria-selected={view === id}
        className={view === id ? "rr-on" : ""} onClick={() => setView(id)}>
        <Icon size={22} /><b>{label}</b><small>{sub}</small>
      </button>)}
    </div>

    {(view === "riscos" || view === "banco") && <article className="rr-paper rr-print" ref={paperRef}>
      <PrintHeader
        title={view === "riscos" ? "Riscos trabalhistas e de custo" : "Banco de horas: quem precisa compensar"}
        subtitle={(view === "riscos" ? "Relatório para o RH · 4 semanas a partir de " + br(start) : "Relatório para o gerente · posição em " + br(date)) + " · " + period.label}
        right={"Emitido em " + br(new Date().toISOString().slice(0, 10))} />
      <div className="rr-actions no-print"><button type="button" className="rr-print-btn" onClick={printThis}><Printer size={16} /> Imprimir</button></div>

      {view === "riscos" && <div className="rr-risks">
        {risks.map(r => <section key={r.id} className={"rr-risk rr-" + r.level}>
          <div className="rr-risk-top">
            <span className="rr-badge">{LEVEL[r.level].icon} {LEVEL[r.level].text}</span>
            <h3>{r.title}</h3>
            <strong>{r.people.length} {r.people.length === 1 ? "pessoa" : "pessoas"}</strong>
          </div>
          <p><b>Por que importa:</b> {r.why}</p>
          <p><b>O que fazer:</b> {r.action}</p>
          {r.people.length > 0 && <ul>{r.people.slice(0, 12).map(p => <li key={p.id + p.detail}><b>{p.name}</b> <small>{p.id}</small> — {p.detail}</li>)}
            {r.people.length > 12 && <li>… e mais {r.people.length - 12}</li>}</ul>}
        </section>)}
        <p className="rr-note"><AlertTriangle size={14} /> Orientação operacional com dados fictícios. Não substitui a análise do jurídico nem a convenção coletiva.</p>
      </div>}

      {view === "banco" && <div>
        <div className="rr-bank-cards">
          <div className="rr-card rr-vermelho"><strong>{summary.vermelho}</strong><span>Dar folga agora (7h ou mais)</span></div>
          <div className="rr-card rr-amarelo"><strong>{summary.amarelo}</strong><span>Planejar folga (4h a 7h)</span></div>
          <div className="rr-card rr-verde"><strong>{summary.verde}</strong><span>Tranquilo (até 4h)</span></div>
          <div className="rr-card rr-negativo"><strong>{summary.negativo}</strong><span>Devem horas</span></div>
        </div>
        <table className="rr-table"><thead><tr><th>Situação</th><th>Colaborador</th><th>Horário</th><th>Saldo</th><th>Folga sugerida</th><th>Visto</th></tr></thead>
          <tbody>{due.map(r => <tr key={r.employee.id} className={"rr-row-" + r.level}>
            <td>{r.level === "vermelho" ? "🔴" : "🟡"} {BANK_LEVEL_TEXT[r.level].label}</td>
            <td><b>{r.employee.name}</b><small>{r.employee.id}</small></td>
            <td>{GROUPS[r.employee.group].name}</td>
            <td className="rr-num">{hoursText(r.minutes)}</td>
            <td>{br(suggestCompensationDate(schedule, r.employee, date))}</td>
            <td className="rr-sign" />
          </tr>)}
          {negatives.map(r => <tr key={r.employee.id} className="rr-row-negativo">
            <td>⚪ Deve horas</td><td><b>{r.employee.name}</b><small>{r.employee.id}</small></td>
            <td>{GROUPS[r.employee.group].name}</td><td className="rr-num">{hoursText(r.minutes)}</td><td>Combinar reposição</td><td className="rr-sign" />
          </tr>)}</tbody></table>
        <p className="rr-note">Regra: ao chegar a {hoursText(BANK_RULES.compensateMinutes)}, conceder uma folga (desconta {hoursText(BANK_RULES.folgaMinutes)}).
          As datas sugeridas caem do dia 19 ao 27 (baixo movimento) e em dias em que a pessoa estaria trabalhando.</p>
      </div>}
    </article>}

    {view === "folgas" && <RestAuditPanel store={schedule} date={date} />}
    {view === "domingo" && <PaperSheets store={schedule} absences={absences} initialDate={date} show="sunday" />}
    {view === "semana" && <PaperSheets store={schedule} absences={absences} initialDate={date} show="week" />}
  </section>;
}
