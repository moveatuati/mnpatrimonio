import { UNIT } from "@/domain/config";
import "./PrintHeader.css";

/** Cabeçalho padrão de toda impressão: logo Formosa, título e dados da unidade. */
export function PrintHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: string }) {
  return <header className="ph">
    <img src="/formosa-logo.svg" alt="Formosa" className="ph-logo" />
    <div className="ph-title">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="ph-right">
      <b>{UNIT.company} · {UNIT.unit}</b>
      <span>{right ?? "Setor: Operadora de caixa"}</span>
    </div>
  </header>;
}
