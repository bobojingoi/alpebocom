import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Plugin de dev: servește orice /api/<name> local (în `npm run dev`),
 * folosind exact aceleași funcții ca pe Vercel (api/<name>.js).
 * Astfel formularul de ofertă merge și local, fără `vercel dev`.
 */
function apiDev(env) {
  return {
    name: "api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        try {
          for (const k of ["HUB_URL", "LEADS_SYNC_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_TO"]) {
            if (env[k]) process.env[k] = env[k];
          }
          const parsed = new URL(req.url, "http://localhost");
          const name = parsed.pathname.replace(/^\/api\//, "").split("/")[0];
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          const handler = mod.default;
          if (!handler) return next();

          const query = Object.fromEntries(parsed.searchParams.entries());
          let body;
          if (req.method === "POST" || req.method === "PUT") {
            body = await new Promise((resolve) => {
              let data = "";
              req.on("data", (c) => (data += c));
              req.on("end", () => {
                try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
              });
            });
          }

          const resShim = {
            statusCode: 200,
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) { this.statusCode = code; return this; },
            json(obj) {
              res.statusCode = this.statusCode;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(obj));
            },
          };
          await handler({ query, method: req.method, body }, resShim);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: String((e && e.message) || e) }));
        }
      });
    },
  };
}

/*
 * Conținutul din Alpebo Hub, adus la BUILD (modelul SEO-7 de la Roots).
 * Fără el, useHubContent() aduce conținutul abia în browser, după montare —
 * deci HTML-ul pre-randat ar rămâne pe DEFAULT_CONTENT. Aici îl cerem o dată,
 * la build, și îl expunem ca module virtuale, disponibile sincron.
 *
 * Hub-ul picat NU pică build-ul: snapshot gol → DEFAULT_CONTENT.
 */
const HUB_SNAPSHOT_ID = "virtual:hub-snapshot";
const HUB_POSTS_ID = "virtual:hub-posts";

function hubContentSnapshot(env) {
  const hubUrl = env.HUB_URL || "https://alpebocom-hub.vercel.app";
  const enabled = env.HUB_SNAPSHOT !== "0";
  let cache;
  let postsCache;

  const fetchSnapshot = async () => {
    if (!enabled) return {};
    try {
      const r = await fetch(hubUrl + "/api/v1/site-content", { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const content = (j && j.content) || {};
      const n = Object.keys(content).length;
      if (!n) throw new Error("conținut gol");
      console.log(`[hub-snapshot] ${n} secțiuni aduse de la ${hubUrl}`);
      return content;
    } catch (e) {
      console.warn(`[hub-snapshot] Hub indisponibil (${String((e && e.message) || e)}) — se folosește DEFAULT_CONTENT`);
      return {};
    }
  };

  const fetchPosts = async () => {
    if (!enabled) return [];
    const cerere = async (cale) => {
      const r = await fetch(hubUrl + cale, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    };
    try {
      const lista = (await cerere("/api/v1/posts")).posts || [];
      /* pentru fiecare articol aducem și corpul — altfel pagina articolului
         n-ar avea ce randa la build */
      const complete = await Promise.all(
        lista
          .filter((p) => p && p.slug)
          .map(async (p) => {
            try {
              const j = await cerere("/api/v1/posts/" + encodeURIComponent(p.slug));
              return j.post || p;
            } catch {
              return p;
            }
          })
      );
      console.log(`[hub-snapshot] ${complete.length} articole de blog aduse`);
      return complete;
    } catch (e) {
      console.warn(`[hub-snapshot] articolele nu au putut fi aduse (${String((e && e.message) || e)}) — blogul rămâne pe fetch la runtime`);
      return [];
    }
  };

  return {
    name: "hub-content-snapshot",
    resolveId(id) {
      if (id === HUB_SNAPSHOT_ID) return "\0" + HUB_SNAPSHOT_ID;
      if (id === HUB_POSTS_ID) return "\0" + HUB_POSTS_ID;
    },
    async load(id) {
      if (id === "\0" + HUB_SNAPSHOT_ID) {
        cache = cache || fetchSnapshot();
        return `export default ${JSON.stringify(await cache)};`;
      }
      if (id === "\0" + HUB_POSTS_ID) {
        postsCache = postsCache || fetchPosts();
        return `export default ${JSON.stringify(await postsCache)};`;
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), apiDev(env), hubContentSnapshot(env)],
  };
});
