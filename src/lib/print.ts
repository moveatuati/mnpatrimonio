/**
 * Imprime somente um trecho da tela, numa folha A4 limpa (sem menu, sem páginas em branco).
 * Usa um iframe invisível com os estilos da aplicação + regras de impressão compactas.
 */
export function printNode(node: HTMLElement | null, options: { title: string; landscape?: boolean }) {
  if (!node || typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); return; }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML).join("\n");
  const orientation = options.landscape ? "landscape" : "portrait";
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${location.origin}/">
<title>${options.title.replace(/</g, "")}</title>${styles}
<style>
  @page { size: A4 ${orientation}; margin: 7mm; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif; }
  .print-root { width: 100%; }
  .print-root * { box-shadow: none !important; }
  .print-root .no-print, .print-root .print-hide, .print-root button { display: none !important; }
  .print-root .print-show { display: flex !important; }
  .print-root .ra-scroll, .print-root .bm-rank { max-height: none !important; overflow: visible !important; border: 0 !important; }
  .print-root table { page-break-inside: auto; }
  .print-root tr { page-break-inside: avoid; }
</style></head><body><div class="print-root print-compact">${node.outerHTML}</div></body></html>`);
  doc.close();
  const go = () => {
    try { win.focus(); win.print(); } finally { window.setTimeout(() => iframe.remove(), 1500); }
  };
  // Espera estilos e logo carregarem (no máximo 2,5 s) antes de abrir a impressão.
  const pending = [
    ...Array.from(doc.querySelectorAll('link[rel="stylesheet"]')),
    ...Array.from(doc.images).filter(img => !img.complete),
  ].map(el => new Promise<void>(resolve => {
    el.addEventListener("load", () => resolve(), { once: true });
    el.addEventListener("error", () => resolve(), { once: true });
  }));
  Promise.race([Promise.all(pending), new Promise(resolve => window.setTimeout(resolve, 2500))])
    .then(() => window.setTimeout(go, 120));
}
