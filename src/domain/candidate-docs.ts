/**
 * Documentos pedidos ao candidato aprovado (etapa Ficha de emprego).
 * ETAPA DE DEMONSTRAÇÃO: os arquivos não vão para um servidor. No sistema, o recrutador usa
 * "Simular envio" para ver como chegam. Na fase com banco de dados os arquivos ficam no armazenamento seguro.
 * O recrutador lê o documento e digita os dados na ficha (sem leitura automática da foto).
 */

export const DOC_LIST = [
  { id: "identidade", label: "RG ou CNH (frente e verso)", short: "RG ou CNH" },
  { id: "cpf", label: "CPF", short: "CPF" },
  { id: "residencia", label: "Comprovante de residência", short: "Comprovante de residência" },
  { id: "ctps", label: "Carteira de trabalho digital", short: "Carteira de trabalho" },
  { id: "antecedentes", label: "Certidão de antecedentes criminais", short: "Antecedentes criminais" },
  { id: "foto", label: "Foto 3x4", short: "Foto 3x4" },
] as const;
export type DocId = (typeof DOC_LIST)[number]["id"];

/** `url` = imagem para visualizar (na demonstração, uma imagem de exemplo). */
export type DocFile = { name: string; at: string; url: string };
export type DocRequest = { requestedAt: string; files: Partial<Record<DocId, DocFile>>; seen: boolean };
export const emptyDocs = (): DocRequest => ({ requestedAt: "", files: {}, seen: true });

export const docsReceived = (d: DocRequest) => DOC_LIST.filter(x => d.files[x.id]).length;
export const docsComplete = (d: DocRequest) => docsReceived(d) === DOC_LIST.length;

/** Marca documentos como recebidos (novidade para o recrutador). */
export function receiveDocs(d: DocRequest, files: Partial<Record<DocId, DocFile>>): DocRequest {
  return { ...d, requestedAt: d.requestedAt || Object.values(files)[0]?.at || "", files: { ...d.files, ...files }, seen: false };
}

export const docsUrl = (origin: string, name: string) => `${origin}/documentos?n=${encodeURIComponent(name.trim().split(" ")[0] ?? "")}`;

export function docsMessage(name: string, url: string): string {
  const first = name.trim().split(" ")[0] || "candidato(a)";
  return `Olá, ${first}! Parabéns, você foi aprovado(a) na entrevista da MN Patrimônios.\n\nPara seguir com a contratação, envie seus documentos por este link (pode tirar foto com o celular):\n${url}\n\nDocumentos: ${DOC_LIST.map(x => x.short).join(", ")}.`;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
export function restoreDocs(raw: unknown): DocRequest {
  const r = raw as Partial<DocRequest> | null;
  if (!r || typeof r !== "object") return emptyDocs();
  const files: DocRequest["files"] = {};
  DOC_LIST.forEach(x => {
    const f = (r.files as Record<string, Partial<DocFile>> | undefined)?.[x.id];
    if (f && typeof f.url === "string") files[x.id] = { name: str(f.name), at: str(f.at), url: f.url };
  });
  return { requestedAt: str(r.requestedAt), files, seen: r.seen !== false };
}
