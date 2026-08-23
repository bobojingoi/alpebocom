/* TEMPORAR (import portofoliu): proxy către WordPress-ul vechi, pentru că
   hostingul lui a blocat IP-ul mașinii de lucru. Limitat STRICT la
   https://alpebocom.ro și protejat de LEADS_SYNC_SECRET — nu e proxy deschis.
   De ȘTERS după terminarea importului. */
export default async function handler(req, res) {
  const secret = process.env.LEADS_SYNC_SECRET;
  if (!secret || req.query.s !== secret) {
    return res.status(401).json({ error: "neautorizat" });
  }
  let url;
  try {
    url = new URL(String(req.query.url || ""));
  } catch {
    return res.status(400).json({ error: "url invalid" });
  }
  if (url.hostname !== "alpebocom.ro" && url.hostname !== "www.alpebocom.ro") {
    return res.status(400).json({ error: "doar alpebocom.ro" });
  }
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) alpebocom-migrare/1.0",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(25000),
      redirect: "follow",
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    return res.send(buf);
  } catch (e) {
    return res.status(502).json({ error: String((e && e.message) || e) });
  }
}
