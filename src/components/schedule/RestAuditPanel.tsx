import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { GROUPS } from "@/domain/config";
import { dateOffset, restAudit, startOfWeek, type ScheduleStore } from "@/domain/schedule";
import { PrintHeader } from "@/components/print/PrintHeader";
import { printNode } from "@/lib/print";
import "./RestAuditPanel.css";

const br = (d: string | null) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "—");

/** Conferência das folgas dos serviços gerais: domingo trabalhado = 1 folga antes + 1 folga depois. A portaria 12×36 não entra (DSR compensado). */
export function RestAuditPanel({ store, date }: { store: ScheduleStore; date: string }) {
  const [start, setStart] = useState(startOfWeek(date));
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [query, setQuery] = useState("");
  const audit = useMemo(() => restAudit(store, start, 4), [store, start]);
  const q = query.trim().toLocaleLowerCase("pt-BR");
  const rows = audit.rows.filter(r => (!onlyIssues || r.problems.length > 0) &&
    (!q || (r.employee.name + " " + r.employee.id).toLocaleLowerCase("pt-BR").includes(q)));

  const ref = useRef<HTMLElement | null>(null);
  function printIt() { printNode(ref.current, { title: "Conferência de folgas " + br(start) }); }

  return <article className="ra ra-print" ref={ref}>
    <PrintHeader title="Conferência de folgas · serviços gerais · 4 domingos"
      subtitle={"Regra: trabalhou no domingo = 1 folga antes + 1 folga depois. Não trabalhou = descanso no domingo (DSR). Portaria 12×36 não se aplica. A partir de " + br(start)} />
    <div className="ra-cards">
      <span className="ra-card ra-ok"><strong>{audit.ok}</strong> em dia</span>
      <span className={"ra-card " + (audit.pending ? "ra-bad" : "ra-ok")}><strong>{audit.pending}</strong> {audit.pending ? "com folga faltando" : "pendências"}</span>
      {audit.sundays.map((s, i) => <span key={s} className="ra-card ra-sun"><strong>{audit.workersPerSunday[i]}</strong> no dom. {br(s)}</span>)}
      <button type="button" className="ra-btn no-print" onClick={printIt}><Printer size={16} /> Imprimir</button>
    </div>

    <div className="ra-tools">
      <button type="button" onClick={() => setStart(dateOffset(start, -7))}>◀ Semana anterior</button>
      <span>A partir de {br(start)}</span>
      <button type="button" onClick={() => setStart(dateOffset(start, 7))}>Próxima semana ▶</button>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nome" aria-label="Buscar colaborador na conferência" />
      <label><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} /> Só quem tem pendência</label>
    </div>

    <div className="ra-scroll">
      <table className="ra-table">
        <thead><tr><th>Colaborador</th>{audit.sundays.map(s => <th key={s}>Domingo {br(s)}</th>)}<th>Situação</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.employee.id} className={r.problems.length ? "ra-row-bad" : ""}>
          <td><b>{r.employee.name}</b> <small>{r.employee.id} · {GROUPS[r.employee.group].name}</small></td>
          {r.checks.map(c => <td key={c.sunday} className={c.worked ? (c.ok ? "ra-work" : "ra-miss") : "ra-off"}>
            {c.worked
              ? <><b>Trabalha</b> <small>folgas {br(c.before)} e {br(c.after)}</small></>
              : <span>Folga</span>}
          </td>)}
          <td>{r.problems.length ? <span className="ra-tag-bad" title={r.problems.join(" ")}>⚠️ {r.problems.length}</span> : <span className="ra-tag-ok">✅ OK</span>}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="ra-empty">{onlyIssues ? "Ninguém com pendência. 👍" : "Nenhum colaborador encontrado."}</p>}
    </div>
    {audit.pending > 0 && <ul className="ra-list">{audit.rows.flatMap(r => r.problems).slice(0, 30).map(p => <li key={p}>{p}</li>)}</ul>}
  </article>;
}
