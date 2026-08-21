/* „Cere ofertă de preț" — primește formularul de pe site și îl duce mai
   departe: în Alpebo Hub (CRM) și pe email (notificare).
   Fără nicio integrare configurată rulează dry-run: loghează și confirmă,
   ca formularul să fie testabil înainte să existe Hub + chei. */
import { sendEmail } from "./_email.js";

const curat = (v, max) => String(v || "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  const b = req.body || {};

  /* honeypot: boții completează câmpul invizibil — răspundem identic cu
     succesul, fără niciun efect, ca să nu-i învățăm ce a mers */
  if (b.website) return res.status(200).json({ ok: true });

  const lead = {
    name: curat(b.name, 200),
    phone: curat(b.phone, 40),
    email: curat(b.email, 200),
    company: curat(b.company, 200),
    message: curat(b.message, 5000),
    page: curat(b.page, 300),
    source: "site",
  };
  if (!lead.name || !lead.phone || !lead.message) {
    return res.status(400).json({ ok: false, error: "missing_fields" });
  }

  const hubUrl = process.env.HUB_URL;
  const secret = process.env.LEADS_SYNC_SECRET;
  const hubConfigurat = Boolean(hubUrl && secret);
  const emailConfigurat = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_TO);

  const rezultat = { hub: false, email: false };

  if (hubConfigurat) {
    try {
      const r = await fetch(hubUrl.replace(/\/$/, "") + "/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sync-Secret": secret },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(10000),
      });
      rezultat.hub = r.ok;
      if (!r.ok) console.error("[lead] hub a răspuns HTTP " + r.status);
    } catch (e) {
      console.error("[lead] hub indisponibil: " + String((e && e.message) || e));
    }
  }

  if (emailConfigurat) {
    try {
      const rows = [
        ["Nume", lead.name],
        ["Telefon", lead.phone],
        ["Email", lead.email || "—"],
        ["Companie", lead.company || "—"],
        ["Pagina", lead.page || "—"],
      ];
      await sendEmail({
        subject: `Cerere de ofertă — ${lead.name}`,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${lead.message}`,
        html:
          `<h2>Cerere de ofertă de pe alpebocom.ro</h2><table>` +
          rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join("") +
          `</table><p style="white-space:pre-wrap">${lead.message}</p>`,
      });
      rezultat.email = true;
    } catch (e) {
      console.error("[lead] email eșuat: " + String((e && e.message) || e));
    }
  }

  if (!hubConfigurat && !emailConfigurat) {
    console.log("[lead][dry-run] " + JSON.stringify(lead));
    return res.status(200).json({ ok: true, dryRun: true });
  }

  /* integrarea există dar TOT ce era configurat a eșuat → nu mințim clientul
     că cererea a ajuns undeva */
  if (!rezultat.hub && !rezultat.email) {
    return res.status(502).json({ ok: false, error: "delivery_failed" });
  }

  return res.status(200).json({ ok: true, stored: rezultat });
}
