import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/brand";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { MapPin, Menu, ShieldCheck, X } from "lucide-react";
import { NAV } from "./nav";
import { UNIT } from "@/domain/config";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);

  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? "Navegação móvel" : "Navegação principal"}
      className="formosa-shell-nav space-y-1"
    >
      {NAV.map(({ to, label, icon: Icon }, index) => (
        <Fragment key={to}>
          {index === 1 && (
            <p className="formosa-shell-nav-label px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em]">
              Gestão de pessoas
            </p>
          )}
          <Link
            to={to}
            activeOptions={{ exact: to === "/" }}
            onClick={() => setMobileOpen(false)}
            className="formosa-shell-nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors"
            activeProps={{ className: "formosa-shell-nav-active" }}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span>{label}</span>
            {to !== "/" && to !== "/colaboradores" && to !== "/escala" && to !== "/ponto" && to !== "/ferias" && to !== "/banco-de-horas" && to !== "/relatorios" && to !== "/simulador" && to !== "/regras" && <span className="sr-only"> — módulo em preparação</span>}
          </Link>
        </Fragment>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <a
        href="#main-content"
        className="formosa-skip-link no-print sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg"
      >
        Ir para o conteúdo
      </a>
      <aside className="formosa-shell-sidebar no-print hidden w-[232px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen">
        <div className="formosa-shell-brand px-6 pb-6 pt-7">
          <div className="flex w-fit items-center rounded-xl bg-white px-4 py-3">
            <img src={BRAND.logoUrl} alt={BRAND.name} className="h-auto w-[128px]" />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
            Gestão de Pessoas
          </p>
          <div className="formosa-shell-unit mt-6 border-t border-sidebar-border pt-5">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/60">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Unidade piloto
            </p>
            <p className="mt-2 text-sm font-semibold text-sidebar-foreground">{UNIT.unit}</p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">{UNIT.city}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">{navigation()}</div>
        <div className="formosa-shell-demo mx-5 mb-5 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Demonstração
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/60">
            Dados fictícios para avaliação. Sem registro oficial de ponto.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="formosa-shell-mobile no-print border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={BRAND.logoUrl}
                alt={BRAND.name}
                className="h-9 w-auto max-w-[78px] object-contain"
              />
              <div className="border-l border-border pl-3">
                <p className="text-xs font-semibold text-foreground">Gestão de Pessoas</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{UNIT.unit}</p>
              </div>
            </div>
            <button
              ref={mobileMenuButton}
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              aria-controls="formosa-mobile-menu"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <div
            id="formosa-mobile-menu"
            hidden={!mobileOpen}
            className="mt-4 border-t border-border pt-3"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMobileOpen(false);
                mobileMenuButton.current?.focus();
              }
            }}
          >
            {navigation(true)}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Ambiente de demonstração · dados fictícios.
            </p>
          </div>
        </div>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
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
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
