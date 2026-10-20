import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Info, Printer, Search, ShieldCheck, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GROUPS, GROUP_IDS, RULES, UNIT } from "@/domain/config";
import { buildDashboard } from "@/domain/dashboard";
import { DEMO_EMPLOYEES, demoPunches } from "@/domain/demo-data";
import { filterArrivals, isValidReferenceDate, type EntryFilter } from "@/domain/operation-query";
import { countMonthlyLateArrivals } from "@/domain/rules/late-history";
import { classifyArrival } from "@/domain/rules/punctuality";
import type { ArrivalStatus, Employee, GroupId } from "@/domain/types";

const REFERENCE_DATE = "2026-10-20";
const PAGE_SIZE = 12;
const FILTERS: { value: EntryFilter; label: string }[] = [
  { value: "all", label: "Todas as situações" },
  { value: "registered", label: "Com entrada simulada" },
  { value: "no_horario", label: "No horário" },
  { value: "atraso_alerta", label: "Até 10 min" },
  { value: "atraso_acima", label: "Acima de 10 min" },
  { value: "sem_registro", label: "Sem entrada simulada" },
];
const LABELS: Record<ArrivalStatus, { label: string; tone: string }> = {
  no_horario: { label: "No horário", tone: "success" },
  atraso_alerta: { label: "Até 10 min", tone: "neutral" },
  atraso_acima: { label: "Acima de 10 min", tone: "warning" },
  sem_registro: { label: "Sem registro", tone: "danger" },
};
function showDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
function EntryStatus({ value }: { value: ArrivalStatus }) {
  const state = LABELS[value];
  return <span className={`op-status op-status-${state.tone}`}>{state.label}</span>;
}
function demoHistory(employee: Employee, date: string) {
  const base = new Date(`${date}T12:00:00Z`);
  return Array.from({ length: 5 }, (_, i) => {
    const current = new Date(base);
    current.setUTCDate(current.getUTCDate() - i);
    const day = current.toISOString().slice(0, 10);
    const entry = demoPunches(day, [employee])[0]?.entry;
    return { day, entry, status: classifyArrival(GROUPS[employee.group].shift.start, entry).status };
  });
}
export function CollaboratorsDirectory() {
  const [date, setDate] = useState(REFERENCE_DATE);
  const [dateInput, setDateInput] = useState(REFERENCE_DATE);
  const [group, setGroup] = useState<"all" | GroupId>("all");
  const [status, setStatus] = useState<EntryFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const dashboard = useMemo(() => buildDashboard(date), [date]);
  const monthly = useMemo(() => countMonthlyLateArrivals(date, DEMO_EMPLOYEES), [date]);
  const rowsFiltered = useMemo(() =>
    filterArrivals(dashboard.arrivals, { group, status, query }).sort(
      (a, b) => a.employee.name.localeCompare(b.employee.name, "pt-BR") ||
        a.employee.id.localeCompare(b.employee.id),
    ), [dashboard, group, status, query]);
  const lastPage = Math.max(1, Math.ceil(rowsFiltered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = rowsFiltered.slice(start, start + PAGE_SIZE);
  const selected = selectedId ? dashboard.arrivals.find(row => row.employee.id === selectedId) : undefined;
  const dateInvalid = !isValidReferenceDate(dateInput);
  const hasFilters = group !== "all" || status !== "all" || Boolean(query.trim());
  const chooseGroup = (value: "all" | GroupId) => { setGroup(value); setPage(1); };
  const reset = () => { chooseGroup("all"); setStatus("all"); setQuery(""); };
  const updateDate = (value: string) => {
    setDateInput(value);
    if (isValidReferenceDate(value)) { setDate(value); setSelectedId(null); setPage(1); }
  };

  return <div className="formosa-operation max-w-[1680px]">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="op-eyebrow">Formosa <span>·</span> Gestão de Pessoas <span>·</span> {UNIT.unit}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Colaboradores<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Quadro, jornadas-base e consulta individual dos colaboradores fictícios.</p>
      </div>
      <label className="op-date">
        <span><CalendarDays size={15} aria-hidden="true" /> Data de referência</span>
        <input type="date" value={dateInput} aria-label="Data de referência"
          aria-invalid={dateInvalid} onChange={event => updateDate(event.target.value)} />
      </label>
    </header>
    {dateInvalid && <p className="op-date-error mt-3" role="alert">Data inválida. Mantendo {showDate(date)}.</p>}
    <div className="op-demo mt-5"><ShieldCheck size={17} aria-hidden="true" />
      <span><strong>Demonstração.</strong> Os 63 colaboradores e as entradas são fictícios. Sem cadastro editável nem ponto oficial.</span>
    </div>

    <section aria-label="Quadro por grupo" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" aria-pressed={group === "all"} onClick={() => chooseGroup("all")}
        className={`rounded-xl border bg-card p-4 text-left shadow-card transition hover:border-primary/50 ${group === "all" ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
        <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Users size={17} className="text-primary" /> Quadro completo</span>
        <strong className="mt-2 block font-display text-4xl tabular-nums text-primary">{DEMO_EMPLOYEES.length}</strong>
        <small className="mt-1 block text-muted-foreground">Ativos no cenário demonstrativo</small>
      </button>
      {GROUP_IDS.map(id => {
        const count = DEMO_EMPLOYEES.filter(e => e.group === id).length;
        return <button key={id} type="button" aria-pressed={group === id} onClick={() => chooseGroup(id)}
          className={`rounded-xl border bg-card p-4 text-left shadow-card transition hover:border-primary/50 ${group === id ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent font-bold text-primary">{id}</span>
            Grupo {id} · {GROUPS[id].name}
          </span>
          <strong className="mt-2 block font-display text-4xl tabular-nums text-foreground">{count}</strong>
          <small className="mt-1 block text-muted-foreground">Entrada-base: {GROUPS[id].shift.start}</small>
        </button>;
      })}
    </section>

    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-card" aria-label="Consulta de colaboradores">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="op-eyebrow">Consulta nominal</p>
          <h2 className="mt-1 font-display text-lg font-semibold">Quadro de colaboradores</h2>
          <p className="mt-1 text-xs text-muted-foreground">Clique em “Ficha” para consultar informações individuais.</p>
        </div>
        <span className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-primary">{rowsFiltered.length} resultado(s)</span>
      </div>
      <div className="flex flex-wrap gap-2.5 px-4 py-3">
        <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" aria-hidden="true" />
          <input type="search" className="w-full bg-transparent text-sm outline-none" aria-label="Buscar por nome ou código"
            placeholder="Nome ou código FM-..." value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </label>
        <select aria-label="Filtrar por grupo" value={group}
          onChange={e => chooseGroup(e.target.value as "all" | GroupId)}
          className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os grupos</option>
          {GROUP_IDS.map(id => <option key={id} value={id}>Grupo {id} · {GROUPS[id].name}</option>)}
        </select>
        <select aria-label="Filtrar por situação da entrada" value={status}
          onChange={e => { setStatus(e.target.value as EntryFilter); setPage(1); }}
          className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm">
          {FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {hasFilters && <button className="flex items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-primary"
          type="button" onClick={reset}><X size={14} /> Limpar filtros</button>}
      </div>
      <p className="border-y border-border bg-muted/40 px-5 py-2 text-[11px] text-muted-foreground">
        <span role="status">{rowsFiltered.length} de 63 colaboradores</span> · Consulta {showDate(date)} · Entrada é simulação, não presença confirmada.
      </p>
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Tabela do quadro com rolagem horizontal em telas pequenas">
        <table className="w-full min-w-[870px] text-left text-xs">
          <caption className="sr-only">Colaboradores fictícios da Formosa em {showDate(date)}</caption>
          <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>{["Colaborador", "Grupo", "Jornada-base", "Cadastro", "Entrada simulada", "Atrasos/mês*"].map(label =>
              <th scope="col" className="px-4 py-3 font-semibold" key={label}>{label}</th>)}
              <th scope="col" className="px-4 py-3 no-print"><span className="sr-only">Consultar ficha</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ employee, entry, status: entryStatus }) => {
              const shift = GROUPS[employee.group].shift;
              return <tr key={employee.id} className="border-t border-border/70 even:bg-muted/30 hover:bg-accent/40">
                <td className="px-4 py-3"><strong className="block text-foreground">{employee.name}</strong><small className="text-muted-foreground">{employee.id}</small></td>
                <td className="px-4 py-3"><strong className="text-primary">Grupo {employee.group}</strong><small className="block text-muted-foreground">{GROUPS[employee.group].name}</small></td>
                <td className="px-4 py-3"><strong className="tabular-nums">{shift.start}–{shift.end}</strong><small className="block text-muted-foreground">Intervalo {shift.breakStart}–{shift.breakEnd}</small></td>
                <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">Ativo · demo</span></td>
                <td className="px-4 py-3"><strong className="block tabular-nums">{entry ?? "—"}</strong><EntryStatus value={entryStatus} /></td>
                <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 font-bold tabular-nums ${monthly[employee.id] ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"}`}>{monthly[employee.id] ?? 0}</span></td>
                <td className="px-4 py-3 no-print">
                  <button type="button" aria-label={`Ver ficha de ${employee.name}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 font-bold text-primary hover:border-primary/40 hover:bg-accent"
                    onClick={e => { detailTrigger.current = e.currentTarget; setSelectedId(employee.id); }}>
                    <Eye size={15} aria-hidden="true" /> Ficha
                  </button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {!rowsFiltered.length && <div className="px-5 py-8 text-center">
        <h3 className="font-semibold">Nenhum colaborador encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">Revise a busca ou os filtros.</p>
        <button type="button" className="mt-3 rounded-lg border px-3 py-2 text-xs text-primary" onClick={reset}>Limpar filtros</button>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-[11px] text-muted-foreground">* Entradas acima de {RULES.lateAlertMinutes} min no mês; sem marcação não significa falta.</p>
        <nav className="flex items-center gap-2 no-print" aria-label="Paginação do quadro">
          <span className="mr-1 text-xs text-muted-foreground">{rowsFiltered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, rowsFiltered.length)} de ${rowsFiltered.length}` : "0 registros"}</span>
          <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={17} /></button>
          <button type="button" aria-label="Próxima página" disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={17} /></button>
        </nav>
      </div>
    </section>
    <section className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-5" aria-label="Funcionalidades previstas">
      <div>
        <p className="op-eyebrow">Próximas etapas</p>
        <h2 className="mt-1 text-sm font-semibold">Administração de pessoal</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">O cadastro persistente, admissões, férias, trocas e banco de horas ainda dependem de implementação e permissões.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Admissão e edição", "Folgas e trocas", "Férias e afastamentos", "Banco de horas"].map(label =>
          <span key={label} className="rounded-full bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">{label} · previsto</span>)}
      </div>
    </section>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      {selected && <DialogContent className="rh-employee-dialog max-h-[88vh] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={e => { e.preventDefault(); detailTrigger.current?.focus(); }}>
        <DialogHeader>
          <DialogTitle className="text-xl">{selected.employee.name}</DialogTitle>
          <DialogDescription>
            {selected.employee.id} · Grupo {selected.employee.group} — {GROUPS[selected.employee.group].name}<br />
            Unidade {UNIT.unit} · {UNIT.city} · Registro fictício
          </DialogDescription>
        </DialogHeader>
        <div className="rh-employee-modal-toolbar flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Ativo · demo</span>
            <EntryStatus value={selected.status} />
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {monthly[selected.employee.id] ?? 0} atraso(s) no mês
            </span>
          </div>
          <a
            className="rh-employee-print-button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
            href={`/ficha-colaborador?id=${encodeURIComponent(selected.employee.id)}&date=${encodeURIComponent(date)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ficha A4 de ${selected.employee.name} para impressão`}
          >
            <Printer size={16} aria-hidden="true" /> Imprimir ficha A4
          </a>
        </div>
        <dl className="rh-employee-details-grid grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            ["Entrada-base", GROUPS[selected.employee.group].shift.start],
            ["Saída-base", GROUPS[selected.employee.group].shift.end],
            ["Intervalo", `${GROUPS[selected.employee.group].shift.breakStart}–${GROUPS[selected.employee.group].shift.breakEnd}`],
            [`Entrada simulada (${showDate(date)})`, selected.entry ?? "Sem marcação"],
            ["Admissão", "Não informada"],
            ["Banco de horas", "Não implantado"],
          ].map(([label,value]) =>
            <div key={label} className="rh-employee-field rounded-xl border border-border/60 bg-muted/60 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
            </div>)}
        </dl>
        <section aria-label="Histórico demonstrativo">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold">Últimas cinco datas simuladas</h3>
              <p className="mt-1 text-xs text-muted-foreground">Sem considerar folgas, domingos ou escala efetiva.</p>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Entrada-base: {GROUPS[selected.employee.group].shift.start}</span>
          </div>
          <div className="rh-employee-records mt-3" role="table" aria-label="Últimas cinco entradas fictícias">
            <div role="row" className="rh-employee-record-head">
              <span role="columnheader">Data</span>
              <span role="columnheader">Entrada</span>
              <span role="columnheader">Situação</span>
            </div>
            {demoHistory(selected.employee, date).map(row =>
              <div role="row" key={row.day} className="rh-employee-record-line">
                <span role="cell">{showDate(row.day)}</span>
                <strong role="cell" className="tabular-nums">{row.entry ?? "—"}</strong>
                <span role="cell" className="rh-employee-record-status"><EntryStatus value={row.status} /></span>
              </div>)}
          </div>
        </section>
        <p className="flex items-start gap-2 rounded-lg bg-accent p-3 text-xs leading-relaxed text-accent-foreground">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          Ficha apenas de consulta. O relatório A4 mostra todos os dias simulados do mês até a data escolhida.
          Nenhuma alteração ou validação oficial de ponto é registrada.
        </p>
      </DialogContent>}
    </Dialog>
  </div>;
}
