# Alpebocom

Site-ul [alpebocom.ro](https://alpebocom.ro) — ALPEBOCOM SRL, firmă de construcții
(proiectare, execuție, consultanță: industrial, rezidențial, infrastructură) —
plus **Alpebo Hub** (`hub/`): CMS, cereri de ofertă (leads) și blog.

Arhitectura urmează proiectul Roots Villas: React + Vite pre-randat la build,
funcții serverless Vercel în `api/`, hub separat Express + Postgres.
Detaliile complete sunt în [CLAUDE.md](CLAUDE.md).

## Comenzi

```bash
npm install
npm run dev        # dev server Vite (servește și /api/* local)
npm run build      # build + pre-randare
npm run ssr:check  # verifică dacă aplicația randează curat în Node
```

Hub-ul se rulează separat: `cd hub && npm install && npm run dev`.
