import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { UNIT } from "@/domain/config";
import type { AbsenceStore } from "@/domain/absences";
import { movementPeriod } from "@/domain/movement";
import { sundaySheet, weekSheet } from "@/domain/paper-sheets";
import { dateOffset, dayOfWeek, startOfWeek, sundayOf, type ScheduleStore } from "@/domain/schedule";
import "./PaperSheets.css";

const br = (d: string | null) => d ? d.split("-").reverse().join("/") : "—";
const WEEKDAY = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function printOnly(kind: "sunday" | "week") {
  document.body.dataset.printing = kind;
  const done = () => { delete document.body.dataset.printing; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
  window.setTimeout(done, 1500);
}

/** Folhas impressas iguais às de papel: escala de domingo e folgas da semana. */
export function PaperSheets({ store, absences, initialDate, show = "both" }: {
  store: ScheduleStore; absences: AbsenceStore | null; initialDate: string; show?: "both" | "sunday" | "week";
}) {
  const [date, setDate] = useState(initialDate);
  const sunday = dayOfWeek(date) === 0 ? date : sundayOf(date);
  const sheet = useMemo(() => sundaySheet(store, sunday), [store, sunday]);
  const week = useMemo(() => weekSheet(store, absences, date), [store, absences, date]);
  const period = movementPeriod(sunday);

  return <div className="ps">
    <div className="ps-controls">
      <button type="button" onClick={() => setDate(dateOffset(date, -7))}>◀ Semana anterior</button>
      <label>Semana de <input type="date" value={startOfWeek(date)} onChange={e => e.target.value && setDate(e.target.value)} /></label>
      <button type="button" onClick={() => setDate(dateOffset(date, 7))}>Próxima semana ▶</button>
    </div>

    {show !== "week" && <article className="ps-sheet ps-sheet-sunday">
      <header className="ps-head">
        <h2>ESCALA DE DOMINGO</h2>
        <div className="ps-line"><span>SETOR: OPERADORA DE CAIXA · {UNIT.unit.toUpperCase()}</span><b>DATA: {br(sheet.date)}</b></div>
        <div className="ps-summary">
          <span>Escalados: <b>{sheet.total}</b> (vagas previstas: {sheet.target})</span>
          <span>{period.kind === "alta" ? "🔴 Alto movimento" : "🟢 Baixo movimento"}</span>
          <button type="button" className="ps-print" onClick={() => printOnly("sunday")}><Printer size={16} /> Imprimir</button>
        </div>
      </header>
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

    {show !== "sunday" && <article className="ps-sheet ps-sheet-week">
      <header className="ps-head">
        <h2>ESCALA DA SEMANA · FOLGAS</h2>
        <div className="ps-line"><span>SETOR: OPERADORA DE CAIXA · {UNIT.unit.toUpperCase()}</span><b>{br(week.days[0]!)} a {br(week.days[5]!)}</b></div>
        <div className="ps-summary">
          <span>Legenda: <b>X</b> trabalha · <b className="ps-folga">FOLGA</b> · <b className="ps-ferias">FÉRIAS</b></span>
          <button type="button" className="ps-print" onClick={() => printOnly("week")}><Printer size={16} /> Imprimir</button>
        </div>
      </header>
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
