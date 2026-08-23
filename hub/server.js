/* Alpebo Hub — CMS + leads + blog pentru alpebocom.ro.
   API-first, pe modelul Roots Hub: adminul (public/admin.html) e doar un
   client al /api/v1/*. Fără DATABASE_URL rulează cu stocare în memorie (dev).

   Autentificare (schelet): un singur ADMIN_TOKEN static, trimis ca Bearer.
   TODO pe board înainte de producție: utilizatori + sesiuni reale. */
require("dotenv").config();
const path = require("path");
const express = require("express");
const { hasDb, pool, initDb } = require("./db");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));

/* ============================== CORS ============================== */
const CORS_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://alpebocom.ro,https://www.alpebocom.ro,http://localhost:5173"
).split(",").map((s) => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  /* `Vary: Origin` se pune NECONDIȚIONAT (lecția roots-hub): rutele publice au
     s-maxage=60, deci CDN-ul ține o copie. Dacă acea copie a fost creată de o
     cerere fără `Origin` (fetch-ul de la build, un crawler, un curl) și nu
     poartă antetul de mai jos, browserele care o nimeresc primesc un răspuns
     fără Access-Control-Allow-Origin — fetch-ul de pe site pică intermitent
     și pagina cade tăcut pe DEFAULT_CONTENT. Cu Vary pe toate răspunsurile,
     fiecare valoare de Origin primește propria intrare în cache. */
  res.setHeader("Vary", "Origin");
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Sync-Secret");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

/* Serverless: prima cerere per instanță se asigură că schema există. */
let ready = null;
app.use(async (req, res, next) => {
  try {
    ready = ready || initDb().catch((e) => { ready = null; throw e; });
    await ready;
    next();
  } catch (e) {
    res.status(500).json({ error: "DB indisponibil: " + e.message });
  }
});

/* ============================== auth ============================== */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: "ADMIN_TOKEN nesetat pe server" });
  const got = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (got !== expected) return res.status(401).json({ error: "token invalid" });
  next();
}

/* Doar string-uri: un obiect sau un array trimis în loc de text ar ajunge
   în CRM ca „[object Object]" / „a,b" prin String(). Orice altceva = gol. */
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* ============================== stocare ============================== */
/* Două implementări cu aceeași interfață: Postgres (producție) sau memorie
   (dev fără DATABASE_URL — se pierde la restart, suficient pentru probe). */

const mem = { content: new Map(), posts: new Map(), leads: [], leadSeq: 1, postSeq: 1 };

/* Aceleași câmpuri publice ca în interogările SQL — altfel implementarea în
   memorie ar expune id/published/updated_at pe rutele publice. */
const publicPostCard = ({ slug, title, excerpt, cover, published_at }) => ({ slug, title, excerpt, cover, published_at });
const publicPost = ({ slug, title, excerpt, body, cover, seo_title, seo_description, published_at }) =>
  ({ slug, title, excerpt, body, cover, seo_title, seo_description, published_at });

const store = hasDb
  ? {
      async contentPublished() {
        const r = await pool.query(
          "SELECT section_key, published, published_at FROM alpebo.site_content WHERE published IS NOT NULL"
        );
        const content = {};
        let latest = 0;
        for (const row of r.rows) {
          content[row.section_key] = row.published;
          const t = new Date(row.published_at).getTime();
          if (t > latest) latest = t;
        }
        return { content, publishedAt: latest ? new Date(latest).toISOString() : null };
      },
      async contentAll() {
        const r = await pool.query(
          "SELECT section_key, draft, published, published_at, updated_at FROM alpebo.site_content ORDER BY section_key"
        );
        return r.rows;
      },
      async saveDraft(key, data) {
        await pool.query(
          `INSERT INTO alpebo.site_content (section_key, draft, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (section_key) DO UPDATE SET draft = $2, updated_at = now()`,
          [key, data]
        );
      },
      async deleteSection(key) {
        const r = await pool.query("DELETE FROM alpebo.site_content WHERE section_key = $1", [key]);
        return r.rowCount > 0;
      },
      async publish(key) {
        const r = await pool.query(
          `UPDATE alpebo.site_content
           SET published = draft, published_at = now(), updated_at = now()
           WHERE section_key = $1 AND draft IS NOT NULL RETURNING section_key`,
          [key]
        );
        return r.rowCount > 0;
      },
      async posts(all) {
        const r = await pool.query(
          all
            ? "SELECT id, slug, title, excerpt, cover, published, published_at, updated_at FROM alpebo.posts ORDER BY created_at DESC"
            : "SELECT slug, title, excerpt, cover, published_at FROM alpebo.posts WHERE published ORDER BY published_at DESC"
        );
        return r.rows;
      },
      async post(slug, all) {
        const r = await pool.query(
          all
            ? "SELECT * FROM alpebo.posts WHERE slug = $1"
            : "SELECT slug, title, excerpt, body, cover, seo_title, seo_description, published_at FROM alpebo.posts WHERE slug = $1 AND published",
          [slug]
        );
        return r.rows[0] || null;
      },
      async upsertPost(p) {
        await pool.query(
          `INSERT INTO alpebo.posts (slug, title, excerpt, body, cover, seo_title, seo_description, published, published_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $8 THEN now() ELSE NULL END)
           ON CONFLICT (slug) DO UPDATE SET
             title = $2, excerpt = $3, body = $4, cover = $5, seo_title = $6, seo_description = $7,
             published = $8,
             published_at = CASE WHEN $8 THEN COALESCE(alpebo.posts.published_at, now()) ELSE NULL END,
             updated_at = now()`,
          [p.slug, p.title, p.excerpt, p.body, p.cover, p.seo_title, p.seo_description, !!p.published]
        );
      },
      async deletePost(slug) {
        const r = await pool.query("DELETE FROM alpebo.posts WHERE slug = $1", [slug]);
        return r.rowCount > 0;
      },
      async addLead(l) {
        const r = await pool.query(
          `INSERT INTO alpebo.leads (name, phone, email, company, message, source, page)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [l.name, l.phone, l.email, l.company, l.message, l.source, l.page]
        );
        return r.rows[0].id;
      },
      async leads() {
        const r = await pool.query("SELECT * FROM alpebo.leads ORDER BY created_at DESC LIMIT 500");
        return r.rows;
      },
      async setLeadStatus(id, status) {
        const r = await pool.query("UPDATE alpebo.leads SET status = $1 WHERE id = $2", [status, id]);
        return r.rowCount > 0;
      },
    }
  : {
      async contentPublished() {
        const content = {};
        let latest = null;
        for (const [k, v] of mem.content) {
          if (v.published != null) {
            content[k] = v.published;
            if (!latest || v.published_at > latest) latest = v.published_at;
          }
        }
        return { content, publishedAt: latest };
      },
      async contentAll() {
        return [...mem.content.entries()].map(([section_key, v]) => ({ section_key, ...v }));
      },
      async saveDraft(key, data) {
        const v = mem.content.get(key) || {};
        mem.content.set(key, { ...v, draft: data, updated_at: new Date().toISOString() });
      },
      async deleteSection(key) {
        return mem.content.delete(key);
      },
      async publish(key) {
        const v = mem.content.get(key);
        if (!v || v.draft == null) return false;
        mem.content.set(key, { ...v, published: v.draft, published_at: new Date().toISOString() });
        return true;
      },
      async posts(all) {
        const list = [...mem.posts.values()];
        return all ? list.map(({ body, ...rest }) => rest) : list.filter((p) => p.published).map(publicPostCard);
      },
      async post(slug, all) {
        const p = mem.posts.get(slug);
        if (!p) return null;
        if (all) return p;
        return p.published ? publicPost(p) : null;
      },
      async upsertPost(p) {
        const old = mem.posts.get(p.slug) || { id: mem.postSeq++ };
        mem.posts.set(p.slug, {
          ...old,
          ...p,
          published: !!p.published,
          published_at: p.published ? old.published_at || new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      },
      async deletePost(slug) {
        return mem.posts.delete(slug);
      },
      async addLead(l) {
        const id = mem.leadSeq++;
        mem.leads.unshift({ id, ...l, status: "nou", created_at: new Date().toISOString() });
        return id;
      },
      async leads() {
        return mem.leads;
      },
      async setLeadStatus(id, status) {
        const l = mem.leads.find((x) => x.id === id);
        if (!l) return false;
        l.status = status;
        return true;
      },
    };

/* ============================== API ============================== */

app.get("/api/health", (req, res) => res.json({ ok: true, db: hasDb }));

/* --- conținut site --- */
app.get("/api/v1/site-content", async (req, res) => {
  const out = await store.contentPublished();
  // CDN-ul poate ține 60s; publicările apar repede fără să lovim baza la fiecare vizitator
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  res.json(out);
});

app.get("/api/v1/site-content/draft", requireAdmin, async (req, res) => {
  res.json({ sections: await store.contentAll() });
});

app.put("/api/v1/site-content/:key", requireAdmin, async (req, res) => {
  const key = String(req.params.key || "").trim();
  if (!/^[a-z0-9_@-]{1,80}$/i.test(key)) return res.status(400).json({ error: "cheie invalidă" });
  if (req.body == null || typeof req.body.data === "undefined") {
    return res.status(400).json({ error: "lipsește câmpul data" });
  }
  await store.saveDraft(key, req.body.data);
  res.json({ ok: true });
});

app.delete("/api/v1/site-content/:key", requireAdmin, async (req, res) => {
  const ok = await store.deleteSection(String(req.params.key || "").trim());
  if (!ok) return res.status(404).json({ error: "secțiune inexistentă" });
  res.json({ ok: true });
});

app.post("/api/v1/site-content/:key/publish", requireAdmin, async (req, res) => {
  const ok = await store.publish(String(req.params.key || "").trim());
  if (!ok) return res.status(404).json({ error: "nu există draft pentru această secțiune" });
  res.json({ ok: true });
});

/* --- blog --- */
app.get("/api/v1/posts", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  res.json({ posts: await store.posts(false) });
});

app.get("/api/v1/posts/:slug", async (req, res) => {
  const post = await store.post(String(req.params.slug), false);
  if (!post) return res.status(404).json({ error: "articol inexistent" });
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  res.json({ post });
});

app.get("/api/v1/posts-admin", requireAdmin, async (req, res) => {
  res.json({ posts: await store.posts(true) });
});

app.get("/api/v1/posts-admin/:slug", requireAdmin, async (req, res) => {
  const post = await store.post(String(req.params.slug), true);
  if (!post) return res.status(404).json({ error: "articol inexistent" });
  res.json({ post });
});

app.post("/api/v1/posts", requireAdmin, async (req, res) => {
  const b = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const slug = str(b.slug, 120).toLowerCase();
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return res.status(400).json({ error: "slug invalid (a-z, 0-9, -)" });
  const title = str(b.title, 300);
  if (!title) return res.status(400).json({ error: "lipsește titlul" });
  await store.upsertPost({
    slug,
    title,
    excerpt: str(b.excerpt, 1000),
    body: str(b.body, 200000),
    cover: str(b.cover, 1000),
    seo_title: str(b.seo_title, 300),
    seo_description: str(b.seo_description, 500),
    published: !!b.published,
  });
  res.json({ ok: true });
});

app.delete("/api/v1/posts/:slug", requireAdmin, async (req, res) => {
  const ok = await store.deletePost(String(req.params.slug));
  if (!ok) return res.status(404).json({ error: "articol inexistent" });
  res.json({ ok: true });
});

/* --- leads --- */
/* Intake-ul e protejat de LEADS_SYNC_SECRET — singura barieră între internet
   și CRM. Nesetat = intake închis (nu deschis!). */
app.post("/api/v1/leads", async (req, res) => {
  const secret = process.env.LEADS_SYNC_SECRET;
  if (!secret) return res.status(503).json({ error: "LEADS_SYNC_SECRET nesetat" });
  if (req.headers["x-sync-secret"] !== secret) return res.status(401).json({ error: "secret invalid" });
  const b = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const name = str(b.name, 200);
  if (!name) return res.status(400).json({ error: "lipsește numele" });
  const id = await store.addLead({
    name,
    phone: str(b.phone, 40),
    email: str(b.email, 200),
    company: str(b.company, 200),
    message: str(b.message, 5000),
    source: str(b.source, 40) || "site",
    page: str(b.page, 300),
  });
  res.json({ ok: true, id });
});

const LEAD_STATUSES = ["nou", "contactat", "ofertat", "castigat", "pierdut"];

app.get("/api/v1/leads", requireAdmin, async (req, res) => {
  res.json({ leads: await store.leads() });
});

app.patch("/api/v1/leads/:id", requireAdmin, async (req, res) => {
  const status = String((req.body || {}).status || "");
  if (!LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ error: "status invalid (" + LEAD_STATUSES.join("/") + ")" });
  }
  const ok = await store.setLeadStatus(Number(req.params.id), status);
  if (!ok) return res.status(404).json({ error: "lead inexistent" });
  res.json({ ok: true });
});

/* ============================== admin static ============================== */
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.redirect("/admin.html"));

/* Orice altceva: JSON, nu pagina HTML generică a Express-ului. */
app.use((req, res) => res.status(404).json({ error: "rută inexistentă" }));
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON invalid" });
  if (err && err.type === "entity.too.large") return res.status(413).json({ error: "corp prea mare" });
  console.error("[alpebo-hub]", (err && err.message) || err);
  res.status((err && err.status) || 500).json({ error: "eroare internă" });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  (ready = initDb())
    .then(() => app.listen(PORT, () => console.log(`[alpebo-hub] http://localhost:${PORT} (db: ${hasDb})`)))
    .catch((e) => {
      console.error("[alpebo-hub] init eșuat:", e.message);
      process.exit(1);
    });
}

module.exports = app;
