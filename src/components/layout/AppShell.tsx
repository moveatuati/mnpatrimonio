import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NAV } from "./nav";
import { UNIT } from "@/domain/config";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex md:sticky md:top-0 md:h-screen">
        <div className="border-b border-sidebar-border px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand font-display text-lg font-bold text-primary-foreground">
              F
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-sidebar-accent-foreground">{UNIT.company}</p>
              <p className="text-xs opacity-70">Gestão de Pessoas</p>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-sidebar-accent px-3 py-2 text-xs">
            <p className="opacity-70">Unidade</p>
            <p className="font-semibold text-sidebar-accent-foreground">{UNIT.unit}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="border-t border-sidebar-border px-5 py-4 text-[11px] leading-snug opacity-60">
          Modo demonstração — dados fictícios. Não constitui registro oficial de ponto.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="no-print flex gap-1 overflow-x-auto bg-sidebar px-2 py-2 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="bg-header px-6 pb-16 pt-8 text-navy-foreground md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-75">
            {UNIT.system} · {UNIT.unit} — {UNIT.city}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm opacity-80">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
