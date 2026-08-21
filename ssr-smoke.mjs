// Verifică dacă aplicația e sigură la pre-randare: importă modulele în Node
// prin Vite și randează fiecare rută cu renderToString — exact ce face
// prerender.mjs la build. Orice atingere de window/document în afara unui
// useEffect apare aici ca eroare, înainte să pice build-ul pe Vercel.
// Rulare: npm run ssr:check
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { fileURLToPath } from "node:url";

const ROUTES = [
  "/",
  "/proiecte",
  "/proiecte/exemplu-hala-industriala",
  "/blog",
  "/blog/exemplu-articol",
  "/termeni-si-conditii",
  "/politica-de-confidentialitate",
  "/politica-cookies",
  "/ruta-inexistenta-404",
];

// fileURLToPath, nu pathname: pe Linux tăierea lui „/" dădea o cale relativă
const mod = (p) => fileURLToPath(new URL("./node_modules/" + p, import.meta.url));

const vite = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  // react-router-dom v7 rezolvă pe condiția "node" către build-ul CJS, care
  // pică la evaluare în ESM. Forțăm build-urile .mjs.
  resolve: {
    alias: [
      { find: /^react-router-dom$/, replacement: mod("react-router-dom/dist/index.mjs") },
      { find: /^react-router$/, replacement: mod("react-router/dist/development/index.mjs") },
      { find: /^react-router\/dom$/, replacement: mod("react-router/dist/development/dom-export.mjs") },
    ],
  },
});

let failures = 0;
try {
  let App, StaticRouter;
  try {
    ({ default: App } = await vite.ssrLoadModule("/src/App.jsx"));
    // routerul trebuie luat din ACELAȘI graf de module ca App, altfel sunt
    // două instanțe react-router și contextul nu se potrivește
    ({ StaticRouter } = await vite.ssrLoadModule("react-router-dom"));
    // entry-ul client: la SSG e importat în Node, deci trebuie să fie inert acolo
    await vite.ssrLoadModule("/src/main.jsx");
    console.log("IMPORT OK — src/App.jsx + src/main.jsx (tot graful) s-au încărcat în Node");
  } catch (e) {
    console.log("IMPORT FAIL — graful de module crapă la încărcare în Node:");
    console.log(String(e && e.stack ? e.stack.split("\n").slice(0, 6).join("\n") : e));
    process.exit(2);
  }
  for (const path of ROUTES) {
    try {
      globalThis.__ALPEBO_PATH = path;
      const html = renderToString(
        React.createElement(StaticRouter, { location: path }, React.createElement(App))
      );
      console.log(`RENDER OK   ${path}  (${html.length} chars)`);
    } catch (e) {
      failures++;
      console.log(`RENDER FAIL ${path}`);
      console.log("  " + String(e && e.message ? e.message : e).split("\n")[0]);
    }
  }
} finally {
  await vite.close();
}
console.log(failures ? `\n${failures} rute au crăpat` : "\nToate rutele au randat fără erori");
process.exit(failures ? 1 : 0);
