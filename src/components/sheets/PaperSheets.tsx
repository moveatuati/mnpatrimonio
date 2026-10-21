import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { PrintHeader } from "@/components/print/PrintHeader";
import { printNode } from "@/lib/print";
import type { AbsenceStore } from "@/domain/absences";
import { movementPeriod } from "@/domain/movement";
import { sundaySheet, weekSheet } from "@/domain/paper-sheets";
import { dateOffset, dayOfWeek, startOfWeek, sundayOf, type ScheduleStore } from "@/domain/schedule";
import "./PaperSheets.css";

const br = (d: string | null) => d ? d.split("-").reverse().join("/") : "—";
const WEEKDAY = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

/** Folhas impressas iguais às de papel: escala de domingo e folgas da semana. */
export function PaperSheets({ store, absences, initialDate, show = "both" }: {
  store: ScheduleStore; absences: AbsenceStore | null; initialDate: string; show?: "both" | "sunday" | "week";
}) {
  const [date, setDate] = useState(initialDate);
  const sunday = dayOfWeek(date) === 0 ? date : sundayOf(date);
  const sheet = useMemo(() => sundaySheet(store, sunday), [store, sunday]);
  const week = useMemo(() => weekSheet(store, absences, date), [store, absences, date]);
  const period = movementPeriod(sunday);
  const sundayRef = useRef<HTMLElement | null>(null);
  const weekRef = useRef<HTMLElement | null>(null);

  return <div className="ps">
    <div className="ps-controls">
      <button type="button" onClick={() => setDate(dateOffset(date, -7))}>◀ Semana anterior</button>
      <label>Semana de <input type="date" value={startOfWeek(date)} onChange={e => e.target.value && setDate(e.target.value)} /></label>
      <button type="button" onClick={() => setDate(dateOffset(date, 7))}>Próxima semana ▶</button>
    </div>

    {show !== "week" && <article className="ps-sheet ps-sheet-sunday" ref={sundayRef}>
      <PrintHeader title="ESCALA DE DOMINGO" subtitle={"Data: " + br(sheet.date) + " · Escalados: " + sheet.total + " (vagas previstas: " + sheet.target + ")"}
        right={"Setor: Operadora de caixa · " + (period.kind === "alta" ? "Alto movimento" : "Baixo movimento")} />
      <div className="ps-summary no-print">
        <span>{period.kind === "alta" ? "🔴 Alto movimento" : "🟢 Baixo movimento"} · cabe em 1 folha A4</span>
        <button type="button" className="ps-print" onClick={() => printNode(sundayRef.current, { title: "Escala de domingo " + br(sheet.date) })}><Printer size={16} /> Imprimir</button>
      </div>
      {sheet.blocks.map(block => <section key={block.slot} className="ps-block">
        <h3>{block.title} <small>{block.rows.length} de {block.target} vagas{block.rows.length < block.target ? " · FALTAM " + (block.target - block.rows.length) : block.rows.length > block.target ? " · SOBRAM " + (block.rows.length - block.target) : " ✔"}</small></h3>
        <table><thead><tr><th>MAT</th><th>NOME</th><th>FOLGA ANTECIPADA</th><th>FOLGA 7º DIA</th><th>ASSINATURA DO FUNCIONÁRIO</th></tr></thead>
          <tbody>{block.rows.map(r => <tr key={r.employee.id}>
            <td>{r.employee.id}</td><td>{r.employee.name.toUpperCase()}</td>
            <td>{br(r.folgaAntecipada)}</td><td>{br(r.folga7Dia)}</td><td className="ps-sign" />
          </tr>)}</tbody></table>
      </section>)}
      <footer className="ps-foot"><span>GERENTE DA LOJA</span><span>ENCARREGADO DO SETOR</span><span>GERENTE DO SETOR</span></footer>
      <p className="ps-note">Demonstração com nomes fictícios. Folga antecipada = descanso na semana do domingo trabalhado. Folga 7º dia = descanso na semana seguinte.</p>
    </article>}

    {show !== "sunday" && <article className="ps-sheet ps-sheet-week" ref={weekRef}>
      <PrintHeader title="ESCALA DA SEMANA · FOLGAS" subtitle={br(week.days[0]!) + " a " + br(week.days[5]!) + " · Legenda: X trabalha · FOLGA · FÉRIAS"} />
      <div className="ps-summary no-print">
        <span>Legenda: <b>X</b> trabalha · <b className="ps-folga">FOLGA</b> · <b className="ps-ferias">FÉRIAS</b> · cabe em 1 folha A4</span>
        <button type="button" className="ps-print" onClick={() => printNode(weekRef.current, { title: "Folgas da semana " + br(week.days[0]!) })}><Printer size={16} /> Imprimir</button>
      </div>
      <table className="ps-week"><thead><tr><th>MAT</th><th>NOME</th>
        {week.days.map(d => <th key={d}>{WEEKDAY[dayOfWeek(d)]}<small>{br(d).slice(0, 5)}</small></th>)}</tr></thead>
        {week.groups.map(g => <tbody key={g.group}>
          <tr className="ps-group"><td colSpan={8}>{g.title}</td></tr>
          {g.rows.map(r => <tr key={r.employee.id}>
            <td>{r.employee.id}</td><td>{r.employee.name.toUpperCase()}</td>
            {r.cells.map(c => <td key={c.date} title={c.detail} className={"ps-cell ps-" + c.status}>
              {c.status === "trabalha" ? "X" : c.status === "folga" ? "FOLGA" : c.status === "ferias" ? "FÉRIAS" : c.status === "atestado" ? "ATESTADO" : "AFAST."}
            </td>)}
          </tr>)}
        </tbody>)}
        <tfoot><tr><td colSpan={2}>Pessoas de folga no dia</td>{week.restsPerDay.map((n, i) => <td key={i}><b>{n}</b></td>)}</tr></tfoot>
      </table>
    </article>}
  </div>;
}
