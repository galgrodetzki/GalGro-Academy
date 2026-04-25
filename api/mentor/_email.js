// Mentor-E3: Resend-backed email fallback. Fires when the keeper either has
// no push subscription armed, OR has one but every dispatch failed (dedup
// rule c). Short-circuits to a no-op if RESEND_API_KEY is missing, so the
// generator still runs cleanly in environments without email configured.
//
// Env:
//   RESEND_API_KEY      — server-only secret, never VITE_.
//   MENTOR_EMAIL_FROM   — "Mentor <mentor@galgro.com>" once DNS verifies.
//                         Falls back to Resend's dev sender otherwise.

const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? "").trim();
const MENTOR_EMAIL_FROM = (process.env.MENTOR_EMAIL_FROM ?? "Mentor <onboarding@resend.dev>").trim();
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? "https://gal-gro-academy.vercel.app").trim();

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY);
}

export function getEmailFromAddress() {
  return MENTOR_EMAIL_FROM;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ title, body, url }) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const link = url || SITE_URL;
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0b0f17;color:#e8ecf5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#121826;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#00e87a;margin-bottom:8px">Mentor note</div>
    <h1 style="font-size:20px;line-height:1.3;margin:0 0 12px;color:#fff">${safeTitle}</h1>
    <p style="font-size:14px;line-height:1.55;color:rgba(232,236,245,0.78);margin:0 0 20px">${safeBody}</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#00e87a;color:#000;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px">Open GalGro's Academy</a>
  </div>
  <div style="max-width:560px;margin:16px auto 0;text-align:center;font-size:11px;color:rgba(232,236,245,0.35)">
    You're getting this because Mentor couldn't reach you via push. Turn on push in Settings to get notes instantly.
  </div>
</body></html>`;
}

function buildText({ title, body, url }) {
  const link = url || SITE_URL;
  return `${title}\n\n${body}\n\nOpen: ${link}\n\n—\nYou're getting this because Mentor couldn't reach you via push. Turn on push in Settings to get notes instantly.`;
}

// Returns { ok, id?, error? }. Never throws — the generator treats email as
// best-effort and logs failures without halting the run.
export async function sendMentorEmail({ to, subject, title, body, url }) {
  if (!isEmailConfigured()) return { ok: false, error: "email_not_configured" };
  if (!to) return { ok: false, error: "missing_recipient" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: MENTOR_EMAIL_FROM,
        to: [to],
        subject: subject || title || "Mentor note",
        html: buildHtml({ title, body, url }),
        text: buildText({ title, body, url }),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, statusCode: res.status, error: errBody.slice(0, 500) || `http_${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err?.message || "email_failed" };
  }
}
