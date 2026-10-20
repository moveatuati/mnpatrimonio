import { useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FlaskConical,
  Info,
  ListFilter,
  Search,
  Users,
  UserRoundX,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDashboard } from "@/domain/dashboard";
import { GROUPS, GROUP_IDS, RULES, UNIT } from "@/domain/config";
import { filterArrivals, isValidReferenceDate, type EntryFilter } from "@/domain/operation-query";
import { arrivalOffsetMinutes } from "@/domain/rules/arrival-ranking";
import { countMonthlyLateArrivals } from "@/domain/rules/late-history";
import { summarizeGroupEntries } from "@/domain/rules/group-readiness";
import type { ArrivalStatus, GroupId } from "@/domain/types";

const REFERENCE_DATE = "2026-10-19";
const PAGE_SIZE = 8;
const STATUS: Record<ArrivalStatus, { label: string; tone: string }> = {
  no_horario: { label: "No horário", tone: "success" },
  atraso_alerta: { label: `Até ${RULES.lateAlertMinutes} min`, tone: "neutral" },
  atraso_acima: { label: `Acima de ${RULES.lateAlertMinutes} min`, tone: "warning" },
  sem_registro: { label: "Sem registro", tone: "danger" },
};
const FILTER_LABELS: Record<EntryFilter, string> = {
  all: "Todas as situações",
  registered: "Entradas registradas",
  no_horario: "No horário",
  atraso_alerta: `Atraso de até ${RULES.lateAlertMinutes} min`,
  atraso_acima: `Acima de ${RULES.lateAlertMinutes} min`,
  sem_registro: "Sem registro",
};
type Arrival = ReturnType<typeof buildDashboard>["arrivals"][number];

function displayDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
function StatusBadge({ status }: { status: ArrivalStatus }) {
  const { label, tone } = STATUS[status];
  const Icon = status === "no_horario" ? Check : status === "sem_registro" ? UserRoundX : Clock3;
  return (
    <span className={`op-status op-status-${tone}`}>
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

export function OperationDashboard() {
  const [date, setDate] = useState(REFERENCE_DATE);
  const [dateInput, setDateInput] = useState(REFERENCE_DATE);
  const [group, setGroup] = useState<"all" | GroupId>("all");
  const [status, setStatus] = useState<EntryFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Arrival | null>(null);
  const consultation = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const dashboard = useMemo(() => buildDashboard(date), [date]);
  const groups = useMemo(() => summarizeGroupEntries(dashboard.arrivals), [dashboard]);
  const history = useMemo(
    () =>
      countMonthlyLateArrivals(
        date,
        dashboard.arrivals.map((a) => a.employee),
      ),
    [date, dashboard],
  );
  const rows = useMemo(
    () => filterArrivals(dashboard.arrivals, { group, status, query }),
    [dashboard, group, status, query],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const first = (page - 1) * PAGE_SIZE;
  const hasFilters = group !== "all" || status !== "all" || query !== "";
  const dateError = !isValidReferenceDate(dateInput);
  const registrationRate = dashboard.kpis.scheduled
    ? Math.round((dashboard.kpis.entries / dashboard.kpis.scheduled) * 100)
    : null;

  function openConsultation(nextStatus: EntryFilter, nextGroup: "all" | GroupId = "all") {
    setStatus(nextStatus);
    setGroup(nextGroup);
    setQuery("");
    setPage(1);
    consultation.current?.focus({ preventScroll: true });
    consultation.current?.scrollIntoView({ block: "start" });
  }
  function clearFilters() {
    setGroup("all");
    setStatus("all");
    setQuery("");
    setPage(1);
  }
  function changeDate(value: string) {
    setDateInput(value);
    if (isValidReferenceDate(value)) {
      setDate(value);
      setPage(1);
      setSelected(null);
    }
  }
  const cards = [
    {
      label: "Escalados no dia",
      value: dashboard.kpis.scheduled,
      note: "Quadro-base demonstrativo",
      icon: Users,
      tone: "brand",
      filter: "all" as EntryFilter,
    },
    {
      label: "Entradas registradas",
      value: dashboard.kpis.entries,
      note:
        registrationRate === null
          ? "Sem escalados na base"
          : `${registrationRate}% do quadro-base com entrada`,
      icon: CheckCheck,
      tone: "success",
      filter: "registered" as EntryFilter,
    },
    {
      label: "Acima do alerta",
      value: dashboard.kpis.aboveAlert,
      note: `Entrada com mais de ${RULES.lateAlertMinutes} min de atraso`,
      icon: Clock3,
      tone: "warning",
      filter: "atraso_acima" as EntryFilter,
    },
    {
      label: "Sem entrada registrada",
      value: dashboard.kpis.missing,
      note: "Conferência de marcação necessária",
      icon: UserRoundX,
      tone: "danger",
      filter: "sem_registro" as EntryFilter,
    },
  ];

  return (
    <div className="formosa-operation">
      <header className="op-header">
        <div>
          <p className="op-eyebrow">
            GESTÃO DE PESSOAS <span>/</span> {UNIT.unit}
          </p>
          <h1>
            Visão da operação<span className="op-title-dot">.</span>
          </h1>
          <p className="op-subtitle">
            Sua equipe em perspectiva. Cada pendência, um próximo passo.
          </p>
        </div>
        <div className="op-header-tools no-print">
          <label className="op-date">
            <span>
              <CalendarDays size={15} aria-hidden="true" /> Data de referência
            </span>
            <input
              type="date"
              min="2000-01-01"
              max="9999-12-31"
              value={dateInput}
              onChange={(event) => changeDate(event.target.value)}
              aria-invalid={dateError}
              aria-describedby={dateError ? "date-error" : undefined}
            />
          </label>
          <button
            className="op-icon-button"
            onClick={() => window.print()}
            aria-label="Imprimir consulta"
            title="Imprimir consulta"
          >
            <ArrowDownToLine size={18} />
          </button>
        </div>
      </header>
      {dateError && (
        <p id="date-error" role="alert" className="op-date-error">
          Informe uma data válida entre 2000 e 9999. O painel mantém {displayDate(date)}.
        </p>
      )}
      <div className="op-demo">
        <FlaskConical size={17} aria-hidden="true" />
        <p>
          <strong>Ambiente de demonstração</strong>
          <span>
            {" "}
            · Dados fictícios gerados para a data selecionada. Sem integração com ponto real.
          </span>
        </p>
        <span className="op-demo-tag">UNIDADE PILOTO</span>
      </div>

      <section className="op-overview" aria-labelledby="overview-heading">
        <div className="op-section-heading">
          <div>
            <p className="op-eyebrow">PANORAMA DO DIA</p>
            <h2 id="overview-heading">O essencial para acompanhar</h2>
          </div>
          <p className="op-date-caption">{displayDate(date)}</p>
        </div>
        <div className="op-kpis">
          {cards.map(({ label, value, note, icon: Icon, tone, filter }) => (
            <button
              key={label}
              className={`op-kpi op-kpi-${tone}`}
              onClick={() => openConsultation(filter)}
              aria-label={`${label}: ${value}. Consultar registros`}
            >
              <div className="op-kpi-top">
                <span>{label}</span>
                <span className="op-kpi-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
              <strong className="op-kpi-value">{value}</strong>
              <div className="op-kpi-bottom">
                <span>{note}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="op-workspace-grid">
        <section className="op-panel op-groups" aria-labelledby="groups-heading">
          <div className="op-panel-heading">
            <div>
              <p className="op-eyebrow">EQUIPES & TURNOS</p>
              <h2 id="groups-heading">Registro de entradas</h2>
            </div>
            <span className="op-total">
              <strong>{dashboard.kpis.entries}</strong> / {dashboard.kpis.scheduled}
              <small>registradas</small>
            </span>
          </div>
          <div className="op-group-grid">
            {groups.map((entry) => {
              const config = GROUPS[entry.group];
              const coverage = dashboard.coverage.find((item) => item.group === entry.group);
              const percent = entry.scheduled
                ? Math.round((entry.registered / entry.scheduled) * 100)
                : 0;
              const deficit = coverage ? Math.max(0, coverage.required - coverage.scheduled) : 0;
              return (
                <div className="op-group" key={entry.group}>
                  <div className="op-group-title">
                    <span className="op-group-letter">{entry.group}</span>
                    <div>
                      <h3>{config.name}</h3>
                      <p>
                        {config.shift.start} — {config.shift.end}
                      </p>
                    </div>
                  </div>
                  <p className="op-group-count">
                    <strong>{entry.registered}</strong>
                    <span>
                      / {entry.scheduled}
                      <small>entradas</small>
                    </span>
                    <span className="op-group-percent">
                      {entry.scheduled ? `${percent}%` : "—"}
                    </span>
                  </p>
                  <div
                    className="op-meter"
                    role="meter"
                    aria-label={`Entradas registradas no grupo ${entry.group}`}
                    aria-valuemin={0}
                    aria-valuemax={entry.scheduled || 1}
                    aria-valuenow={entry.registered}
                  >
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <p className="op-group-plan">
                    {coverage?.scheduled ?? entry.scheduled} previstos ·{" "}
                    {coverage?.required ?? entry.scheduled} necessários
                  </p>
                  <button
                    className={`op-group-action ${entry.pending || deficit ? "op-text-warning" : "op-text-success"}`}
                    onClick={() =>
                      openConsultation(entry.pending ? "sem_registro" : "all", entry.group)
                    }
                  >
                    {entry.pending || deficit ? (
                      <Clock3 size={14} aria-hidden="true" />
                    ) : (
                      <Check size={14} aria-hidden="true" />
                    )}
                    {deficit
                      ? `${deficit} vaga(s) na escala-base`
                      : entry.pending
                        ? `${entry.pending} registro(s) pendente(s)`
                        : entry.scheduled
                          ? "Registros completos"
                          : "Sem escalados"}
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="op-panel-footnote">
            <Info size={14} aria-hidden="true" />
            <p>
              Entradas registradas não indicam presença atual. A escala-base ainda não considera
              folgas, domingos ou feriados.
            </p>
          </div>
        </section>

        <section className="op-panel op-attention" aria-labelledby="attention-heading">
          <div className="op-panel-heading">
            <div>
              <p className="op-eyebrow">PRÓXIMOS PASSOS</p>
              <h2 id="attention-heading">Central de atenção</h2>
            </div>
            <span
              className="op-attention-count"
              aria-label={`${dashboard.kpis.missing + dashboard.kpis.aboveAlert} ocorrências de ponto`}
            >
              {dashboard.kpis.missing + dashboard.kpis.aboveAlert}
            </span>
          </div>
          <button className="op-attention-action" onClick={() => openConsultation("sem_registro")}>
            <span className="op-attention-icon op-tone-danger">
              <UserRoundX size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>Conferir entradas pendentes</strong>
              <small>
                {dashboard.kpis.missing
                  ? `${dashboard.kpis.missing} sem registro · ausência não confirmada`
                  : "Nenhuma entrada pendente na data"}
              </small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button className="op-attention-action" onClick={() => openConsultation("atraso_acima")}>
            <span className="op-attention-icon op-tone-warning">
              <Clock3 size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>Acompanhar atrasos do dia</strong>
              <small>
                {dashboard.kpis.aboveAlert} acima de {RULES.lateAlertMinutes} min · conferir
                contexto
              </small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <div className="op-rule-note">
            <Info size={15} aria-hidden="true" />
            <p>
              <strong>Parâmetros da demonstração</strong>Alerta interno: {RULES.lateAlertMinutes}{" "}
              min. Descanso-base: {RULES.minRestHours}h. Aprovação de trocas e validação do
              calendário ainda em preparação.
            </p>
          </div>
        </section>
      </div>

      <section className="op-panel op-consultation" aria-labelledby="consultation-heading">
        <div className="op-panel-heading">
          <div>
            <p className="op-eyebrow">ACOMPANHAMENTO INDIVIDUAL</p>
            <h2 id="consultation-heading" ref={consultation} tabIndex={-1}>
              Consulta de entradas
            </h2>
            <p className="op-caption">Horários, situações e histórico mensal em uma só consulta.</p>
          </div>
          <span className="op-count-label" role="status" aria-live="polite">
            {rows.length} {rows.length === 1 ? "colaborador" : "colaboradores"}
          </span>
        </div>
        <div className="op-query-toolbar no-print">
          <div className="op-group-filters" role="group" aria-label="Filtrar por grupo">
            {(["all", ...GROUP_IDS] as const).map((value) => (
              <button
                key={value}
                aria-pressed={group === value}
                onClick={() => {
                  setGroup(value);
                  setPage(1);
                }}
              >
                {value === "all" ? "Todos os grupos" : `Grupo ${value}`}
              </button>
            ))}
          </div>
          <div className="op-query-controls">
            <label className="op-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar nome ou matrícula"
                aria-label="Buscar colaborador por nome ou matrícula"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="op-status-select">
              <ListFilter size={16} aria-hidden="true" />
              <select
                aria-label="Filtrar por situação"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as EntryFilter);
                  setPage(1);
                }}
              >
                {Object.entries(FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="op-filter-summary">
          <p>
            {date.split("-").reverse().join("/")} <span>·</span>{" "}
            {group === "all" ? "Todos os grupos" : `Grupo ${group}`} <span>·</span>{" "}
            {FILTER_LABELS[status]}
            {query.trim() && ` · Busca: “${query.trim()}”`}
          </p>
          {hasFilters && (
            <button className="no-print" onClick={clearFilters}>
              <X size={13} aria-hidden="true" />
              Limpar filtros
            </button>
          )}
        </div>
        <div
          className="op-table-scroll"
          role="region"
          aria-label="Tabela de entradas; role horizontalmente em telas pequenas"
          tabIndex={0}
        >
          <table className="op-table">
            <caption className="sr-only">
              Entradas demonstrativas em {displayDate(date)} — {UNIT.unit}. Ordenadas por horário de
              entrada, sem registro por último.
            </caption>
            <thead>
              <tr>
                <th scope="col">Colaborador</th>
                <th scope="col">Grupo</th>
                <th scope="col">Previsto</th>
                <th scope="col">Entrada</th>
                <th scope="col">Situação do dia</th>
                <th scope="col">
                  Atrasos no mês{" "}
                  <span
                    title={`Acima de ${RULES.lateAlertMinutes} min, do dia 1 até a data consultada.`}
                  >
                    *
                  </span>
                </th>
                <th scope="col" className="no-print">
                  <span className="sr-only">Detalhes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((arrival, index) => (
                <tr
                  key={arrival.employee.id}
                  className={
                    index < first || index >= first + PAGE_SIZE ? "op-off-page" : undefined
                  }
                >
                  <td>
                    <div className="op-person">
                      <span className="op-avatar" aria-hidden="true">
                        {initials(arrival.employee.name)}
                      </span>
                      <span>
                        <strong>{arrival.employee.name}</strong>
                        <small>{arrival.employee.id}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="op-table-group">{arrival.employee.group}</span>
                    <span className="op-table-group-name">
                      {GROUPS[arrival.employee.group].name}
                    </span>
                  </td>
                  <td className="op-time">{arrival.planned}</td>
                  <td className="op-time">
                    <strong>{arrival.entry ?? "—"}</strong>
                  </td>
                  <td>
                    <StatusBadge status={arrival.status} />
                  </td>
                  <td>
                    <span
                      className={`op-history ${history[arrival.employee.id] ? "op-history-present" : ""}`}
                    >
                      {history[arrival.employee.id] ?? 0}
                    </span>
                    <span className="op-history-unit"> ocorr.</span>
                  </td>
                  <td className="no-print">
                    <button
                      className="op-row-details"
                      aria-label={`Ver detalhes de ${arrival.employee.name}`}
                      onClick={(event) => {
                        detailTrigger.current = event.currentTarget;
                        setSelected(arrival);
                      }}
                    >
                      <Eye size={17} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="op-empty">
            <Search size={28} aria-hidden="true" />
            <h3>Nenhum registro nesta consulta</h3>
            <p>Revise o nome, a matrícula ou os filtros selecionados.</p>
            <button className="op-button" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        )}
        <div className="op-table-footer">
          <p>
            * Atrasos &gt; {RULES.lateAlertMinutes} min, de 01/{date.slice(5, 7)} até{" "}
            {date.split("-").reverse().join("/")}. Sem registro não conta como atraso.
          </p>
          <div className="op-pagination no-print">
            <span>
              {rows.length
                ? `${first + 1}–${Math.min(first + PAGE_SIZE, rows.length)} de ${rows.length}`
                : "0 registros"}
            </span>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <footer className="op-footer">
        <span>
          <strong>Formosa</strong> · Gestão de Pessoas · {UNIT.unit}
        </span>
        <span>Demonstração · Alerta operacional não equivale a tolerância legal ou desconto.</span>
      </footer>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent
            className="op-detail-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              detailTrigger.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>{selected.employee.name}</DialogTitle>
              <DialogDescription>
                {selected.employee.id} · Grupo {selected.employee.group} —{" "}
                {GROUPS[selected.employee.group].name}
                <br />
                {displayDate(date)} · Registro fictício
              </DialogDescription>
            </DialogHeader>
            <StatusBadge status={selected.status} />
            <dl className="op-detail-grid">
              <div>
                <dt>Entrada prevista</dt>
                <dd>{selected.planned}</dd>
              </div>
              <div>
                <dt>Entrada registrada</dt>
                <dd>{selected.entry ?? "Sem registro"}</dd>
              </div>
              <div>
                <dt>Diferença do previsto</dt>
                <dd>
                  {arrivalOffsetMinutes(selected) === null
                    ? "Não disponível"
                    : `${arrivalOffsetMinutes(selected)} min`}
                </dd>
              </div>
              <div>
                <dt>Atrasos acima de {RULES.lateAlertMinutes} min no mês</dt>
                <dd>{history[selected.employee.id] ?? 0}</dd>
              </div>
            </dl>
            <p className="op-detail-note">
              Histórico de 01/{date.slice(5, 7)} até {date.split("-").reverse().join("/")}. Valores
              negativos na diferença indicam entrada antecipada. A ausência de marcação exige
              conferência e não confirma falta.
            </p>
            <p className="op-detail-note">
              Consulta demonstrativa, sem edição ou aprovação de ponto. O alerta de{" "}
              {RULES.lateAlertMinutes} minutos é um parâmetro operacional.
            </p>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
