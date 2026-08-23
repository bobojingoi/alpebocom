/*
 * Pre-randare: scrie câte un .html cu conținut real pentru fiecare rută —
 * crawlerele AI nu execută JavaScript. Modelul e prerender.mjs din roots,
 * simplificat: o singură limbă (ro), fără hreflang.
 *
 * Rulează DUPĂ `vite build`, peste `dist/`:
 *   /proiecte  ->  dist/proiecte/index.html
 * Vercel servește fișierul static direct, fără rewrite.
 *
 * Rulare: npm run build (sau `node prerender.mjs` peste un dist/ existent)
 */
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = "dist";

/* Rutele statice — oglindesc lista din src/App.jsx. */
const STATIC_ROUTES = [
  "/",
  "/proiecte",
  "/blog",
  "/termeni-si-conditii",
  "/politica-de-confidentialitate",
  "/politica-cookies",
];

/* fileURLToPath, nu pathname: pe Linux `pathname` începe cu „/", iar tăierea
   lui producea o cale RELATIVĂ și build-ul pica pe Vercel (lecția Roots). */
const mod = (p) => fileURLToPath(new URL("./node_modules/" + p, import.meta.url));

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) {
  console.error('[prerender] dist/index.html nu conține <div id="root"></div> — rulează întâi `vite build`');
  process.exit(1);
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Head per rută. Fără asta fiecare pagină generată ar purta title/description/
   canonical-ul homepage-ului — i-ar spune Google „nu sunt canonică". */
function applyMeta(html, meta, canonical, schemas = [], ogImage = "") {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
    .replace(/<meta property="og:description"[^>]*\/>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
    .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:image"[^>]*\/>/, `<meta property="og:image" content="${esc(ogImage)}" />`);

  /* `</script>` din date ar închide devreme blocul, de aici escaparea. */
  const blocuri = schemas
    .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2).replace(/<\//g, "<\\/")}\n</script>`)
    .join("\n    ");
  out = out.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    () => blocuri || "<!-- fără schema pentru această pagină -->"
  );
  return out;
}

const vite = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  // react-router v7 rezolvă pe condiția "node" către build-ul CJS, care pică la
  // evaluare în ESM. Forțăm build-urile .mjs — vezi și ssr-smoke.mjs.
  resolve: {
    alias: [
      { find: /^react-router-dom$/, replacement: mod("react-router-dom/dist/index.mjs") },
      { find: /^react-router$/, replacement: mod("react-router/dist/development/index.mjs") },
      { find: /^react-router\/dom$/, replacement: mod("react-router/dist/development/dom-export.mjs") },
    ],
  },
});

let written = 0;
let failed = 0;

try {
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  const { StaticRouter } = await vite.ssrLoadModule("react-router-dom");
  // aceeași sursă de metadate ca a clientului — un singur loc de schimbat
  const { metaForRoute, canonicalFor, NOT_FOUND_META, ogImageForRoute } = await vite.ssrLoadModule("/src/seo.js");
  const { schemasForRoute } = await vite.ssrLoadModule("/src/schema.js");
  /* conținutul disponibil la build (snapshot Hub peste DEFAULT_CONTENT) —
     de aici vin slugurile proiectelor */
  const { BUILD_CONTENT } = await vite.ssrLoadModule("/src/Alpebocom.jsx");
  const { default: posts } = await vite.ssrLoadModule("virtual:hub-posts");

  const routes = [
    ...STATIC_ROUTES,
    ...(BUILD_CONTENT.projects.items || []).filter((p) => p && p.slug).map((p) => "/proiecte/" + p.slug),
    ...posts.filter((p) => p && p.slug).map((p) => "/blog/" + p.slug),
  ];

  const renderRoute = (route) => {
    globalThis.__ALPEBO_PATH = route;
    const html = renderToString(
      React.createElement(StaticRouter, { location: route }, React.createElement(App))
    );
    /* Gardă: un <style> cu entități HTML înseamnă că cineva a scris
       <style>{css}</style> în loc de dangerouslySetInnerHTML — CSS-ul ar fi
       invalid fără JS și hidratarea ar pica pe fiecare pagină. */
    if (/<style[^>]*>[^<]*&(quot|#x27|#39|amp);/.test(html)) {
      throw new Error("CSS escapat într-un <style> — folosește dangerouslySetInnerHTML");
    }
    return html;
  };
  const urls = [];

  for (const route of routes) {
    let appHtml;
    try {
      appHtml = renderRoute(route);
    } catch (e) {
      failed++;
      console.error(`[prerender] EȘEC ${route}: ${String((e && e.message) || e).split("\n")[0]}`);
      continue;
    }
    const post = route.startsWith("/blog/") ? posts.find((p) => "/blog/" + p.slug === route) : null;
    const meta = metaForRoute(route, BUILD_CONTENT, post);
    const html = applyMeta(template, meta, canonicalFor(route), schemasForRoute(route, BUILD_CONTENT), ogImageForRoute(route, BUILD_CONTENT))
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    const outDir = route === "/" ? DIST : path.join(DIST, route);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), html);
    urls.push(canonicalFor(route));
    written++;
    console.log(`[prerender] ${route}  (${(html.length / 1024).toFixed(0)} KB)`);
  }

  /* sitemap.xml cu exact paginile pre-randate (canonicalele lor); robots.txt îl
     referă. Paginile publicate după build intră la următorul deploy. */
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
  console.log(`[prerender] /sitemap.xml (${urls.length} URL-uri)`);

  /* 404 real: Vercel servește dist/404.html cu status 404 pentru orice cale
     care nu se potrivește cu un fișier static sau un rewrite. */
  try {
    const appHtml = renderRoute("/pagina-negasita-404");
    const html = applyMeta(template, NOT_FOUND_META, "", [])
      .replace(/\s*<link rel="canonical"[^>]*\/>/, "")
      .replace(/\s*<meta property="og:url"[^>]*\/>/, "")
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    fs.writeFileSync(path.join(DIST, "404.html"), html);
    written++;
    console.log("[prerender] /404.html");
  } catch (e) {
    failed++;
    console.error(`[prerender] EȘEC 404.html: ${String((e && e.message) || e).split("\n")[0]}`);
  }

  /* Shell fără conținut, pentru rutele servite ca SPA: articolele și proiectele
     publicate DUPĂ build (vezi rewrites în vercel.json). Fără el, acelea ar
     primi HTML-ul altei pagini și ar hidrata peste conținut greșit. Îi scoatem
     canonical-ul, og:url-ul și JSON-LD-ul — sunt ale homepage-ului; lipsa lor
     e mai bună decât valori greșite (clientul le pune corect la montare). */
  const shell = template
    .replace(/\s*<link rel="canonical"[^>]*\/>/, "")
    .replace(/\s*<meta property="og:url"[^>]*\/>/, "")
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");
  fs.writeFileSync(path.join(DIST, "spa.html"), shell);
} finally {
  await vite.close();
}

console.log(
  failed
    ? `\n[prerender] ${written} pagini scrise, ${failed} eșecuri`
    : `\n[prerender] ${written} pagini pre-randate cu succes`
);
process.exit(failed ? 1 : 0);
