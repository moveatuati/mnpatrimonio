import { Printer, ArrowLeft } from "lucide-react";
import { GROUPS, RULES, UNIT } from "@/domain/config";
import { DEMO_EMPLOYEES } from "@/domain/demo-data";
import { buildEmployeeDemoReport } from "@/domain/employee-report";
import type { ArrivalStatus } from "@/domain/types";

function shortDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
const STATUS_LABELS: Record<ArrivalStatus, string> = {
  no_horario: "No horário",
  atraso_alerta: "Até 10 min",
  atraso_acima: "Acima de 10 min",
  sem_registro: "Sem registro",
};
function differenceLabel(diff: number | null) {
  if (diff === null) return "—";
  if (diff < 0) return `${Math.abs(diff)} min antes`;
  if (diff === 0) return "Pontual";
  return `+${diff} min`;
}

export function EmployeePrintableSheet({ employeeId, date }: { employeeId: string; date: string }) {
  const employee = DEMO_EMPLOYEES.find(person => person.id === employeeId);
  if (!employee) return <div className="rh-print-screen p-8">
    <h1 className="font-display text-xl font-semibold">Colaborador não encontrado</h1>
    <p className="mt-2 text-sm text-muted-foreground">Confira o código e volte à consulta de colaboradores.</p>
    <a className="mt-4 inline-block font-semibold text-primary" href="/colaboradores">Voltar aos colaboradores</a>
  </div>;
  const report = buildEmployeeDemoReport(employee, date);
  const shift = GROUPS[employee.group].shift;
  const totals = [
    { label: "No horário", value: report.totals.onTime, tone: "success" },
    { label: "Até 10 minutos", value: report.totals.withinAlert, tone: "neutral" },
    { label: "Acima de 10 min", value: report.totals.aboveAlert, tone: "warning" },
    { label: "Sem registro", value: report.totals.withoutEntry, tone: "danger" },
  ];
  return (
    <main className="rh-print-screen">
      <div className="rh-print-toolbar no-print">
        <a href="/colaboradores" className="rh-print-back"><ArrowLeft size={17} aria-hidden="true" /> Colaboradores</a>
        <p>Prévia de impressão · A4 retrato</p>
        <button type="button" className="rh-print-action" onClick={() => window.print()}>
          <Printer size={17} aria-hidden="true" /> Imprimir / salvar PDF
        </button>
      </div>
      <article className="rh-print-sheet" aria-label={`Ficha A4 de ${employee.name}`}>
        <header className="rh-print-head">
          <img src="/formosa-logo.svg" alt="Formosa" className="rh-print-logo" />
          <div className="rh-print-brand">
            <span className="rh-print-eyebrow">Formosa · Gestão de Pessoas</span>
            <h1>Ficha individual do colaborador</h1>
            <p>Unidade {UNIT.unit} · {UNIT.city}</p>
          </div>
          <strong className="rh-print-watermark">DEMONSTRAÇÃO</strong>
        </header>
        <div className="rh-print-period">
          <span>Referência: {shortDate(report.periodStart)} até {shortDate(report.referenceDate)}</span>
          <span>Fonte: registros fictícios · {report.days.length} datas</span>
        </div>
        <dl className="rh-print-details">
          <div><dt>Colaborador</dt><dd>{employee.name}</dd></div>
          <div><dt>Código</dt><dd>{employee.id}</dd></div>
          <div><dt>Grupo operacional</dt><dd>Grupo {employee.group} — {GROUPS[employee.group].name}</dd></div>
          <div><dt>Situação cadastral</dt><dd>Ativo · demonstração</dd></div>
          <div><dt>Jornada-base</dt><dd>{shift.start}–{shift.end}</dd></div>
          <div><dt>Intervalo-base</dt><dd>{shift.breakStart}–{shift.breakEnd}</dd></div>
          <div><dt>Data de admissão</dt><dd>Não informada</dd></div>
          <div><dt>Banco de horas</dt><dd>Não implantado</dd></div>
        </dl>
        <section className="rh-print-totals" aria-label="Resumo mensal fictício">
          {totals.map(total => <div key={total.label} className={`rh-print-total rh-print-total-${total.tone}`}>
            <span>{total.label}</span><strong>{total.value}</strong>
          </div>)}
        </section>
        <section className="rh-print-month" aria-label="Histórico mensal de entradas fictícias">
          <div className="rh-print-section-head">
            <h2>Histórico mensal de entradas simuladas</h2>
            <p>{report.totals.recorded} entrada(s) registradas na simulação</p>
          </div>
          <table className="rh-print-table">
            <thead>
              <tr><th scope="col">Data</th><th scope="col">Dia</th><th scope="col">Previsto</th>
                <th scope="col">Entrada</th><th scope="col">Diferença</th><th scope="col">Situação</th></tr>
            </thead>
            <tbody>
              {report.days.map(row => <tr key={row.date}>
                <td>{shortDate(row.date)}</td><td>{row.weekday}</td><td>{row.planned}</td>
                <td className="rh-print-time">{row.entry ?? "—"}</td>
                <td>{differenceLabel(row.difference)}</td>
                <td><span className={`rh-print-status rh-print-status-${row.status}`}>{STATUS_LABELS[row.status]}</span></td>
              </tr>)}
            </tbody>
          </table>
        </section>
        <footer className="rh-print-footer">
          <p><strong>Importante:</strong> relatório inteiramente fictício. As datas são simuladas, inclusive domingos e possíveis folgas;
            não há confirmação de presença, saída, pausas ou cumprimento de jornada.</p>
          <p>A ausência de entrada não comprova falta. O limite de {RULES.lateAlertMinutes} minutos é apenas um alerta operacional interno,
            sem equivalência automática a tolerância legal, punição ou desconto.</p>
          <div><span>{UNIT.company} · {UNIT.unit} · {UNIT.city}</span><span>Uso demonstrativo · não é documento oficial de ponto</span></div>
        </footer>
      </article>
    </main>
  );
}
