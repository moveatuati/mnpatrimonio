import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { NAV } from "./nav";
import { UNIT } from "@/domain/config";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="formosa-sidebar no-print hidden w-[244px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen">
        <div className="border-b border-sidebar-border px-5 pb-5 pt-6">
          <div className="formosa-logo-plaque relative isolate flex items-center justify-center rounded-2xl bg-card px-6 py-4">
            <img src="/formosa-logo.svg" alt="Formosa — logomarca oficial" className="h-auto w-full max-w-[176px]" />
          </div>
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/70">
            Gestão de Pessoas
          </p>
          <div className="formosa-pilot-card formosa-pilot-card-glass relative isolate mt-5 overflow-hidden rounded-2xl px-4 py-4">
            <div className="formosa-pilot-eyebrow flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
              <MapPin className="h-3.5 w-3.5" /> Unidade piloto
            </div>
            <p className="formosa-pilot-name mt-3 font-display text-[14px] font-bold text-primary-foreground">{UNIT.unit}</p>
            <p className="formosa-pilot-location mt-1 text-xs font-medium text-primary-foreground/85">{UNIT.city}</p>
          </div>
        </div>
        <div className="formosa-sidebar-menu flex min-h-0 flex-1 flex-col">
          <div className="px-6 pb-3 pt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/80">
            Menu de gestão
          </div>
          <nav aria-label="Navegação principal" className="formosa-sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 pb-5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="formosa-nav-link group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                activeProps={{ className: "formosa-nav-active" }}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-sidebar-border px-5 py-4">
            <div className="flex gap-2 text-sidebar-foreground/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-foreground" />
              <p className="text-[11px] leading-relaxed">
                Ambiente demonstrativo. Dados fictícios, sem registro oficial de ponto.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <img src="/formosa-logo.svg" alt="Formosa" className="h-[42px] w-auto max-w-[90px] object-contain" />
            <div className="border-l border-border pl-3">
              <p className="font-display text-sm font-semibold text-foreground">Gestão de Pessoas</p>
              <p className="text-xs text-muted-foreground">{UNIT.unit}</p>
            </div>
          </div>
        </div>
        <nav aria-label="Navegação móvel" className="no-print flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground"
              activeProps={{ className: "bg-accent text-primary" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="formosa-page-header relative isolate overflow-hidden bg-header px-5 pb-20 pt-8 text-primary-foreground md:px-8 md:pb-20 md:pt-9">
      <div aria-hidden="true" className="formosa-header-ribbon formosa-header-ribbon-one" />
      <div aria-hidden="true" className="formosa-header-ribbon formosa-header-ribbon-two" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-primary-foreground/80">
              {UNIT.system} · {UNIT.unit}
            </p>
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
