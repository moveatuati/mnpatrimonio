/**
 * Cadastro de clientes (condomínios atendidos) e de funções (vagas) da MN Patrimônios.
 * Regras puras, sem UI. Etapa 1: dados fictícios salvos só no navegador.
 */

export const CLIENTS_KEY = "mn-clientes-v1";

export type JobFunction = { id: string; name: string; description: string; active: boolean };
export type Condo = {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  district: string;
  city: string;
  uf: string;
  manager: string;
  phone: string;
  email: string;
  units: string;
  contractStart: string;
  active: boolean;
  notes: string;
  /** Postos contratados por função (id da função → quantidade). */
  posts: Record<string, number>;
};
export type ClientStore = { version: 1; seq: number; fnSeq: number; condos: Condo[]; functions: JobFunction[] };

export const DEFAULT_FUNCTIONS: JobFunction[] = [
  { id: "FN-01", name: "Agente de portaria", description: "Controle de acesso de moradores, visitantes e prestadores; recebimento de encomendas; rondas e comunicação com a administração.", active: true },
  { id: "FN-02", name: "Auxiliar de serviços gerais", description: "Limpeza e conservação das áreas comuns, apoio à manutenção, coleta de lixo e organização.", active: true },
];

export function emptyCondo(id = ""): Condo {
  return { id, name: "", cnpj: "", address: "", district: "", city: "Ananindeua", uf: "PA", manager: "", phone: "", email: "",
    units: "", contractStart: "", active: true, notes: "", posts: {} };
}

export function demoClients(): ClientStore {
  return {
    version: 1, seq: 2, fnSeq: 2, functions: DEFAULT_FUNCTIONS.map(f => ({ ...f })),
    condos: [
      { ...emptyCondo("COND-001"), name: "Condomínio Ananinville", address: "Rod. BR-316 (endereço fictício)", district: "Centro",
        manager: "Síndico(a) fictício(a)", phone: "(91) 9 8000-0001", units: "320", contractStart: "2026-01-02", posts: { "FN-01": 8, "FN-02": 6 } },
      { ...emptyCondo("COND-002"), name: "Residencial Jardim das Águas (fictício)", address: "Rua Exemplo, 100", district: "Coqueiro",
        manager: "Administradora fictícia", phone: "(91) 9 8000-0002", units: "180", contractStart: "2026-06-01", posts: { "FN-01": 4, "FN-02": 3 } },
    ],
  };
}

export function condoMissing(c: Condo, all: Condo[]): string[] {
  const out: string[] = [];
  if (!c.name.trim()) out.push("Nome do condomínio");
  if (!c.city.trim()) out.push("Cidade");
  if (!c.manager.trim()) out.push("Síndico(a) / responsável");
  if (c.phone.replace(/\D/g, "").length < 10) out.push("Telefone do responsável");
  const dup = all.some(x => x.id !== c.id && x.name.trim().toLocaleLowerCase("pt-BR") === c.name.trim().toLocaleLowerCase("pt-BR"));
  if (c.name.trim() && dup) out.push("Nome diferente (já existe um condomínio com este nome)");
  if (c.cnpj.trim() && c.cnpj.replace(/\D/g, "").length !== 14) out.push("CNPJ com 14 números");
  return out;
}

export function saveCondo(store: ClientStore, c: Condo): { store: ClientStore; id: string } | string {
  const missing = condoMissing(c, store.condos);
  if (missing.length) return `Complete: ${missing.join(", ")}.`;
  if (c.id && store.condos.some(x => x.id === c.id)) {
    return { store: { ...store, condos: store.condos.map(x => (x.id === c.id ? { ...c, name: c.name.trim() } : x)) }, id: c.id };
  }
  const seq = store.seq + 1;
  const id = `COND-${String(seq).padStart(3, "0")}`;
  return { store: { ...store, seq, condos: [...store.condos, { ...c, id, name: c.name.trim() }] }, id };
}

export function saveFunction(store: ClientStore, f: JobFunction): ClientStore | string {
  const name = f.name.trim();
  if (!name) return "Informe o nome da função.";
  if (store.functions.some(x => x.id !== f.id && x.name.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) return "Já existe uma função com este nome.";
  if (f.id && store.functions.some(x => x.id === f.id)) return { ...store, functions: store.functions.map(x => (x.id === f.id ? { ...f, name } : x)) };
  const fnSeq = store.fnSeq + 1;
  return { ...store, fnSeq, functions: [...store.functions, { ...f, id: `FN-${String(fnSeq).padStart(2, "0")}`, name }] };
}

export const totalPosts = (c: Condo) => Object.values(c.posts).reduce((a, b) => a + (b || 0), 0);

export function formatCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
export function restoreClients(raw: unknown): ClientStore {
  const r = raw as Partial<ClientStore> | null;
  if (!r || r.version !== 1 || !Array.isArray(r.condos) || !Array.isArray(r.functions)) return demoClients();
  const functions = r.functions.filter(f => f && typeof f.id === "string")
    .map(f => ({ id: f.id, name: str(f.name), description: str(f.description), active: f.active !== false }));
  const condos = r.condos.filter(c => c && typeof c.id === "string").map(c => {
    const posts: Record<string, number> = {};
    Object.entries(c.posts ?? {}).forEach(([k, v]) => { const n = Number(v); if (n > 0) posts[k] = Math.floor(n); });
    return { ...emptyCondo(c.id), name: str(c.name), cnpj: str(c.cnpj), address: str(c.address), district: str(c.district), city: str(c.city),
      uf: str(c.uf) || "PA", manager: str(c.manager), phone: str(c.phone), email: str(c.email), units: str(c.units),
      contractStart: str(c.contractStart), active: c.active !== false, notes: str(c.notes), posts };
  });
  return { version: 1, seq: Math.max(Number(r.seq) || 0, condos.length), fnSeq: Math.max(Number(r.fnSeq) || 0, functions.length), condos, functions };
}
