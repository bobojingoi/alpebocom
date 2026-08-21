/* Trimitere email prin Resend. Fără RESEND_API_KEY sau EMAIL_TO, întoarce
   { skipped: true } — apelantul decide dacă asta e o problemă.
   Notă (modelul Roots): site-ul și hub-ul sunt deploy-uri separate și nu pot
   importa cod unul de la altul — dacă hub-ul va trimite emailuri, logica se
   duplică acolo și se ține sincronă manual. */
export async function sendEmail({ subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Alpebocom <onboarding@resend.dev>";
  const to = (process.env.EMAIL_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !to.length) return { skipped: true };

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!r.ok) {
    const detaliu = await r.text().catch(() => "");
    throw new Error(`Resend HTTP ${r.status}: ${detaliu.slice(0, 300)}`);
  }
  const j = await r.json();
  return { id: j.id };
}
