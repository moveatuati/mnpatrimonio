import { useEffect, useState } from "react";
import { Camera, Check, FolderOpen, Info, Send, Sparkles } from "lucide-react";
import { DOC_LIST, type DocId } from "@/domain/candidate-docs";
import { sampleDocImage } from "@/domain/candidates";
import { BRAND } from "@/lib/brand";
import "./CandidateInterviewPage.css";

/**
 * Página do celular: envio de documentos do candidato aprovado (DEMONSTRAÇÃO).
 * As fotos ficam só nesta tela; nada é enviado para um servidor nesta fase.
 */
export function CandidateDocsPage() {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<Partial<Record<DocId, string>>>({});
  const [sent, setSent] = useState(false);
  useEffect(() => { setName(new URLSearchParams(window.location.search).get("n") ?? ""); }, []);
  const done = DOC_LIST.filter(d => files[d.id]).length;
  const complete = done === DOC_LIST.length;

  function pick(id: DocId, file?: File) {
    if (!file) return;
    setFiles(f => ({ ...f, [id]: URL.createObjectURL(file) }));
  }
  function fillExample() {
    setFiles(Object.fromEntries(DOC_LIST.map(d => [d.id, sampleDocImage(d.short, name || "Candidato")])));
  }

  return <div className="ci-page">
    <header className="ci-top">
      <img src={BRAND.logoUrl} alt={BRAND.name} className="ci-logo" />
      <div><b>{BRAND.name}</b><span>Envio de documentos</span></div>
    </header>
    <p className="ci-demo"><Info size={14} /> Demonstração: as fotos ficam só nesta tela, nada é gravado.</p>

    {sent ? <main className="ci-card ci-center">
      <span className="ci-done"><Check size={30} /></span>
      <h1>Documentos enviados!</h1>
      <p>Obrigado{name ? `, ${name}` : ""}. A <b>{BRAND.name}</b> recebeu seus documentos e vai entrar em contato pelo WhatsApp.</p>
      <p className="ci-small">No sistema, o recrutador recebe o aviso “Novo! {name || "Candidato"} enviou documentos”.</p>
      <button className="ci-btn ci-btn-ghost" onClick={() => { setFiles({}); setSent(false); }}>Ver de novo desde o início</button>
    </main> : <main className="ci-card">
      <p className="ci-eyebrow">Etapa 3 · Contratação</p>
      <h1>Olá{name ? `, ${name}` : ""}!</h1>
      <p>Parabéns pela aprovação! Envie os documentos abaixo. <b>Pode tirar foto com o celular</b>, com boa luz e sem cortar as bordas.</p>
      <p className="ci-count"><b>{done} de {DOC_LIST.length}</b> enviados</p>
      <div className="ci-progress ci-progress-ok"><span style={{ width: `${(done / DOC_LIST.length) * 100}%` }} /></div>

      <ul className="ci-docs">{DOC_LIST.map(d => {
        const url = files[d.id];
        return <li key={d.id} className={url ? "ci-doc ci-doc-ok" : "ci-doc"}>
          <div className="ci-doc-top">
            {url ? <img src={url} alt="" className="ci-doc-thumb" /> : null}
            <b>{d.label}</b>
            {url && <span className="ci-doc-tick"><Check size={15} /> Enviado</span>}
          </div>
          <div className="ci-doc-btns">
            <label className={url ? "ci-btn ci-btn-ghost" : "ci-btn ci-btn-primary"}><Camera size={18} /> {url ? "Tirar outra" : "Tirar foto"}
              <input type="file" accept="image/*" capture="environment" hidden onChange={e => pick(d.id, e.target.files?.[0])} /></label>
            <label className="ci-btn ci-btn-ghost"><FolderOpen size={18} /> Escolher arquivo
              <input type="file" accept="image/*,application/pdf" hidden onChange={e => pick(d.id, e.target.files?.[0])} /></label>
          </div>
        </li>;
      })}</ul>

      <button className="ci-btn ci-btn-wa" disabled={!complete} onClick={() => setSent(true)}><Send size={18} /> Enviar tudo para a MN</button>
      {!complete && <p className="ci-small">O botão libera quando todos os documentos forem enviados.</p>}
      <button className="ci-link-btn" onClick={fillExample}><Sparkles size={14} /> Preencher com imagens de exemplo (demonstração)</button>
    </main>}
    <footer className="ci-foot">{BRAND.legalName}</footer>
  </div>;
}
