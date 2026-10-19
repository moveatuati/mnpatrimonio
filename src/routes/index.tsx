import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Info, UserX, Users } from "lucide-react";
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
    { label: "Escalados no dia", value: d.kpis.scheduled, icon: Users, tone: "text-navy" },
    { label: "Entradas registradas", value: d.kpis.entries, icon: CheckCircle2, tone: "text-success" },
    { label: `Acima do alerta (${RULES.lateAlertMinutes} min)`, value: d.kpis.aboveAlert, icon: Clock, tone: "text-primary" },
    { label: "Sem entrada registrada", value: d.kpis.missing, icon: UserX, tone: "text-destructive" },
  ];

  return (
    <>
      <PageHeader
        title="Visão da operação"
        subtitle="Acompanhamento diário de escalados, entradas e cobertura dos grupos. Dados fictícios de demonstração."
        actions={
          <label className="no-print flex items-center gap-2 rounded-lg bg-card/10 px-3 py-2 text-sm">
            Data de referência
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded-md bg-card px-2 py-1 text-foreground"
            />
          </label>
        }
      />
      <div className="-mt-10 space-y-6 px-6 pb-10 md:px-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className={`h-5 w-5 ${tone}`} />
              </div>
              <p className={`mt-3 font-display text-4xl font-semibold ${tone}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-xl bg-card p-6 shadow-card lg:col-span-3">
            <h2 className="text-lg font-semibold">Cobertura dos grupos</h2>
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
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 shadow-card lg:col-span-2">
            <h2 className="text-lg font-semibold">Central de atenção</h2>
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
                  <li key={a.id} className={`rounded-md border-l-4 bg-muted/60 p-3 ${tone}`}>
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

        <section className="rounded-xl bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Cobertura ao longo do dia</h2>
          <p className="text-sm text-muted-foreground">Colaboradores em atividade considerando entradas, intervalos e saídas dos horários-base.</p>
          <div className="mt-6 flex h-48 items-end gap-1">
            {d.timeline.map((s) => (
              <div key={s.time} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${s.time}: ${s.total} (A ${s.byGroup.A} · B ${s.byGroup.B} · C ${s.byGroup.C})`}>
                <span className="mb-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{s.total}</span>
                <div className="w-full rounded-t bg-brand" style={{ height: `${(s.total / maxSlot) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {d.timeline.filter((_, i) => i % 6 === 0).map((s) => (
              <span key={s.time}>{s.time}</span>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-card shadow-card">
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold">Ordem de chegada</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy text-navy-foreground">
                <tr>
                  {["#", "Colaborador", "Grupo", "Previsto", "Entrada", "Situação"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.arrivals.map((a, i) => (
                  <tr key={a.employee.id} className="border-b border-border even:bg-muted/50">
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
