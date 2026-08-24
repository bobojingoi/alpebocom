/* Metadatele per rută — o singură sursă, folosită și de client (la navigare),
   și de prerender.mjs (în HTML-ul static). O rută nouă în App.jsx are nevoie
   de o intrare aici, altfel primește metadatele de 404. */

export const SITE_URL = "https://alpebocom.ro";

/* Imaginea OG implicită (rehostată în Supabase Storage — nu de pe WordPress,
   care dispare la cutover). Paginile de proiect folosesc imaginea proiectului. */
export const DEFAULT_OG_IMAGE =
  "https://xsxjcwyjtlspsuyshuhn.supabase.co/storage/v1/object/public/media/og/og-default.jpg";

export function ogImageForRoute(route, raw = null) {
  const clean = route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route;
  if (clean.startsWith("/proiecte/") && raw && raw.projects) {
    const slug = clean.slice("/proiecte/".length);
    const p = (raw.projects.items || []).find((x) => x && x.slug === slug);
    if (p && p.image) return p.image;
  }
  return DEFAULT_OG_IMAGE;
}

const DESCRIERE_FIRMA =
  "ALPEBOCOM SRL, Brașov — rețele de apă și canalizare, drumuri, stații de pompare, devieri de rețele și construcții civile și industriale, din 2004.";

const STATIC_META = {
  "/": {
    title: "Alpebocom — Proiectare și execuție în construcții",
    description: DESCRIERE_FIRMA,
  },
  "/proiecte": {
    title: "Proiecte — portofoliul Alpebocom",
    description:
      "Lucrări executate de Alpebocom: hale industriale, ansambluri rezidențiale, infrastructură rutieră și edilitară.",
  },
  "/blog": {
    title: "Blog — Alpebocom",
    description: "Noutăți din șantier, ghiduri și articole despre construcții.",
  },
  "/termeni-si-conditii": {
    title: "Termeni și condiții — Alpebocom",
    description: "Termenii și condițiile de utilizare a site-ului alpebocom.ro.",
  },
  "/politica-de-confidentialitate": {
    title: "Politica de confidențialitate — Alpebocom",
    description: "Cum colectează și protejează ALPEBOCOM SRL datele personale (GDPR).",
  },
  "/politica-cookies": {
    title: "Politica de cookie-uri — Alpebocom",
    description: "Ce cookie-uri folosește alpebocom.ro și cum le poți controla.",
  },
};

export const NOT_FOUND_META = {
  title: "Pagină negăsită — Alpebocom",
  description: "Pagina căutată nu există sau a fost mutată.",
};

/* Meta description ideal ~150-160 caractere: taie la ultima limită de cuvânt
   sub prag și adaugă „…", ca Google să nu afișeze o propoziție tăiată la mijloc. */
export function clipDesc(text, max = 158) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:·-]+$/, "") + "…";
}

export function metaForRoute(route, raw = null, post = null) {
  const clean = route !== "/" && route.endsWith("/") ? route.slice(0, -1) : route;
  if (STATIC_META[clean]) return STATIC_META[clean];

  if (clean.startsWith("/proiecte/")) {
    const slug = clean.slice("/proiecte/".length);
    const items = (raw && raw.projects && raw.projects.items) || [];
    const p = items.find((x) => x && x.slug === slug);
    if (p) {
      return {
        title: `${p.title} — proiect Alpebocom`,
        description: clipDesc(
          p.summary ||
            [p.category, p.location && "în " + p.location, "— proiect executat de Alpebocom."]
              .filter(Boolean)
              .join(" ")
        ),
      };
    }
    return NOT_FOUND_META;
  }

  if (clean.startsWith("/blog/")) {
    if (post) {
      return {
        title: post.seo_title || `${post.title} — Blog Alpebocom`,
        description: clipDesc(post.seo_description || post.excerpt || DESCRIERE_FIRMA),
      };
    }
    return { title: "Articol — Blog Alpebocom", description: DESCRIERE_FIRMA };
  }

  return NOT_FOUND_META;
}

export function canonicalFor(route) {
  if (route === "/") return SITE_URL + "/";
  const clean = route.endsWith("/") ? route.slice(0, -1) : route;
  return SITE_URL + clean;
}
