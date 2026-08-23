/* Alpebocom — homepage + tot ce e comun între pagini: stilurile (CSS),
   conținutul implicit (DEFAULT_CONTENT), aducerea conținutului din Hub
   (useHubContent), Header, Footer, cardul de proiect, iconițele.
   Arhitectura e cea din RootsVillas.jsx (repo roots): un singur fișier mare
   pentru nucleul comun, pagini separate pentru restul. */
import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import SNAPSHOT from "virtual:hub-snapshot";
import { IS_BROWSER } from "./env.js";

/* Alpebo Hub — CMS-ul. La build, conținutul vine prin virtual:hub-snapshot;
   la runtime se face fetch, ca publicările din Hub să apară fără redeploy.
   Hub inexistent/picat = se rămâne pe DEFAULT_CONTENT, nimic nu crapă. */
export const HUB_URL = "https://alpebocom-hub.vercel.app";

/* ============================== conținut ============================== */

export const DEFAULT_CONTENT = {
  hero: {
    eyebrow: "Din 2004, în toată România",
    title: "Construim solid. Predăm la timp.",
    subtitle:
      "Proiectare, execuție și consultanță pentru construcții industriale, rezidențiale și de infrastructură.",
    ctaPrimary: "Vezi proiectele",
    ctaSecondary: "Cere ofertă de preț",
    image: "",
    imageAlt: "Șantier Alpebocom",
  },
  services: {
    title: "Serviciile noastre",
    intro:
      "De la studiul de fezabilitate la recepția finală — un singur partener, responsabil de întregul lanț.",
    items: [
      {
        icon: "industrial",
        title: "Construcții industriale",
        text: "Hale de producție și depozitare, structuri metalice și beton prefabricat, platforme logistice.",
      },
      {
        icon: "rezidential",
        title: "Construcții rezidențiale",
        text: "Locuințe unifamiliale și ansambluri rezidențiale, de la fundație la predarea la cheie.",
      },
      {
        icon: "infrastructura",
        title: "Infrastructură",
        text: "Drumuri, platforme, rețele edilitare și lucrările de artă aferente.",
      },
      {
        icon: "proiectare",
        title: "Proiectare",
        text: "Documentații tehnice complete — DTAC, PT, DE — coordonate pe toate specialitățile.",
      },
      {
        icon: "consultanta",
        title: "Consultanță tehnică",
        text: "Dirigenție de șantier, verificări tehnice, asistență în relația cu autoritățile.",
      },
      {
        icon: "renovare",
        title: "Reabilitări și amenajări",
        text: "Modernizări, consolidări și recompartimentări pentru clădiri existente.",
      },
    ],
  },
  projects: {
    title: "Proiectele noastre",
    intro: "O selecție din lucrările recente.",
    cta: "Vezi toate proiectele",
    /* Carduri de exemplu — proiectele reale se publică din Alpebo Hub
       (texte + poze din folderul de portofoliu din Drive). */
    items: [
      {
        slug: "exemplu-hala-industriala",
        title: "Hală industrială (exemplu)",
        category: "Industrial",
        location: "România",
        year: "2024",
        summary:
          "Card de exemplu — proiectele reale se încarcă din Alpebo Hub, cu texte și poze din portofoliu.",
        image: "",
        imageAlt: "",
        highlights: [
          "Structură metalică, 2.400 mp",
          "Termen de execuție: 7 luni",
          "Platformă logistică și racorduri complete",
        ],
        body: "Acesta este un proiect de exemplu, folosit doar ca schelet vizual până la încărcarea portofoliului real din Alpebo Hub.",
      },
      {
        slug: "exemplu-ansamblu-rezidential",
        title: "Ansamblu rezidențial (exemplu)",
        category: "Rezidențial",
        location: "România",
        year: "2023",
        summary: "Card de exemplu — se înlocuiește cu un proiect real din Hub.",
        image: "",
        imageAlt: "",
        highlights: ["12 unități locative", "Execuție completă, structură + finisaje", "Predare la cheie"],
        body: "Acesta este un proiect de exemplu, folosit doar ca schelet vizual până la încărcarea portofoliului real din Alpebo Hub.",
      },
      {
        slug: "exemplu-infrastructura-rutiera",
        title: "Infrastructură rutieră (exemplu)",
        category: "Infrastructură",
        location: "România",
        year: "2023",
        summary: "Card de exemplu — se înlocuiește cu un proiect real din Hub.",
        image: "",
        imageAlt: "",
        highlights: ["3,2 km drum modernizat", "Rigole, podețe și semnalizare", "Recepție fără obiecțiuni"],
        body: "Acesta este un proiect de exemplu, folosit doar ca schelet vizual până la încărcarea portofoliului real din Alpebo Hub.",
      },
    ],
  },
  about: {
    title: "Despre Alpebocom",
    text: "ALPEBOCOM SRL construiește din 2004. Lucrăm cu echipe proprii pe toate fazele — proiectare, execuție, consultanță — pentru beneficiari privați și publici.\n\nCredem în lucrul făcut o singură dată și bine: documentație corectă, șantier disciplinat, termene respectate.",
    stats: [
      { value: "2004", label: "anul înființării" },
      { value: "3", label: "domenii: industrial, rezidențial, infrastructură" },
      { value: "RO", label: "lucrări în toată țara" },
    ],
  },
  contact: {
    title: "Cere ofertă de preț",
    text: "Spune-ne ce vrei să construiești. Revenim cu o estimare în cel mai scurt timp.",
    phone: "0720 100 700",
    email: "contact@alpebocom.ro",
  },
};

/* Suprapune conținutul din Hub peste cel implicit, câmp cu câmp.
   `undefined`, `null` și `""` înseamnă toate „nesetat" → rămâne valoarea de
   bază (lecția Roots: `null` pe câmpurile de imagine ștergea hero-ul).
   Listele se înlocuiesc întregi — o listă parțial îmbinată n-ar avea sens. */
export function deepMerge(base, over) {
  if (over === undefined || over === null || over === "") return base;
  if (Array.isArray(base) || Array.isArray(over)) {
    return Array.isArray(over) && over.length ? over : base;
  }
  if (base && typeof base === "object" && typeof over === "object") {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
    return out;
  }
  return over;
}

const mergeAll = (raw) => {
  const out = {};
  for (const k of Object.keys(DEFAULT_CONTENT)) out[k] = deepMerge(DEFAULT_CONTENT[k], raw[k]);
  return out;
};

/* Conținutul disponibil la build (snapshot peste defaults) — folosit de
   prerender.mjs ca să știe ce sluguri de proiect există. */
export const BUILD_CONTENT = mergeAll(SNAPSHOT || {});

let runtimeFetch = null;
export function useHubContent() {
  const [raw, setRaw] = useState(() => ({ ...(SNAPSHOT || {}) }));
  useEffect(() => {
    if (!IS_BROWSER) return;
    let on = true;
    runtimeFetch =
      runtimeFetch ||
      fetch(HUB_URL + "/api/v1/site-content")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    runtimeFetch.then((j) => {
      if (on && j && j.content) setRaw((prev) => ({ ...prev, ...j.content }));
    });
    return () => {
      on = false;
    };
  }, []);
  return useMemo(() => mergeAll(raw), [raw]);
}

/* ============================== stiluri ============================== */
/* Paletă provizorie „șantier la amurg": grafit + portocaliu de șantier.
   Identitatea finală (logo, culori) e task pe board — se schimbă doar aici. */

export const CSS = `
:root{
  --ink:#161A1F; --steel:#232B33; --slate:#5B6672;
  --paper:#FFFFFF; --ivory:#F5F3EE; --line:#E5E1D8;
  --safety:#E8641B; --safety-press:#C8500F;
  --radius:14px;
  --font-display:"Archivo",system-ui,sans-serif;
  --font-body:"Inter",system-ui,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--font-body);color:var(--ink);background:var(--ivory);line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
h1,h2,h3,h4{font-family:var(--font-display);line-height:1.15;margin:0}
.container{max-width:1160px;margin:0 auto;padding:0 22px}
.section{padding:72px 0}
.eyebrow{display:inline-block;font:600 12px/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--safety);margin-bottom:14px}
.section-title{font-size:clamp(26px,3.4vw,38px);font-weight:800;letter-spacing:-.01em}
.section-intro{max-width:640px;color:var(--slate);margin-top:12px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:10px;border:0;cursor:pointer;font:600 15px var(--font-body);text-decoration:none;transition:transform .15s,background .15s,border-color .15s}
.btn:active{transform:translateY(1px)}
.btn-primary{background:var(--safety);color:#fff}
.btn-primary:hover{background:var(--safety-press)}
.btn-primary:disabled{opacity:.6;cursor:default}
.btn-ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}
.btn-ghost:hover{border-color:#fff}
.btn-dark{background:var(--steel);color:#fff}

.hdr{position:sticky;top:0;z-index:50;background:rgba(22,26,31,.93);backdrop-filter:blur(8px);color:#fff}
.hdr-in{display:flex;align-items:center;justify-content:space-between;height:66px}
.logo{display:flex;align-items:center;gap:10px;font:800 17px var(--font-display);letter-spacing:.04em;color:#fff;text-decoration:none}
.logo svg{width:28px;height:28px;flex:none}
.nav{display:flex;align-items:center;gap:26px}
.nav a{color:rgba(255,255,255,.85);text-decoration:none;font:500 14.5px var(--font-body)}
.nav a:hover,.nav a.on{color:#fff}
.nav .btn{padding:10px 18px}
.burger{display:none;background:none;border:0;color:#fff;cursor:pointer;padding:8px}
@media(max-width:880px){
  .nav{position:fixed;top:66px;left:0;right:0;background:var(--ink);flex-direction:column;align-items:stretch;padding:18px 22px 26px;gap:16px;display:none}
  .nav.open{display:flex}
  .burger{display:block}
}

.hero{position:relative;background:var(--steel);color:#fff;overflow:hidden}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.38}
.hero-grad{position:absolute;inset:0;background:linear-gradient(112deg,rgba(18,22,27,.94) 34%,rgba(18,22,27,.55) 68%,rgba(232,100,27,.28))}
.hero-in{position:relative;padding:108px 0 92px;max-width:680px}
.hero h1{font-size:clamp(34px,5.2vw,58px);font-weight:800;letter-spacing:-.015em}
.hero p{font-size:clamp(16px,1.9vw,19px);color:rgba(255,255,255,.85);margin:18px 0 30px;max-width:560px}
.hero-cta{display:flex;gap:14px;flex-wrap:wrap}
.hero-strip{position:relative;border-top:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25)}
.hero-strip .container{display:flex;gap:8px 34px;flex-wrap:wrap;padding-top:15px;padding-bottom:15px;font:500 13.5px var(--font-body);color:rgba(255,255,255,.8)}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:36px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:26px}
.card .ic{width:44px;height:44px;border-radius:10px;background:#FBEADF;color:var(--safety);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.card h3{font-size:18px;font-weight:700;margin-bottom:8px}
.card p{color:var(--slate);font-size:14.5px;margin:0}

.projects-band{background:var(--paper);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.proj-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-top:36px}
.proj{position:relative;border-radius:var(--radius);overflow:hidden;background:var(--steel);color:#fff;text-decoration:none;min-height:250px;display:flex;flex-direction:column;justify-content:flex-end}
.proj img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.8;transition:transform .35s}
.proj:hover img{transform:scale(1.04)}
.proj .ph{position:absolute;inset:0;background:repeating-linear-gradient(135deg,#2A333D 0 22px,#242C35 22px 44px)}
.proj::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(10,12,15,.85))}
.proj-body{position:relative;z-index:1;padding:20px}
.proj-tag{display:inline-block;background:var(--safety);color:#fff;font:600 11px/1 var(--font-body);letter-spacing:.08em;text-transform:uppercase;padding:6px 10px;border-radius:6px;margin-bottom:10px}
.proj h3{font-size:19px;font-weight:700}
.proj-meta{color:rgba(255,255,255,.75);font-size:13px;margin-top:4px}
.proj-more{margin-top:32px}

.about-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:44px;align-items:center;margin-top:8px}
@media(max-width:880px){.about-grid{grid-template-columns:1fr}}
.about-text p{color:#3A424C;font-size:15.5px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media(max-width:560px){.stats{grid-template-columns:1fr}}
.stat{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:20px;text-align:center}
.stat b{display:block;font:800 26px var(--font-display);color:var(--safety)}
.stat span{font-size:13px;color:var(--slate)}

.contact{background:var(--steel);color:#fff}
.contact .section-intro{color:rgba(255,255,255,.75)}
.contact-grid{display:grid;grid-template-columns:1.4fr .6fr;gap:44px;margin-top:34px}
@media(max-width:880px){.contact-grid{grid-template-columns:1fr}}
.form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form .full{grid-column:1/-1}
@media(max-width:680px){.form{grid-template-columns:1fr}}
.field label{display:block;font:600 13px var(--font-body);margin-bottom:6px;color:rgba(255,255,255,.85)}
.field input,.field textarea{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font:400 15px var(--font-body)}
.field textarea{min-height:120px;resize:vertical}
.field input:focus,.field textarea:focus{outline:2px solid var(--safety);border-color:transparent}
.form-note{font-size:12.5px;color:rgba(255,255,255,.55);margin:0}
.form-note a{color:rgba(255,255,255,.75)}
.form-msg{padding:12px 14px;border-radius:10px;font-size:14px}
.form-msg.ok{background:rgba(46,160,67,.18);color:#8CE99A}
.form-msg.err{background:rgba(229,83,75,.15);color:#FFA8A0}
.hp{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}
.contact-side h3{font-size:17px;margin-bottom:14px}
.contact-side a{color:#fff;text-decoration:none;font-weight:600}
.contact-side p{color:rgba(255,255,255,.75);font-size:14.5px}

.ftr{background:var(--ink);color:rgba(255,255,255,.72);font-size:14px}
.ftr-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:34px;padding:54px 0 40px}
@media(max-width:760px){.ftr-grid{grid-template-columns:1fr}}
.ftr h4{color:#fff;font:700 15px var(--font-display);margin:0 0 14px}
.ftr a{color:rgba(255,255,255,.72);text-decoration:none;display:block;margin-bottom:9px}
.ftr a:hover{color:#fff}
.ftr-bottom{border-top:1px solid rgba(255,255,255,.12);padding:18px 0;font-size:12.5px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:rgba(255,255,255,.5)}

.page-head{background:var(--steel);color:#fff;padding:64px 0 46px}
.page-head h1{font-size:clamp(28px,4vw,44px);font-weight:800}
.page-head p{color:rgba(255,255,255,.75);margin:12px 0 0;max-width:640px}
.prose{max-width:760px}
.prose h2{font-size:22px;margin:34px 0 12px}
.prose p,.prose li{color:#3A424C;font-size:15.5px}
.prose ul{padding-left:22px;margin:10px 0}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:26px}
.gallery img{border-radius:var(--radius);width:100%;height:220px;object-fit:cover}
`;

/* ============================== iconițe ============================== */

const IC = (path) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

export const ICONS = {
  industrial: IC(<path d="M3 21V9l6 4V9l6 4V9l6 4v8H3Z M7 17h.01M12 17h.01M17 17h.01" />),
  rezidential: IC(<path d="M3 11 12 4l9 7 M5 10v10h14V10 M9 20v-6h6v6" />),
  infrastructura: IC(<path d="M4 20 9 4h2l-1 16H4Z M20 20 15 4h-2l1 16h6Z M11.5 8h1 M11.2 13h1.6 M11 18h2" />),
  proiectare: IC(<path d="M4 4h16v16H4Z M4 9h16 M9 9v11 M12.5 13l3 3 M15.5 13l-3 3" />),
  consultanta: IC(<path d="M5 13a7 7 0 0 1 14 0 M3 13h18v2H3Z M12 6V4 M9 6.5 8 5 M15 6.5 16 5" />),
  renovare: IC(<path d="M3 5h13v5H3Z M16 7h4v3h-4 M8 10v4 M6.5 14h3v6h-3Z" />),
};

const Logo = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="12" fill="#E8641B" />
    <path d="M32 13 L51 51 H42.5 L38.7 42.5 H25.3 L21.5 51 H13 Z M32 27.5 L27.6 36.5 H36.4 Z" fill="#fff" />
  </svg>
);

/* ============================== schelet comun ============================== */

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="hdr">
      <div className="container hdr-in">
        <Link to="/" className="logo" onClick={close} aria-label="Alpebocom — acasă">
          <Logo />
          ALPEBOCOM
        </Link>
        <button
          className="burger"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Închide meniul" : "Deschide meniul"}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M5 5l14 14M19 5 5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <nav className={"nav" + (open ? " open" : "")}>
          <NavLink to="/proiecte" className={({ isActive }) => (isActive ? "on" : "")} onClick={close}>
            Proiecte
          </NavLink>
          <NavLink to="/blog" className={({ isActive }) => (isActive ? "on" : "")} onClick={close}>
            Blog
          </NavLink>
          <Link to="/#despre" onClick={close}>
            Despre noi
          </Link>
          <Link to="/#contact" className="btn btn-primary" onClick={close}>
            Cere ofertă
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="container">
        <div className="ftr-grid">
          <div>
            <div className="logo" style={{ marginBottom: 14 }}>
              <Logo />
              ALPEBOCOM
            </div>
            <p style={{ margin: 0, maxWidth: 380 }}>
              Proiectare, execuție și consultanță în construcții industriale, rezidențiale și de
              infrastructură.
            </p>
            <p style={{ marginBottom: 0 }}>ALPEBOCOM SRL · CUI 16454119 · J20/1155/2004</p>
          </div>
          <div>
            <h4>Navigare</h4>
            <Link to="/proiecte">Proiecte</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/#despre">Despre noi</Link>
            <Link to="/#contact">Cere ofertă de preț</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link to="/termeni-si-conditii">Termeni și condiții</Link>
            <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link>
            <Link to="/politica-cookies">Politica de cookie-uri</Link>
          </div>
        </div>
        <div className="ftr-bottom">
          <span>© {new Date().getFullYear()} ALPEBOCOM SRL. Toate drepturile rezervate.</span>
          <a href="mailto:contact@alpebocom.ro">contact@alpebocom.ro</a>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }) {
  return (
    <>
      <style>{CSS}</style>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

/* ============================== bucăți refolosite ============================== */

export function ProjectCard({ p }) {
  return (
    <Link to={"/proiecte/" + p.slug} className="proj">
      {p.image ? <img src={p.image} alt={p.imageAlt || p.title} loading="lazy" /> : <span className="ph" />}
      <span className="proj-body">
        {p.category ? <span className="proj-tag">{p.category}</span> : null}
        <h3>{p.title}</h3>
        <span className="proj-meta">{[p.location, p.year].filter(Boolean).join(" · ")}</span>
      </span>
    </Link>
  );
}

export function ContactForm() {
  const [state, setState] = useState("idle");

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    body.page = IS_BROWSER ? window.location.pathname : "";
    setState("sending");
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok !== true) throw new Error("lead");
      setState("ok");
      form.reset();
    } catch {
      setState("err");
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {/* honeypot anti-spam: invizibil pentru oameni, completat de boți */}
      <div className="hp" aria-hidden="true">
        <label>
          Nu completa acest câmp
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="field">
        <label htmlFor="lead-name">Nume și prenume *</label>
        <input id="lead-name" name="name" required maxLength={200} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="lead-phone">Telefon *</label>
        <input id="lead-phone" name="phone" required maxLength={40} autoComplete="tel" inputMode="tel" />
      </div>
      <div className="field">
        <label htmlFor="lead-email">Email</label>
        <input id="lead-email" name="email" type="email" maxLength={200} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="lead-company">Companie</label>
        <input id="lead-company" name="company" maxLength={200} autoComplete="organization" />
      </div>
      <div className="field full">
        <label htmlFor="lead-message">Descrie lucrarea *</label>
        <textarea id="lead-message" name="message" required maxLength={5000} />
      </div>
      <div className="full">
        <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Se trimite…" : "Trimite cererea"}
        </button>
      </div>
      {state === "ok" ? (
        <p className="form-msg ok full">Cererea a fost trimisă. Te contactăm în cel mai scurt timp.</p>
      ) : null}
      {state === "err" ? (
        <p className="form-msg err full">
          Cererea nu a putut fi trimisă. Încearcă din nou sau scrie-ne direct pe email.
        </p>
      ) : null}
      <p className="form-note full">
        Datele din formular sunt folosite exclusiv pentru a răspunde cererii tale —{" "}
        <Link to="/politica-de-confidentialitate">politica de confidențialitate</Link>.
      </p>
    </form>
  );
}

export function ContactSection({ data }) {
  return (
    <section className="section contact" id="contact">
      <div className="container">
        <span className="eyebrow">Contact</span>
        <h2 className="section-title">{data.title}</h2>
        <p className="section-intro">{data.text}</p>
        <div className="contact-grid">
          <ContactForm />
          <div className="contact-side">
            <h3>Direct</h3>
            {data.phone ? (
              <p>
                Telefon: <a href={"tel:" + data.phone.replace(/\s/g, "")}>{data.phone}</a>
              </p>
            ) : null}
            <p>
              Email: <a href={"mailto:" + data.email}>{data.email}</a>
            </p>
            <p>Răspundem de luni până vineri, 8:00–17:00.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================== homepage ============================== */

function Hero({ data, services }) {
  const strip = [...services.items.slice(0, 3).map((s) => s.title), data.eyebrow];
  return (
    <section className="hero">
      {data.image ? <img className="hero-img" src={data.image} alt={data.imageAlt || ""} /> : null}
      <div className="hero-grad" aria-hidden="true" />
      <div className="container">
        <div className="hero-in">
          <span className="eyebrow">{data.eyebrow}</span>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          <div className="hero-cta">
            <Link to="/proiecte" className="btn btn-primary">
              {data.ctaPrimary}
            </Link>
            <a href="#contact" className="btn btn-ghost">
              {data.ctaSecondary}
            </a>
          </div>
        </div>
      </div>
      <div className="hero-strip">
        <div className="container">
          {strip.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ data }) {
  return (
    <section className="section" id="servicii">
      <div className="container">
        <span className="eyebrow">Servicii</span>
        <h2 className="section-title">{data.title}</h2>
        <p className="section-intro">{data.intro}</p>
        <div className="cards">
          {data.items.map((s, i) => (
            <div className="card" key={i}>
              <div className="ic">{ICONS[s.icon] || ICONS.industrial}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsStrip({ data }) {
  return (
    <section className="section projects-band" id="proiecte">
      <div className="container">
        <span className="eyebrow">Portofoliu</span>
        <h2 className="section-title">{data.title}</h2>
        <p className="section-intro">{data.intro}</p>
        <div className="proj-grid">
          {data.items.slice(0, 3).map((p) => (
            <ProjectCard key={p.slug} p={p} />
          ))}
        </div>
        <div className="proj-more">
          <Link to="/proiecte" className="btn btn-dark">
            {data.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

function About({ data }) {
  return (
    <section className="section" id="despre">
      <div className="container">
        <span className="eyebrow">Despre noi</span>
        <h2 className="section-title">{data.title}</h2>
        <div className="about-grid">
          <div className="about-text">
            {data.text.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="stats">
            {data.stats.map((s, i) => (
              <div className="stat" key={i}>
                <b>{s.value}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const c = useHubContent();
  return (
    <Shell>
      <Hero data={c.hero} services={c.services} />
      <Services data={c.services} />
      <ProjectsStrip data={c.projects} />
      <About data={c.about} />
      <ContactSection data={c.contact} />
    </Shell>
  );
}
