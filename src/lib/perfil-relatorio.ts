/**
 * Relatório do Perfil Comportamental para imprimir ou salvar em PDF — mesmo modelo do CRM MoveAtuati,
 * com a logo da MN Patrimônios. Abre numa janela nova (A4 paisagem na impressão).
 */
import { PERFIS, profileReading, ranked, type Eixo, type ProfileScores } from "@/domain/behavior-profile";
import { BRAND } from "@/lib/brand";

export type RelatorioPerfilInput = { id: string; nome: string; vaga: string; unidade: string; scores: ProfileScores; respondidoEm: string; respostas: number };

function esc(value: unknown) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, ch => entities[ch] || ch);
}
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const list = (items: string[]) => items.map(i => `<li>${esc(i)}</li>`).join("");
const dataHora = (v: string) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}${v.length > 10 ? ` ${v.slice(11, 16)}` : ""}` : "—");

function eixoHtml(e: Eixo, classe: "blue" | "orange") {
  return `
    <section class="metric ${classe}" aria-label="${esc(e.titulo)}: ${esc(e.a)} ${fmt(e.av)}%, ${esc(e.b)} ${fmt(e.bv)}%">
      <div class="card-heading"><span class="dot"></span><div><h2>${esc(e.titulo)}</h2><p>${esc(e.sinal)}</p></div></div>
      <div class="metric-body">
        <div class="metric-figure"><strong>${fmt(e.av)}%</strong><span>${esc(e.a)}</span></div>
        <div class="donut" style="--pct:${e.av}" role="img" aria-label="${esc(e.a)} ${fmt(e.av)}%"></div>
        <div class="metric-figure secondary"><strong>${fmt(e.bv)}%</strong><span>${esc(e.b)}</span></div>
      </div>
      <div class="metric-note"><span class="circle-icon">${classe === "blue" ? "◎" : "◆"}</span><div><strong>${esc(e.lider.toUpperCase())} ${e.equilibrio ? "EM EQUILÍBRIO" : "EM DESTAQUE"}</strong><p>${esc(e.leitura)}</p></div></div>
    </section>`;
}

export function gerarHtmlRelatorioPerfil(input: RelatorioPerfilInput, logoUrl: string): string {
  const r = profileReading(input.scores);
  const nomes = input.nome.trim().split(/\s+/);
  const iniciais = nomes.slice(0, 2).map(n => n[0]?.toLocaleUpperCase("pt-BR") || "").join("");
  const principal = r.dominantes.map(n => `<span class="principal-item"><span class="principal-icon">${PERFIS[n].emoji}</span><span><strong>${esc(n)}</strong><small>${fmt(input.scores[n])}% das respostas</small></span></span>`).join("");
  const linhas = ranked(input.scores).map(s => `
    <div class="profile-line">
      <span class="animal" aria-hidden="true">${PERFIS[s.nome].emoji}</span>
      <strong class="profile-label">${esc(s.nome)}</strong>
      <span class="rail"><span style="width:${s.pct}%;background:${PERFIS[s.nome].cor}"></span></span>
      <b>${fmt(s.pct)}%</b>
    </div>`).join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Perfil Comportamental — ${esc(input.nome)}</title>
<style>
:root{color-scheme:light;font-family:Inter,"Segoe UI",Arial,sans-serif;color:#102449;background:#eaf0f7}
*{box-sizing:border-box}
body{margin:0;background:#edf2f7;color:#092352}
.toolbar{max-width:1420px;margin:15px auto 0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;color:#365171;font-size:12px}
.print-button{background:#0d3769;color:#fff;border:0;border-radius:9px;padding:10px 17px;font-size:13px;font-weight:800;cursor:pointer}
.print-button:hover{background:#14539a}
.paper{max-width:1420px;margin:12px auto 28px;padding:15px;border-radius:16px;background:#fff;box-shadow:0 14px 50px #11294a26}
.top{display:flex;align-items:center;justify-content:space-between;gap:15px;min-height:60px;padding:0 6px 12px}
.brand{display:flex;gap:10px;align-items:center;min-width:0}
.brand img{height:44px;max-width:220px;object-fit:contain}
.brand-fallback{display:none;font-size:20px;font-weight:950;letter-spacing:-.6px;color:#0b3364}
.brand-fallback small{display:block;font-size:9px;font-weight:700;letter-spacing:1.3px}
.report-title{text-align:right}
.report-title h1{margin:0;font-size:22px;font-weight:900;letter-spacing:-.7px}
.report-title p{margin:3px 0 0;font-size:11px;color:#4b688a;text-transform:uppercase;font-weight:700}
.hero{display:flex;align-items:center;gap:20px;min-height:149px;margin-bottom:12px;border-radius:11px;padding:18px 23px;background:radial-gradient(circle at 70% 18%,#1477d25e,transparent 50%),linear-gradient(118deg,#031d49 0%,#07438c 63%,#052d61 100%);position:relative;overflow:hidden;color:white}
.hero:after{content:"";position:absolute;pointer-events:none;inset:0;background:linear-gradient(125deg,transparent 58%,#7db8fa16 59%,transparent 72%),radial-gradient(circle at 99% 99%,#00acff22,transparent 27%)}
.avatar{position:relative;z-index:1;display:grid;place-items:center;flex:none;width:113px;height:113px;border-radius:50%;border:4px solid #f5f8ff;background:linear-gradient(145deg,#0e6bb3,#042450);font-size:40px;letter-spacing:-2px;font-weight:900;box-shadow:0 6px 22px #00173577}
.hero-name{position:relative;z-index:1;min-width:0;flex:1}
.hero-name h2{font-size:clamp(26px,3.1vw,45px);line-height:1.06;margin:0;letter-spacing:-1.4px}
.hero-name .job{margin:5px 0 0;font-size:16px;color:#ecf4ff}
.hero-name .focus{border-top:1px solid #a1c8ec80;margin:11px 0 0;padding-top:9px;max-width:680px;font-size:13px;color:#e3effe;line-height:1.45}
.hero-side{position:relative;z-index:1;padding-left:14px;border-left:2px solid #fdc65e;width:185px;flex:none;align-self:center}
.hero-side span{display:block;font-size:12px;font-weight:800;letter-spacing:1.5px;line-height:1.65}
.top-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-bottom:11px}
.metric,.dominant,.card{min-width:0;border:1px solid #deebf8;border-radius:12px;background:#fff}
.metric{padding:13px 14px 10px}
.metric.blue{background:linear-gradient(125deg,#eef8ff,#f9fcff);--accent:#117ad2;--accent2:#7accfb}
.metric.orange{background:linear-gradient(125deg,#fff8eb,#fffefa);--accent:#ff9d13;--accent2:#ffd083}
.card-heading{display:flex;gap:9px;align-items:start}
.dot{width:11px;height:11px;border-radius:50%;background:var(--accent);margin-top:4px;flex:none}
.card-heading h2,.section-title{margin:0;font-size:15px;color:#102653;font-weight:900;text-transform:uppercase;letter-spacing:-.15px}
.card-heading p{margin:3px 0 0;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:#425f83}
.metric-body{display:grid;grid-template-columns:1fr 88px 1fr;align-items:center;gap:9px;padding:10px 0 9px}
.metric-figure strong{display:block;font-size:clamp(23px,2.4vw,40px);font-weight:950;letter-spacing:-1.6px;color:#0a1a3a;line-height:1}
.metric-figure span{display:block;margin-top:4px;font-size:12px;font-weight:850;color:#122948}
.metric-figure.secondary{text-align:right}
.metric-figure.secondary strong{font-size:clamp(20px,2vw,30px)}
.donut{width:88px;height:88px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--pct)*1%),#d7e5f4 0);position:relative;margin:auto}
.donut:before{content:"";position:absolute;inset:17px;background:#f8fbff;border-radius:50%}
.orange .donut:before{background:#fffaf1}
.metric-note{display:flex;gap:10px;align-items:center;border-radius:9px;background:#dceffd88;padding:9px 10px;min-height:58px}
.orange .metric-note{background:#fff0d4bb}
.circle-icon{font-size:24px;color:var(--accent);width:29px;text-align:center;flex:none}
.metric-note strong{font-size:10.7px;font-weight:900;display:block}
.metric-note p{font-size:10px;color:#39577b;margin:3px 0 0;line-height:1.4}
.dominant{background:linear-gradient(135deg,#eff8ff,#f8fbff);padding:14px 18px}
.dominant .section-title{margin-bottom:11px}
.principal{display:flex;flex-wrap:wrap;gap:10px 16px}
.principal-item{display:flex;align-items:center;gap:12px}
.principal-icon{font-family:"Apple Color Emoji","Segoe UI Emoji",sans-serif;font-size:56px;line-height:1}
.principal-item strong{display:block;font-size:25px;line-height:1.1;color:#0a1a3b}
.principal-item small{display:block;font-size:13px;font-weight:800;margin-top:4px}
.dominant p{border-top:1px solid #b5d2eb;margin:12px 0 0;padding-top:10px;font-size:11.5px;line-height:1.48;color:#355473}
.content-grid{display:grid;grid-template-columns:1fr 2fr;gap:11px;align-items:stretch}
.profile-card{padding:14px 16px;background:linear-gradient(135deg,#f2f9ff,#fff);display:flex;flex-direction:column}
.profile-card .section-title{margin-bottom:15px}
.profile-list{display:flex;flex-direction:column;justify-content:space-evenly;gap:11px;flex:1}
.profile-line{display:grid;grid-template-columns:32px 72px 1fr 45px;gap:9px;align-items:center}
.animal{font-family:"Apple Color Emoji","Segoe UI Emoji",sans-serif;font-size:28px;line-height:1}
.profile-label{font-size:13px}
.rail{height:13px;border-radius:5px;background:#dce8f4;overflow:hidden}
.rail>span{display:block;height:100%;border-radius:4px}
.profile-line b{font-size:13px;text-align:right}
.analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-card{padding:12px 14px}
.info-card .section-title{font-size:12px;display:flex;gap:7px;align-items:center}
.info-card .icon{display:grid;place-items:center;background:#e5f4ff;color:#1a85e8;border-radius:50%;width:25px;height:25px;flex:none;font-size:14px}
.info-card.warm .icon{background:#fff1d8;color:#e99111}
.info-card ul{margin:9px 0 0;padding:0;list-style:none}
.info-card li{display:flex;align-items:flex-start;gap:6px;font-size:11px;line-height:1.37;color:#334769;margin-bottom:6px}
.info-card li:before{content:"";display:block;width:6px;height:6px;border-radius:50%;flex:none;background:#228bf5;margin-top:5px}
.info-card.warm li:before{background:#f3a21d}
.info-card .tip{margin:7px 0 0;font-size:10.5px;color:#4a6788;line-height:1.35}
.info-card.values{grid-column:1/-1}
.values ul{display:grid;grid-template-columns:repeat(3,1fr);gap:0 10px}
.bottom{display:flex;align-items:start;justify-content:space-between;gap:16px;border-top:1px solid #d9e5f2;margin-top:11px;padding:9px 3px 2px;color:#56708d}
.bottom p{margin:0;font-size:9.3px;line-height:1.45}
.bottom strong{color:#143c69}
.results-metadata{font-size:9px;color:#5e7998;margin:0 0 5px}
@media screen and (max-width:1020px){
 .top-grid{grid-template-columns:1fr 1fr}
 .dominant{grid-column:1/-1}
 .content-grid{grid-template-columns:1fr}
 .profile-list{display:grid;grid-template-columns:1fr 1fr}
 .hero-side{display:none}
}
@media screen and (max-width:680px){
 .toolbar{margin:0;padding:10px 12px;background:#fff}
 .toolbar span{font-size:10px}
 .paper{border-radius:0;box-shadow:none;padding:12px;margin:0}
 .top{padding:0 1px 10px;gap:8px;align-items:center}
 .brand img{height:28px;max-width:145px}
 .brand-fallback{font-size:14px}
 .brand-fallback small{font-size:7px}
 .report-title h1{font-size:15px}
 .report-title p{font-size:9px}
 .hero{padding:14px;min-height:120px;gap:11px;margin-bottom:9px}
 .avatar{height:74px;width:74px;border-width:3px;font-size:24px}
 .hero-name h2{font-size:28px;letter-spacing:-1px}
 .hero-name .job{font-size:12px}
 .hero-name .focus{font-size:11px;padding-top:7px;margin-top:7px}
 .top-grid{grid-template-columns:1fr;gap:8px;margin-bottom:8px}
 .metric{padding:12px}
 .metric-body{grid-template-columns:1fr 80px 1fr}
 .donut{width:80px;height:80px}
 .donut:before{inset:16px}
 .metric-figure strong{font-size:30px}
 .dominant{grid-column:auto}
 .principal-icon{font-size:44px}
 .content-grid{grid-template-columns:1fr;gap:8px}
 .profile-card{padding:13px}
 .profile-list{display:flex;gap:10px}
 .profile-line{grid-template-columns:29px 66px 1fr 42px}
 .analysis-grid{grid-template-columns:1fr 1fr;gap:8px}
 .info-card{padding:11px}
 .info-card .section-title{font-size:11px}
 .info-card li{font-size:10.5px}
 .values ul{grid-template-columns:1fr 1fr}
 .bottom{flex-direction:column;gap:5px}
}
@media screen and (max-width:420px){
 .analysis-grid{grid-template-columns:1fr}
 .values ul{grid-template-columns:1fr}
 .metric-body{grid-template-columns:1fr 77px 1fr}
 .donut{width:77px;height:77px}
 .donut:before{inset:15px}
 .hero{gap:9px;padding:12px}
 .avatar{width:67px;height:67px}
 .hero-name h2{font-size:24px}
 .brand img{height:24px;max-width:125px}
 .report-title h1{font-size:13px}
 .report-title p{font-size:8px}
}
/* O driver pode impor retrato. Nunca fixar um conteúdo de 287 mm numa folha de 200 mm. */
@page{size:297mm 210mm;margin:5mm}
@media print{
 *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
 html,body{width:auto!important;height:auto!important;min-width:0;background:#fff;margin:0;padding:0}
 .toolbar{display:none!important}
 .paper{width:100%!important;max-width:none!important;min-width:0;min-height:0;max-height:none!important;overflow:visible;padding:0;margin:0;box-shadow:none;border:0;border-radius:0}
 .top{min-height:11mm;padding:0 1mm 1.5mm;gap:3mm}
 .brand img{height:10mm;max-width:53mm}
 .brand-fallback{font-size:14pt}
 .report-title h1{font-size:14pt}
 .report-title p{font-size:7pt}
 .hero{min-height:29mm;height:auto;margin-bottom:2mm;border-radius:2.2mm;padding:2.6mm 4mm;gap:4mm}
 .avatar{width:24mm;height:24mm;font-size:26pt;border-width:.8mm}
 .hero-name h2{font-size:24pt}
 .hero-name .job{font-size:10pt;margin-top:1mm}
 .hero-name .focus{font-size:8.2pt;padding-top:1.5mm;margin-top:1.5mm}
 .hero-side{display:block;width:43mm;padding-left:3mm}
 .hero-side span{font-size:7.2pt}
 .top-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:2mm;margin-bottom:2mm}
 .dominant{grid-column:auto!important}
 .hero-side{display:block!important}
 .metric,.dominant{height:auto;min-height:42mm;padding:2.3mm 2.6mm;border-radius:2.3mm}
 .card-heading h2,.section-title{font-size:9pt}
 .card-heading p{font-size:6.8pt}
 .metric-body{grid-template-columns:1fr 19mm 1fr;gap:2mm;padding:2mm 0}
 .metric-figure strong,.metric-figure.secondary strong{font-size:20pt}
 .metric-figure span{font-size:7.7pt}
 .donut{height:19mm;width:19mm}
 .donut:before{inset:3.6mm}
 .metric-note{min-height:11mm;padding:1.4mm 2mm;gap:1mm}
 .metric-note strong{font-size:7pt}
 .metric-note p{font-size:6.6pt;margin-top:.5mm}
 .circle-icon{font-size:13pt;width:7mm}
 .dominant .section-title{margin-bottom:2mm}
 .principal{gap:1.5mm}
 .principal-icon{font-size:30pt}
 .principal-item strong{font-size:16pt}
 .principal-item small{font-size:8pt}
 .dominant p{font-size:7.3pt;margin-top:2mm;padding-top:2mm;line-height:1.4}
 .content-grid{display:grid!important;grid-template-columns:1fr 2fr!important;gap:2mm;align-items:stretch}
 .analysis-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:2mm}
 .values ul{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 .profile-card{padding:2.7mm 3mm}
 .profile-card .section-title{margin-bottom:3mm}
 .profile-list{display:flex;gap:2.6mm}
 .profile-line{grid-template-columns:7mm 16mm 1fr 11mm;gap:1.5mm}
 .animal{font-size:16pt}
 .profile-label,.profile-line b{font-size:8.2pt}
 .rail{height:2.6mm}
 .info-card{padding:2.2mm 2.5mm}
 .info-card .section-title{font-size:7.8pt}
 .info-card .icon{width:5.2mm;height:5.2mm;font-size:8.4pt}
 .info-card ul{margin-top:1.3mm}
 .info-card li{font-size:7pt;line-height:1.25;margin-bottom:.75mm;gap:1.2mm}
 .info-card li:before{width:1.1mm;height:1.1mm;margin-top:1.45mm}
 .info-card .tip{font-size:6.6pt;margin-top:.9mm}
 .values ul{gap:0 2mm}
 .bottom{margin-top:2mm;padding-top:1.5mm}
 .bottom p,.results-metadata{font-size:6.5pt}
 /* Empates podem reunir duas leituras completas. Encaixar sem truncar conteúdo. */
 .paper.multi-profile{width:111.1111%!important;zoom:.90}
 .paper.multi-profile .metric,.paper.multi-profile .dominant{min-height:39mm}
 .paper.multi-profile .info-card{padding:1.7mm 2mm}
 .paper.multi-profile .info-card li{margin-bottom:.55mm;line-height:1.18}
 .paper.multi-profile .dominant .principal-icon{font-size:26pt}
 .top,.hero,.top-grid,.content-grid,.metric,.dominant,.profile-card,.info-card,.bottom{break-inside:avoid;page-break-inside:avoid}
 html,body,.paper{orphans:2;widows:2}
}

.brand img{background:#fff;border-radius:8px;padding:4px 8px}
</style>
</head>
<body>
<div class="toolbar"><span>${esc(BRAND.name)} · na impressão, A4 paisagem</span><button class="print-button" type="button" id="imprimir">Imprimir / salvar PDF</button></div>
<main class="paper ${r.dominantes.length > 1 ? "multi-profile" : ""}" aria-label="Resultado do Perfil Comportamental">
  <header class="top">
    <div class="brand">
      <img src="${esc(logoUrl)}" alt="${esc(BRAND.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span class="brand-fallback">${esc(BRAND.name.toUpperCase())}<small>GESTÃO DE PESSOAS</small></span>
    </div>
    <div class="report-title"><h1>Perfil Comportamental</h1><p>${esc(input.vaga)} · ${esc(input.unidade || "Unidade não informada")}</p></div>
  </header>
  <section class="hero">
    <div class="avatar" aria-label="Identificação sem fotografia">${esc(iniciais || "•")}</div>
    <div class="hero-name">
      <h2>${esc(input.nome)}</h2>
      <p class="job">${esc(input.vaga)} · ${esc(input.unidade || "Unidade não informada")}</p>
      <p class="focus">${esc(r.foco)} — tendências sugeridas pelo questionário, a confirmar com exemplos.</p>
    </div>
    <div class="hero-side"><span>PERFIL<br>COMPORTAMENTAL<br>RESULTADOS</span></div>
  </section>

  <section class="top-grid">
    ${eixoHtml(r.agir, "blue")}
    ${eixoHtml(r.orientacao, "orange")}
    <section class="dominant"><h2 class="section-title">${r.dominantes.length > 1 ? "Perfis predominantes · empate" : "Perfil predominante"}</h2><div class="principal">${principal}</div><p>${esc(r.descricao)}</p></section>
  </section>

  <div class="content-grid">
    <section class="card profile-card"><h2 class="section-title">Os quatro perfis</h2>
      <div class="profile-list">${linhas}</div>
    </section>
    <section class="analysis-grid" aria-label="Leitura comportamental">
      <article class="card info-card"><h2 class="section-title"><span class="icon">★</span>Características predominantes</h2><ul>${list(r.caracteristicas)}</ul></article>
      <article class="card info-card warm"><h2 class="section-title"><span class="icon">↗</span>Pontos de melhoria</h2><ul>${list(r.pontosMelhoria)}</ul></article>
      <article class="card info-card"><h2 class="section-title"><span class="icon">➤</span>Como tende a agir</h2><ul>${list(r.comoAge)}</ul><p class="tip">${esc(r.notaAgir)}</p></article>
      <article class="card info-card warm"><h2 class="section-title"><span class="icon">◆</span>Como tende a decidir</h2><ul>${list(r.comoDecide)}</ul><p class="tip">${esc(r.notaDecidir)}</p></article>
      <article class="card info-card values"><h2 class="section-title"><span class="icon">◇</span>Forças e fatores de atuação</h2><ul>${list(r.forcas)}</ul></article>
    </section>
  </div>

  <footer class="bottom">
    <div>
      <div class="results-metadata">
        <span>${input.respostas} respostas · 1 ponto por resposta.</span>
        <span>Avaliação ${esc(input.id)} · ${esc(dataHora(input.respondidoEm))}</span>
      </div>
      <p><strong>Leitura descritiva:</strong> tendências do autorrelato. Não é laudo psicológico nem decisão automática de contratação. Pontos de melhoria são temas a desenvolver, não dificuldades comprovadas.</p>
    </div>
  </footer>
</main>
</body>
</html>`;
}

/** Abre o relatório numa janela nova, pronto para imprimir. Retorna mensagem de erro, se houver. */
export function abrirRelatorioPerfil(input: RelatorioPerfilInput): string | null {
  const janela = window.open("", "_blank");
  if (!janela) return "O navegador bloqueou a janela do relatório. Permita pop-ups para este site e tente de novo.";
  const logo = new URL(BRAND.logoUrl, window.location.origin).href;
  janela.document.write(gerarHtmlRelatorioPerfil(input, logo));
  janela.document.close();
  janela.document.getElementById("imprimir")?.addEventListener("click", async () => {
    await janela.document.fonts.ready;
    janela.focus();
    janela.print();
  });
  return null;
}
