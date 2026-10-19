import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Info, UserX, Users, ShieldCheck, CalendarRange, ChevronRight, BellRing, ChartNoAxesColumnIncreasing, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { buildDashboard } from "@/domain/dashboard";
import { GROUPS, RULES } from "@/domain/config";
import type { ArrivalStatus } from "@/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão da operação — Rh Formosa Augusto Montenegro" },
      { name: "description", content: "Painel gerencial de escalas, entradas e cobertura da unidade Augusto Montenegro." },
      { property: "og:title", content: "Visão da operação — Rh Formosa Augusto Montenegro" },
      { property: "og:description", content: "Painel gerencial de escalas, entradas e cobertura da unidade Augusto Montenegro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS: Record<ArrivalStatus, { label: string; cls: string }> = {
  no_horario: { label: "No horário", cls: "bg-success/15 text-success" },
  atraso_alerta: { label: "Dentro do alerta", cls: "bg-warning/25 text-warning-foreground" },
  atraso_acima: { label: "Acima do alerta", cls: "bg-destructive/15 text-destructive" },
  sem_registro: { label: "Sem registro", cls: "bg-muted text-muted-foreground" },
};

const REF_DATE = "2026-10-19";

function Dashboard() {
  const [date, setDate] = useState(REF_DATE);
  const d = useMemo(() => buildDashboard(date), [date]);
  const maxSlot = Math.max(...d.timeline.map((s) => s.total), 1);

  const kpis = [
    { label: "Escalados no dia", value: d.kpis.scheduled, icon: Users, variant: "ruby" },
    { label: "Entradas registradas", value: d.kpis.entries, icon: CheckCircle2, variant: "emerald" },
    { label: `Acima do alerta (${RULES.lateAlertMinutes} min)`, value: d.kpis.aboveAlert, icon: Clock, variant: "amber" },
    { label: "Sem entrada registrada", value: d.kpis.missing, icon: UserX, variant: "crimson" },
  ];

  return (
    <>
      <PageHeader
        title="Visão da operação"
        subtitle="Acompanhamento diário de escalados, entradas e cobertura dos grupos. Dados fictícios de demonstração."
        actions={
          <label className="formosa-date-control no-print flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-card">
            <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" />
            Data de referência
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        }
      />
      <div className="formosa-dashboard relative -mt-10 space-y-5 px-5 pb-12 md:px-8">
        <div className="formosa-demo-strip flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Ambiente de demonstração</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Colaboradores e marcações fictícios. Nenhuma integração com ponto real.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-primary">
            <CalendarRange aria-hidden="true" className="h-4 w-4" />
            Unidade Augusto Montenegro
          </div>
        </div>
        <section aria-label="Indicadores do dia" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, variant }) => (
            <div key={label} className={`formosa-kpi-card formosa-kpi-${variant} group relative isolate overflow-hidden rounded-2xl px-5 pb-5 pt-6 transition-transform duration-200 hover:-translate-y-1`}>
              <div aria-hidden="true" className="formosa-kpi-topline" />
              <div className="formosa-kpi-layout flex items-start gap-4">
                <span className="formosa-kpi-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="formosa-kpi-label text-xs font-semibold leading-snug">{label}</p>
                  <p className="formosa-kpi-number mt-2 font-display text-[36px] font-bold tabular-nums">{value}</p>
                  <p className="formosa-kpi-note mt-1 text-[10px] font-medium">Dados demonstrativos do dia</p>
                </div>
              </div>
              <span className="formosa-kpi-arrow" aria-hidden="true"><ChevronRight className="h-3 w-3" /></span>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card lg:col-span-3">
            <div className="flex items-center justify-between gap-3"><h2 className="formosa-section-title"><Users aria-hidden="true" />Cobertura dos grupos</h2><span className="rounded-full border border-primary/15 bg-accent px-3 py-1 text-[11px] font-bold text-primary">A · B · C</span></div>
            <p className="text-sm text-muted-foreground">Escalados x necessidade operacional (configurável).</p>
            <div className="mt-5 space-y-5">
              {d.coverage.map((c) => {
                const pct = Math.min(100, (c.scheduled / Math.max(c.required, 1)) * 100);
                const tone = c.balance < 0 ? "bg-destructive" : c.balance > 0 ? "bg-info" : "bg-success";
                const label = c.balance < 0 ? `Déficit de ${-c.balance}` : c.balance > 0 ? `Excedente de ${c.balance}` : "Cobertura adequada";
                const g = GROUPS[c.group];
                return (
                  <div key={c.group}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">
                        {c.group} — {g.name}{" "}
                        <span className="text-muted-foreground">
                          ({g.shift.start}–{g.shift.breakStart} · {g.shift.breakEnd}–{g.shift.end})
                        </span>
                      </span>
                      <span className="font-semibold">
                        {c.scheduled}/{c.required}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/70">
                      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card lg:col-span-2">
            <div className="flex items-center justify-between gap-3"><h2 className="formosa-section-title"><BellRing aria-hidden="true" />Central de atenção</h2><span className="rounded-full bg-accent px-2 py-1 text-[11px] font-bold text-primary">{d.alerts.length} aviso(s)</span></div>
            <ul className="mt-4 space-y-3">
              {d.alerts.map((a) => {
                const Icon = a.severity === "info" ? Info : AlertTriangle;
                const tone =
                  a.severity === "critico"
                    ? "border-destructive text-destructive"
                    : a.severity === "atencao"
                      ? "border-warning text-warning-foreground"
                      : "border-info text-info";
                return (
                  <li key={a.id} className={`formosa-alert formosa-alert-${a.severity} rounded-xl border-l-2 p-3.5 ${tone}`}>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <h2 className="formosa-section-title"><ChartNoAxesColumnIncreasing aria-hidden="true" />Cobertura ao longo do dia</h2>
          <p className="text-sm text-muted-foreground">Colaboradores em atividade considerando entradas, intervalos e saídas dos horários-base.</p>
          <div className="formosa-timeline mt-6 flex h-40 items-end gap-1 rounded-lg border border-border/60 px-3 pt-2">
            {d.timeline.map((s) => (
              <div key={s.time} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${s.time}: ${s.total} (A ${s.byGroup.A} · B ${s.byGroup.B} · C ${s.byGroup.C})`}>
                <span className="mb-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{s.total}</span>
                <div className="formosa-timeline-bar w-full rounded-t-md transition-opacity hover:opacity-80" style={{ height: `${Math.round((s.total / maxSlot) * 126)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {d.timeline.filter((_, i) => i % 6 === 0).map((s) => (
              <span key={s.time}>{s.time}</span>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          <div className="p-6 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="formosa-section-title"><ListOrdered aria-hidden="true" />Ordem de chegada</h2><span className="text-xs font-semibold text-primary">Registros fictícios</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-sm">
              <thead className="sticky top-0 z-10 bg-navy text-navy-foreground">
                <tr>
                  {["#", "Colaborador", "Grupo", "Previsto", "Entrada", "Situação"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.arrivals.map((a, i) => (
                  <tr key={a.employee.id} className="border-b border-border/80 even:bg-muted/50 hover:bg-accent/60 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {a.employee.name} <span className="text-xs text-muted-foreground">{a.employee.id}</span>
                    </td>
                    <td className="px-4 py-2.5">{a.employee.group} — {GROUPS[a.employee.group].name}</td>
                    <td className="px-4 py-2.5">{a.planned}</td>
                    <td className="px-4 py-2.5">{a.entry ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[a.status].cls}`}>
                        {STATUS[a.status].label}
                        {a.delayMinutes > 0 && ` · +${a.delayMinutes} min`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
