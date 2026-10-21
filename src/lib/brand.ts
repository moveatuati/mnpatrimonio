import logoAsset from "@/assets/mn-patrimonios-logo-3d.png.asset.json";

/** Identidade da marca apresentada pelo sistema (rebrand MN Patrimônios). */
export const BRAND = {
  name: "MN Patrimônios",
  legalName: "MN Patrimônios Assessoria, Consultoria e Serviços Imobiliários",
  logoUrl: logoAsset.url,
} as const;

/** Endereço público do sistema: os links enviados a candidatos sempre usam este domínio. */
export const PUBLIC_SITE_URL = "https://mnpatrimonio.moveatuati.com";

/**
 * Origem usada nos links enviados para fora (candidato no celular).
 * Na pré-visualização do Lovable ou em localhost o endereço exige login ou não existe
 * fora do computador, então usamos o domínio publicado.
 */
export function publicOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  const host = window.location.hostname;
  return host.endsWith("moveatuati.com") ? window.location.origin : PUBLIC_SITE_URL;
}
