# Alpebocom — context proiect

## Ce este
Site-ul firmei de construcții **ALPEBOCOM SRL** (CUI 16454119, J20/1155/2004, din 2004) —
proiectare, execuție și consultanță pentru construcții industriale, rezidențiale și de
infrastructură. Domeniu: alpebocom.ro (azi pe un WordPress vechi; la lansare se face cutover).
Site React (Vite), pre-randat la build, plus un backend separat („Alpebo Hub") cu CMS,
cereri de ofertă (leads) și blog. **Arhitectura copiază proiectul Roots Villas** (repo
`roots`) — aceleași tipare, aceleași lecții.

Board-ul proiectului: pagina „Alpebocom" din Notion (database „Lansare site & hub",
taskuri ALP-nn). Brief-urile și pozele de portofoliu: Google Drive (folderul
„POZE - portofoliu lucrari APB" + documentele „Brief Alpebocom").

## Arhitectură — DOUĂ deployment-uri din același repo

| | Site | Hub |
|---|---|---|
| Cod | rădăcina + `src/`, `api/` | `hub/` |
| Live | alpebocom.ro (de creat pe Vercel) | alpebo-hub.vercel.app (de creat) |
| Ce e | React + funcții serverless Vercel | Express + Postgres (Supabase) |
| Config | `vercel.json` din rădăcină | `hub/vercel.json` |

**Sunt două proiecte Vercel distincte.** O modificare în `hub/` NU ajunge live prin
deploy-ul site-ului și invers. Variabilele de mediu se setează de două ori
(`LEADS_SYNC_SECRET` există în ambele). Codul nu se poate importa între ele — dacă apare
logică duplicată (ex. emailuri), se actualizează manual în ambele locuri.

Baza de date folosește schema Postgres **`alpebo`** — separată intenționat de schema `hub`
(Roots), ca cele două proiecte să poată împărți aceeași instanță Supabase fără coliziuni.

## Build și pre-randare

```
npm run build   =  vite build  &&  node prerender.mjs
```

`prerender.mjs` randează fiecare rută publică cu `renderToString` și scrie
`dist/<rută>/index.html` cu conținut real — crawlerele AI nu execută JavaScript.
Injectează `<title>`, `description`, `canonical`, Open Graph și JSON-LD
(`GeneralContractor` pe homepage). Scrie și `dist/404.html` (404 real pe Vercel).

Conținutul ajunge în HTML pentru că **două module virtuale îl aduc la build**
(plugin în `vite.config.js`):
- `virtual:hub-snapshot` — secțiunile CMS publicate
- `virtual:hub-posts` — articolele de blog, cu corp complet

Hub picat la build **nu** oprește build-ul: snapshot gol → `DEFAULT_CONTENT`
(`src/Alpebocom.jsx`). Fetch-ul la runtime rămâne peste tot, deci publicările din Hub
apar și fără redeploy.

`dist/spa.html` = shell gol pentru rutele publicate DUPĂ build (`/blog/:slug`,
`/proiecte/:slug` — vezi `rewrites` în `vercel.json`). Fără el ar hidrata peste HTML-ul
altei pagini.

**Verificare:** `npm run ssr:check` (`ssr-smoke.mjs`) — prinde orice atingere de
`window`/`document` în afara unui `useEffect`.

⚠️ Build-ul rulează pe Linux pe Vercel. Nu construi căi cu
`new URL(...).pathname.replace(...)` — folosește `fileURLToPath` (lecția Roots).

## Rute (`src/App.jsx`)
`/` · `/proiecte` · `/proiecte/:slug` · `/blog` · `/blog/:slug` ·
`/termeni-si-conditii` · `/politica-de-confidentialitate` · `/politica-cookies` ·
`*` → `NotFound`

Lista de rute pre-randate din `prerender.mjs` **oglindește manual** `App.jsx` — la o rută
nouă trebuie actualizată și acolo, plus o intrare în `STATIC_META` (`src/seo.js`), altfel
primește metadatele de 404. Slugurile de proiect vin din conținut (`BUILD_CONTENT`),
slugurile de blog din `virtual:hub-posts`.

## Fișiere principale

**Site**
- `src/Alpebocom.jsx` — homepage + tot ce e comun: `CSS`, `ICONS`, `Header`, `Footer`,
  `Shell`, `DEFAULT_CONTENT`, `deepMerge`, `useHubContent`, `BUILD_CONTENT`,
  `ProjectCard`, `ContactForm`. Fișier mare, intenționat (modelul RootsVillas.jsx).
- `src/ProjectsPage.jsx`, `BlogPage.jsx`, `TextPage.jsx`, `NotFound.jsx` — paginile
- `src/legal.js` — textele legale (Termeni + Confidențialitate din brief; Cookies scris
  de noi, de validat). Telefonul lipsește din legal intenționat — în brief e
  „[adaugă număr actual]".
- `src/seo.js` / `src/schema.js` — metadate și JSON-LD per rută (folosite de `prerender.mjs`)
- `src/env.js` — `IS_BROWSER` + accesoare sigure; **orice cod care atinge `window` la
  nivel de modul trece pe aici**, altfel pică pre-randarea
- `api/lead.js` — formularul „Cere ofertă": honeypot → Hub (cu `LEADS_SYNC_SECRET`) +
  email (Resend, `api/_email.js`). Fără chei = dry-run care tot răspunde ok.

**Hub** (`hub/`)
- `server.js` — Express: `/api/v1/site-content` (+draft/publish), `/api/v1/posts*`,
  `/api/v1/leads`. Stocare Postgres sau, fără `DATABASE_URL`, în memorie (doar dev).
- `db.js` / `schema.sql` — schema `alpebo` (site_content, posts, leads); DDL idempotent
  la prima cerere. **Modifici una → modifici ambele.**
- `public/admin.html` — admin vanilla JS, un singur fișier: secțiuni JSON, articole, leads.
- `api/index.js` + `vercel.json` — tot traficul e rescris către Express.

## ⚠️ De știut
- **`LEADS_SYNC_SECRET`** e singura barieră între internet și CRM. Nesetat pe hub =
  intake ÎNCHIS (503), nu deschis. Se setează identic pe ambele proiecte Vercel.
- **`ADMIN_TOKEN`** e autentificare de schelet (un singur token static). Task pe board:
  utilizatori + sesiuni reale înainte de producție.
- **Conținutul se îmbină câmp cu câmp** (`deepMerge` în `Alpebocom.jsx`):
  `undefined`, `""` **și `null`** înseamnă toate „nesetat" → cade pe `DEFAULT_CONTENT`.
  Lecția Roots: `null` tratat ca valoare reală ștergea imaginile. Listele se înlocuiesc
  întregi, nu se îmbină element cu element.
- Proiectele din portofoliu sunt deocamdată **carduri de exemplu** în `DEFAULT_CONTENT`
  (marcate „(exemplu)"). Cele reale se publică din Hub, secțiunea `projects`.
- Imaginile sunt `<img>` cu `alt`, nu `background-image` (lecția SEO-13 Roots) — excepție
  doar fundalurile pur decorative.

## Comenzi
```bash
npm install
npm run dev        # dev server Vite (servește și /api/* local, fără vercel dev)
npm run build      # build + pre-randare
npm run build:spa  # doar vite build, fără pre-randare
npm run ssr:check  # verifică dacă aplicația randează curat în Node

cd hub && npm install && npm run dev   # hub local pe :4000 (fără DATABASE_URL: memorie)
```

## Mediu
Site: `.env` din `.env.example` (HUB_URL, RESEND_API_KEY, EMAIL_FROM/TO,
LEADS_SYNC_SECRET). Hub: `hub/.env.example` (DATABASE_URL, ADMIN_TOKEN,
LEADS_SYNC_SECRET, CORS_ORIGINS). Pe Vercel, variabilele se aplică doar la un
deployment NOU.

## Design
Paletă provizorie „șantier la amurg" (identitatea finală e task pe board): constanta
`CSS` din `Alpebocom.jsx` — `--ink` #161A1F, `--steel` #232B33, `--safety` #E8641B,
`--ivory` #F5F3EE. Fonturi: Archivo (display) + Inter (body), încărcate din `<head>` în
`index.html` (nu prin `@import` — FOUC pe iOS, lecția Roots). Secțiunile Echipa și
Testimoniale nu sunt construite încă — brief-ul le cere „hidden momentan".

## Limbă
Utilizatorul comunică în română. Textele vizibile utilizatorului și comentariile din
cod: în română. Site-ul e doar în română (fără i18n) — dacă apare cerință de EN, se
preia modelul SEO-18 de la Roots (rute `/en/` proprii, nu traducere parțială).
